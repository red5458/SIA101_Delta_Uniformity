import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageOpen, Store } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import { SellerCard } from "@/components/sellers/seller-card";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getWishlistIds } from "@/lib/data/listings";
import { getSellerPage } from "@/lib/data/sellers";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getSellerPage(id);
  return {
    title: data ? `${data.seller.name} | Uniformity` : "Student | Uniformity",
  };
}

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireVerifiedUser();

  const [data, wishlist] = await Promise.all([
    getSellerPage(id),
    getWishlistIds(),
  ]);
  if (!data) notFound();

  const { seller, listings, stats } = data;

  return (
    <div>
      <Link
        href="/browse"
        className="btn-ghost mb-3 -ml-2 text-sm transition-transform active:scale-[0.97] active:bg-brand-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to browse
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(300px,360px)_1fr]">
        <div className="space-y-4">
          <SellerCard seller={seller} showProfileLink={false} />

          <section className="card p-4" aria-label="Storefront summary">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Store className="h-4 w-4 text-brand-600" />
              Storefront
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-brand-50 px-2 py-2.5">
                <p className="text-lg font-bold text-ink">{listings.length}</p>
                <p className="text-[11px] font-medium text-muted">Listings</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-2 py-2.5">
                <p className="text-lg font-bold text-emerald-600">{stats.active}</p>
                <p className="text-[11px] font-medium text-muted">Active</p>
              </div>
              <div className="rounded-xl bg-brand-50 px-2 py-2.5">
                <p className="text-lg font-bold text-brand-700">{stats.sold}</p>
                <p className="text-[11px] font-medium text-muted">Sold</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Member since {formatDate(seller.created_at)}
            </p>
          </section>
        </div>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                Listings by {seller.name}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {stats.active} active · {stats.sold} sold · cash meetup on campus
              </p>
            </div>
          </div>

          {listings.length === 0 ? (
            <div className="card mt-4 grid place-items-center px-4 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <PackageOpen className="h-6 w-6" />
              </span>
              <h2 className="mt-3 font-display text-xl font-bold text-ink">
                Nothing posted yet
              </h2>
              <p className="mt-1 max-w-sm text-sm text-muted">
                {seller.name} has not listed an item yet. Check back after the next
                campus day.
              </p>
              <Link href="/browse" className="btn-secondary mt-4">
                Browse other listings
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.listing_id}
                  listing={listing}
                  wishlisted={wishlist.has(listing.listing_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
