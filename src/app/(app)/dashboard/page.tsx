import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, PackageOpen, Pencil, PlusCircle, Store, Tag } from "lucide-react";
import { DeleteListingButton } from "@/components/listings/delete-listing-button";
import { StatusToggle } from "@/components/listings/status-toggle";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getSellerListings } from "@/lib/data/listings";
import { formatPrice, formatRelative } from "@/lib/utils";

export const metadata = { title: "My listings | Uniformity" };

export default async function DashboardPage() {
  await requireVerifiedUser();
  const listings = await getSellerListings();

  const active = listings.filter((listing) => listing.status === "Active").length;
  const sold = listings.filter((listing) => listing.status === "Sold").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">My listings</h1>
          <p className="mt-1 text-sm text-muted">
            Manage what you are passing forward. Toggle Sold when a meetup is done.
          </p>
        </div>
        <Link href="/sell/new" className="btn-primary">
          <PlusCircle className="h-4 w-4" />
          New listing
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="card p-3.5">
          <p className="text-xs font-medium text-muted">Total</p>
          <p className="mt-1 text-2xl font-bold text-ink">{listings.length}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs font-medium text-muted">Active</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{active}</p>
        </div>
        <div className="card p-3.5">
          <p className="text-xs font-medium text-muted">Sold</p>
          <p className="mt-1 text-2xl font-bold text-brand-700">{sold}</p>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="card mt-5 grid place-items-center px-4 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <PackageOpen className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-xl font-bold text-ink">
            You have not posted anything yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            List a uniform, department shirt, or course equipment you no longer need.
            Add photos and set a fair price.
          </p>
          <Link href="/sell/new" className="btn-primary mt-4">
            Create your first listing
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          {listings.map((listing) => {
            const photo = [...(listing.photos ?? [])].sort(
              (a, b) => a.position - b.position,
            )[0];

            return (
              <article
                key={listing.listing_id}
                className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
              >
                <Link
                  href={`/listings/${listing.listing_id}`}
                  className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:h-16 sm:w-16"
                >
                  {photo ? (
                    <Image
                      src={photo.image_url}
                      alt={listing.title}
                      width={64}
                      height={64}
                      sizes="64px"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-xs text-muted">
                      No photo
                    </span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      href={`/listings/${listing.listing_id}`}
                      className="truncate font-semibold text-ink hover:text-brand-700"
                    >
                      {listing.title}
                    </Link>
                    <span
                      className={
                        listing.status === "Active"
                          ? "badge border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "badge border-line bg-brand-50 text-brand-700"
                      }
                    >
                      {listing.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1 font-semibold text-brand-800">
                      <Tag className="h-3.5 w-3.5" />
                      {formatPrice(listing.price)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Store className="h-3.5 w-3.5" />
                      {listing.category?.name ?? "Uncategorized"}
                    </span>
                    <span>{formatRelative(listing.created_at)}</span>
                    {listing.seller?.is_verified && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified seller
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/sell/${listing.listing_id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-brand-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <StatusToggle
                    listingId={listing.listing_id}
                    status={listing.status}
                  />
                  <DeleteListingButton listingId={listing.listing_id} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
