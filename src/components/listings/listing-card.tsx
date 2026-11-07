import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import type { Listing } from "@/types/db";
import { formatPrice, formatRelative, initials } from "@/lib/utils";
import { WishlistButton } from "@/components/listings/wishlist-button";

export function ListingCard({
  listing,
  wishlisted = false,
}: {
  listing: Listing;
  wishlisted?: boolean;
}) {
  const photo = [...(listing.photos ?? [])].sort(
    (a, b) => a.position - b.position,
  )[0];

  return (
    <article className="card overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-50">
        <Link href={`/listings/${listing.listing_id}`} className="block h-full">
          {photo ? (
            <Image
              src={photo.image_url}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted">
              No photo
            </div>
          )}
        </Link>

        <div className="absolute left-2.5 right-12 top-2.5 flex flex-wrap gap-1.5">
          <span className="badge border-white/40 bg-white/90 text-[11px] text-ink">
            {listing.condition}
          </span>
          {listing.size !== "N/A" && (
            <span className="badge border-white/40 bg-brand-700/90 text-[11px] text-white">
              Size {listing.size}
            </span>
          )}
        </div>

        <div className="absolute right-2.5 top-2.5">
          <WishlistButton
            listingId={listing.listing_id}
            initial={wishlisted}
            compact
          />
        </div>

        {listing.status === "Sold" && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-1.5 text-center text-xs font-bold uppercase tracking-widest text-white">
            Sold
          </span>
        )}
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/listings/${listing.listing_id}`}
            className="line-clamp-2 text-sm font-semibold leading-snug text-ink hover:text-brand-700"
          >
            {listing.title}
          </Link>
          <span className="shrink-0 text-base font-bold text-brand-800">
            {formatPrice(listing.price)}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5" />
          <span>{listing.department}</span>
          <span aria-hidden>·</span>
          <span className="sm:hidden">
            {formatRelative(listing.created_at).replace(/ ago$/, "")}
          </span>
          <span className="hidden sm:inline">{formatRelative(listing.created_at)}</span>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5 text-xs text-muted">
          <span className="relative grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-[8px] font-bold text-brand-800">
            {listing.seller?.avatar_url ? (
              <Image
                src={listing.seller.avatar_url}
                alt=""
                fill
                sizes="20px"
                className="object-cover"
              />
            ) : (
              initials(listing.seller?.name ?? "Student")
            )}
          </span>
          <span className="truncate">
            {listing.seller?.name ?? "Verified student"}
            {listing.seller?.program ? ` · ${listing.seller.program}` : ""}
          </span>
        </div>
      </div>
    </article>
  );
}
