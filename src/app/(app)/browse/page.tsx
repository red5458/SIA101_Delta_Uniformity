import Link from "next/link";
import { PackageOpen, PlusCircle, SearchX } from "lucide-react";
import { FiltersBar } from "@/components/listings/filters-bar";
import { ListingCard } from "@/components/listings/listing-card";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getCategories, getFeed, getWishlistIds } from "@/lib/data/listings";
import type {
  Department,
  FeedFilters,
  ItemType,
  ListingCondition,
  ListingSize,
} from "@/types/db";

export const metadata = { title: "Browse | Uniformity" };

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberOrUndefined(value: string | undefined) {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function pageHref(params: SearchParams, page: number) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const item = single(value);
    if (item && key !== "page") query.set(key, item);
  });
  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `/browse?${queryString}` : "/browse";
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  await requireVerifiedUser();

  const filters: FeedFilters = {
    department: (single(params.department) as Department) || undefined,
    category: single(params.category),
    itemType: (single(params.item_type) as ItemType) || undefined,
    size: (single(params.size) as ListingSize) || undefined,
    condition: (single(params.condition) as ListingCondition) || undefined,
    minPrice: numberOrUndefined(single(params.min_price)),
    maxPrice: numberOrUndefined(single(params.max_price)),
    sort: (single(params.sort) as FeedFilters["sort"]) || "newest",
    q: single(params.q),
    page: numberOrUndefined(single(params.page)) ?? 1,
  };

  const [categories, feed, wishlist] = await Promise.all([
    getCategories(),
    getFeed(filters),
    getWishlistIds(),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Campus finds</h1>
          <p className="mt-1 text-sm text-muted">
            {feed.total} active listing{feed.total === 1 ? "" : "s"} · meet on campus,
            pay in cash
          </p>
        </div>
        <Link href="/sell/new" className="btn-primary">
          <PlusCircle className="h-4 w-4" />
          Sell an item
        </Link>
      </div>

      <FiltersBar
        categories={categories}
        current={{
          q: single(params.q),
          department: single(params.department),
          category: single(params.category),
          item_type: single(params.item_type),
          size: single(params.size),
          condition: single(params.condition),
          sort: single(params.sort),
          min_price: single(params.min_price),
          max_price: single(params.max_price),
        }}
      />

      {feed.listings.length === 0 ? (
        <div className="card grid place-items-center px-4 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            {filters.q ? (
              <SearchX className="h-6 w-6" />
            ) : (
              <PackageOpen className="h-6 w-6" />
            )}
          </span>
          <h2 className="mt-3 font-display text-xl font-bold text-ink">
            Nothing matches yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Try clearing a filter or searching a broader term. New listings appear as
            students post them.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/browse" className="btn-secondary">
              Clear filters
            </Link>
            <Link href="/sell/new" className="btn-primary">
              Post the first one
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {feed.listings.map((listing) => (
            <ListingCard
              key={listing.listing_id}
              listing={listing}
              wishlisted={wishlist.has(listing.listing_id)}
            />
          ))}
        </div>
      )}

      {feed.pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
          {feed.page > 1 && (
            <Link href={pageHref(params, feed.page - 1)} className="btn-secondary">
              Previous
            </Link>
          )}
          <span className="px-2 text-sm text-muted">
            Page {feed.page} of {feed.pageCount}
          </span>
          {feed.page < feed.pageCount && (
            <Link href={pageHref(params, feed.page + 1)} className="btn-secondary">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
