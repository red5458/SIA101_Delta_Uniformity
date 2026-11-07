import type { PoolClient } from "pg";
import { query, withTransaction } from "../../config/db";
import type {
  Category,
  FeedFilters,
  Listing,
  ListingPhoto,
  SellerSummary,
} from "../../types";
import { badRequest, forbidden, notFound } from "../../utils/ApiError";
import { destroyStoredAssets } from "./media.service";
import type { ListingInput, ListingUpdateInput } from "./listings.schema";

export const PAGE_SIZE = 12;

type PhotoInput = { url: string; key: string };

interface RawListing extends Omit<Listing, "created_at" | "updated_at" | "photos"> {
  created_at: Date | string;
  updated_at: Date | string;
  photos: ListingPhoto[] | null;
}

const LISTING_SELECT = `
  SELECT
    l.listing_id,
    l.seller_id,
    l.category_id,
    l.title,
    l.item_type,
    l.description,
    l.price::float8 AS price,
    l.condition,
    l.size,
    l.measurements,
    l.department,
    l.status,
    l.created_at,
    l.updated_at,
    json_build_object('name', c.name, 'slug', c.slug) AS category,
    COALESCE(p.photos, '[]'::json) AS photos,
    json_build_object(
      'user_id', u.user_id,
      'name', u.name,
      'program', u.program,
      'year_level', u.year_level,
      'department', u.department,
      'contact_email', u.contact_email,
      'contact_mobile', u.contact_mobile,
      'contact_messenger', u.contact_messenger,
      'is_verified', u.is_verified
    ) AS seller
  FROM listings l
  JOIN categories c ON c.category_id = l.category_id
  JOIN users u ON u.user_id = l.seller_id
  LEFT JOIN LATERAL (
    SELECT json_agg(
             json_build_object(
               'photo_id', lp.photo_id,
               'listing_id', lp.listing_id,
               'image_url', lp.image_url,
               'cloudinary_id', lp.cloudinary_id,
               'position', lp.position
             )
             ORDER BY lp.position
           ) AS photos
      FROM listing_photos lp
     WHERE lp.listing_id = l.listing_id
  ) p ON TRUE
`;

export function mapListing(row: RawListing): Listing {
  return {
    ...row,
    price: Number(row.price),
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    photos: row.photos ?? [],
  };
}

export async function getCategories(): Promise<Category[]> {
  const { rows } = await query<Category>(
    `SELECT category_id, name, slug, description, display_order
       FROM categories
      ORDER BY display_order ASC`,
  );
  return rows;
}

function buildFilters(filters: FeedFilters) {
  const conditions: string[] = ["l.status = 'Active'", "u.is_suspended = false"];
  const params: unknown[] = [];

  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.department) conditions.push(`l.department = ${param(filters.department)}`);
  if (filters.category) conditions.push(`l.category_id = ${param(filters.category)}`);
  if (filters.itemType) conditions.push(`l.item_type = ${param(filters.itemType)}`);
  if (filters.size) conditions.push(`l.size = ${param(filters.size)}`);
  if (filters.condition) conditions.push(`l.condition = ${param(filters.condition)}`);
  if (typeof filters.minPrice === "number")
    conditions.push(`l.price >= ${param(filters.minPrice)}`);
  if (typeof filters.maxPrice === "number")
    conditions.push(`l.price <= ${param(filters.maxPrice)}`);
  if (filters.q) conditions.push(`l.title ILIKE ${param(`%${filters.q}%`)}`);

  return { where: conditions.join(" AND "), params };
}

export async function getFeed(filters: FeedFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const offset = (page - 1) * PAGE_SIZE;
  const { where, params } = buildFilters(filters);

  const orderBy =
    filters.sort === "price_asc"
      ? "l.price ASC, l.created_at DESC"
      : filters.sort === "price_desc"
        ? "l.price DESC, l.created_at DESC"
        : "l.created_at DESC";

  const listParams = [...params, PAGE_SIZE, offset];
  const limitPlaceholder = `$${listParams.length - 1}`;
  const offsetPlaceholder = `$${listParams.length}`;

  const [listResult, countResult] = await Promise.all([
    query<RawListing>(
      `${LISTING_SELECT}
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      listParams,
    ),
    query<{ total: number }>(
      `SELECT count(*)::int AS total
         FROM listings l
         JOIN users u ON u.user_id = l.seller_id
        WHERE ${where}`,
      params,
    ),
  ]);

  const total = countResult.rows[0]?.total ?? 0;

  return {
    listings: listResult.rows.map(mapListing),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getListingById(
  listingId: string,
  viewer?: { userId: string; isAdmin: boolean },
): Promise<Listing | null> {
  const { rows } = await query<RawListing>(
    `${LISTING_SELECT}
      WHERE l.listing_id = $1
        AND (u.is_suspended = false OR l.seller_id = $2 OR $3::boolean)`,
    [listingId, viewer?.userId ?? null, viewer?.isAdmin ?? false],
  );

  const row = rows[0];
  return row ? mapListing(row) : null;
}

export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];
  const { rows } = await query<RawListing>(
    `${LISTING_SELECT} WHERE l.listing_id = ANY($1::uuid[])`,
    [ids],
  );
  return rows.map(mapListing);
}

export async function getSellerListings(sellerId: string): Promise<Listing[]> {
  const { rows } = await query<RawListing>(
    `${LISTING_SELECT}
      WHERE l.seller_id = $1
      ORDER BY l.created_at DESC`,
    [sellerId],
  );
  return rows.map(mapListing);
}

export async function getWishlistIds(
  userId: string,
  listingIds?: string[],
): Promise<Set<string>> {
  const { rows } = listingIds?.length
    ? await query<{ listing_id: string }>(
        `SELECT listing_id FROM wishlists WHERE user_id = $1 AND listing_id = ANY($2::uuid[])`,
        [userId, listingIds],
      )
    : await query<{ listing_id: string }>(
        `SELECT listing_id FROM wishlists WHERE user_id = $1`,
        [userId],
      );

  return new Set(rows.map((row) => row.listing_id));
}

function assertPhotoOwnership(
  userId: string,
  photos: PhotoInput[],
  allowedLocalKeys: Set<string> = new Set(),
) {
  const prefix = `uniformity/${userId}/`;
  const localPrefix = `local:${userId}/`;
  for (const photo of photos) {
    if (photo.key.startsWith(prefix)) continue;
    // Local driver (development) keys are scoped to the uploader's folder.
    if (photo.key.startsWith(localPrefix)) continue;
    // Photos already attached to this listing (e.g. the legacy import) stay
    // valid when the seller edits other fields.
    if (photo.key.startsWith("local:") && allowedLocalKeys.has(photo.key)) {
      continue;
    }
    throw forbidden(
      "Photos must be uploaded to your own account.",
      "PHOTO_FOLDER",
    );
  }
}

async function assertCategory(client: PoolClient, categoryId: string) {
  const { rowCount } = await client.query(
    `SELECT 1 FROM categories WHERE category_id = $1`,
    [categoryId],
  );
  if (!rowCount) throw badRequest("Choose a valid category.", "CATEGORY_INVALID");
}

async function insertPhotos(
  client: PoolClient,
  listingId: string,
  photos: PhotoInput[],
) {
  for (const [index, photo] of photos.entries()) {
    await client.query(
      `INSERT INTO listing_photos (listing_id, image_url, cloudinary_id, position)
       VALUES ($1, $2, $3, $4)`,
      [listingId, photo.url, photo.key, index],
    );
  }
}

export async function createListing(userId: string, input: ListingInput) {
  assertPhotoOwnership(userId, input.photos);

  return withTransaction(async (client) => {
    await assertCategory(client, input.categoryId);

    const { rows } = await client.query<{ listing_id: string }>(
      `INSERT INTO listings
         (seller_id, category_id, title, item_type, description, price,
          condition, size, measurements, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING listing_id`,
      [
        userId,
        input.categoryId,
        input.title,
        input.itemType,
        input.description,
        input.price,
        input.condition,
        input.size,
        input.measurements || null,
        input.department,
      ],
    );

    const listingId = rows[0]!.listing_id;
    await insertPhotos(client, listingId, input.photos);
    return { listingId };
  });
}

export async function updateListing(
  listingId: string,
  user: { userId: string; isAdmin: boolean },
  input: ListingUpdateInput,
) {
  const existing = await getListingById(listingId, user);
  if (!existing) throw notFound("Listing not found");

  if (existing.seller_id !== user.userId && !user.isAdmin) {
    throw forbidden("You can only edit your own listings.", "NOT_OWNER");
  }

  if (input.photos) {
    const allowedLocalKeys = new Set(
      existing.photos
        .map((photo) => photo.cloudinary_id)
        .filter((key) => key.startsWith("local:")),
    );
    assertPhotoOwnership(existing.seller_id, input.photos, allowedLocalKeys);
  }

  const removedKeys = input.photos
    ? existing.photos
        .map((photo) => photo.cloudinary_id)
        .filter((key) => !input.photos!.some((photo) => photo.key === key))
    : [];

  const columns: Record<string, unknown> = {};
  if (input.title !== undefined) columns.title = input.title;
  if (input.description !== undefined) columns.description = input.description;
  if (input.price !== undefined) columns.price = input.price;
  if (input.itemType !== undefined) columns.item_type = input.itemType;
  if (input.categoryId !== undefined) columns.category_id = input.categoryId;
  if (input.condition !== undefined) columns.condition = input.condition;
  if (input.size !== undefined) columns.size = input.size;
  if (input.measurements !== undefined)
    columns.measurements = input.measurements || null;
  if (input.department !== undefined) columns.department = input.department;
  if (input.status !== undefined) columns.status = input.status;

  await withTransaction(async (client) => {
    if (columns.category_id) {
      await assertCategory(client, String(columns.category_id));
    }

    const entries = Object.entries(columns);
    if (entries.length > 0) {
      const sets = entries.map(([column], index) => `${column} = $${index + 2}`);
      await client.query(
        `UPDATE listings SET ${sets.join(", ")} WHERE listing_id = $1`,
        [listingId, ...entries.map(([, value]) => value)],
      );
    }

    if (input.photos) {
      await client.query(`DELETE FROM listing_photos WHERE listing_id = $1`, [
        listingId,
      ]);
      await insertPhotos(client, listingId, input.photos);
    }
  });

  if (removedKeys.length > 0) {
    await destroyStoredAssets(removedKeys);
  }

  return { updated: true };
}

export async function deleteListing(
  listingId: string,
  user: { userId: string; isAdmin: boolean },
) {
  const existing = await getListingById(listingId, user);
  if (!existing) throw notFound("Listing not found");

  if (existing.seller_id !== user.userId && !user.isAdmin) {
    throw forbidden("You can only delete your own listings.", "NOT_OWNER");
  }

  await query(`DELETE FROM listings WHERE listing_id = $1`, [listingId]);
  await destroyStoredAssets(
    existing.photos.map((photo) => photo.cloudinary_id),
  );

  return { deleted: true };
}

export type { SellerSummary };
