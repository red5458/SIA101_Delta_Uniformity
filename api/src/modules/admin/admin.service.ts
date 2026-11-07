import { query } from "../../config/db";
import type { AdminStats, UserRow } from "../../types";
import { badRequest, notFound } from "../../utils/ApiError";
import { revokeAllSessions } from "../auth/auth.tokens";

export interface AdminListingRow {
  listing_id: string;
  title: string;
  price: number;
  status: string;
  department: string;
  created_at: string;
  seller: { name: string; email: string } | null;
  photos: { image_url: string; cloudinary_id: string }[];
}

export interface AdminUserRow {
  user_id: string;
  name: string;
  email: string;
  program: string | null;
  department: string | null;
  year_level: string | null;
  is_verified: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
}

export interface AdminCommentRow {
  comment_id: string;
  text: string;
  created_at: string;
  listing_id: string;
  author: { name: string } | null;
  listing: { title: string } | null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { rows } = await query<AdminStats>(
    `SELECT
       (SELECT count(*)::int FROM users) AS total_users,
       (SELECT count(*)::int FROM users WHERE is_verified) AS verified_users,
       (SELECT count(*)::int FROM listings WHERE status = 'Active') AS active_listings,
       (SELECT count(*)::int FROM listings WHERE status = 'Sold') AS sold_items,
       (SELECT count(*)::int FROM comments) AS total_comments`,
  );

  return rows[0]!;
}

export async function listAdminListings(): Promise<AdminListingRow[]> {
  const { rows } = await query<{
    listing_id: string;
    title: string;
    price: number;
    status: string;
    department: string;
    created_at: Date;
    seller_name: string;
    seller_email: string;
    photos: { image_url: string; cloudinary_id: string }[] | null;
  }>(
    `SELECT
       l.listing_id,
       l.title,
       l.price::float8 AS price,
       l.status,
       l.department,
       l.created_at,
       u.name AS seller_name,
       u.email AS seller_email,
       COALESCE(
         (SELECT json_agg(json_build_object(
                   'image_url', lp.image_url,
                   'cloudinary_id', lp.cloudinary_id
                 ) ORDER BY lp.position)
            FROM listing_photos lp
           WHERE lp.listing_id = l.listing_id),
         '[]'::json
       ) AS photos
     FROM listings l
     JOIN users u ON u.user_id = l.seller_id
     ORDER BY l.created_at DESC
     LIMIT 200`,
  );

  return rows.map((row) => ({
    listing_id: row.listing_id,
    title: row.title,
    price: Number(row.price),
    status: row.status,
    department: row.department,
    created_at: new Date(row.created_at).toISOString(),
    seller: { name: row.seller_name, email: row.seller_email },
    photos: row.photos ?? [],
  }));
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const { rows } = await query<AdminUserRow & { created_at: Date }>(
    `SELECT
       user_id, name, email, program, department, year_level,
       is_verified, is_admin, is_suspended, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT 200`,
  );

  return rows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at).toISOString(),
  }));
}

export async function listAdminComments(): Promise<AdminCommentRow[]> {
  const { rows } = await query<{
    comment_id: string;
    text: string;
    created_at: Date;
    listing_id: string;
    author_name: string | null;
    listing_title: string | null;
  }>(
    `SELECT
       c.comment_id,
       c.text,
       c.created_at,
       c.listing_id,
       u.name AS author_name,
       l.title AS listing_title
     FROM comments c
     LEFT JOIN users u ON u.user_id = c.user_id
     LEFT JOIN listings l ON l.listing_id = c.listing_id
     ORDER BY c.created_at DESC
     LIMIT 200`,
  );

  return rows.map((row) => ({
    comment_id: row.comment_id,
    text: row.text,
    created_at: new Date(row.created_at).toISOString(),
    listing_id: row.listing_id,
    author: row.author_name ? { name: row.author_name } : null,
    listing: row.listing_title ? { title: row.listing_title } : null,
  }));
}

export async function setUserSuspension(
  admin: UserRow,
  targetId: string,
  suspended: boolean,
) {
  if (admin.user_id === targetId) {
    throw badRequest("You cannot suspend your own admin account.", "SELF_SUSPEND");
  }

  const { rows } = await query<UserRow>(
    `UPDATE users SET is_suspended = $2 WHERE user_id = $1 RETURNING *`,
    [targetId, suspended],
  );

  const target = rows[0];
  if (!target) throw notFound("User not found");

  if (suspended) {
    await revokeAllSessions(target.user_id);
  }

  return { suspended: target.is_suspended };
}
