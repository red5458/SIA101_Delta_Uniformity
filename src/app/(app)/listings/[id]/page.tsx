import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Pencil,
  Ruler,
  Shirt,
} from "lucide-react";
import { CommentThread } from "@/components/comments/comment-thread";
import { PhotoCarousel } from "@/components/listings/photo-carousel";
import { WishlistButton } from "@/components/listings/wishlist-button";
import { SellerCard } from "@/components/sellers/seller-card";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getComments, isWishlisted } from "@/lib/data/comments";
import { getListingById } from "@/lib/data/listings";
import { DEPARTMENT_LABELS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireVerifiedUser();

  const [listing, comments, saved] = await Promise.all([
    getListingById(id),
    getComments(id),
    isWishlisted(id),
  ]);
  if (!listing) notFound();

  const isOwner = listing.seller_id === session.authUser.id;
  const photos = [...(listing.photos ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div>
      <Link href="/browse" className="btn-ghost mb-3 -ml-2 text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to browse
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <PhotoCarousel photos={photos} title={listing.title} />
        </div>

        <div className="space-y-4">
          <div className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="badge border-brand-200 bg-brand-50 text-brand-800">
                {listing.item_type}
              </span>
              <span className="badge border-line bg-white text-ink">
                {listing.condition}
              </span>
              {listing.size !== "N/A" && (
                <span className="badge border-gold-200 bg-gold-50 text-brand-800">
                  Size {listing.size}
                </span>
              )}
              {listing.status === "Sold" && (
                <span className="badge border-ink bg-ink text-white">Sold</span>
              )}
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
              {listing.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {DEPARTMENT_LABELS[listing.department]}
              </span>
              <span aria-hidden>·</span>
              <span>{listing.category?.name ?? "Uncategorized"}</span>
              <span aria-hidden>·</span>
              <span>Listed {formatDate(listing.created_at)}</span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-y border-line py-3">
              <p className="text-2xl font-bold text-brand-800">
                {formatPrice(listing.price)}
              </p>
              {isOwner ? (
                <Link href={`/sell/${listing.listing_id}/edit`} className="btn-secondary text-sm">
                  <Pencil className="h-4 w-4" />
                  Edit listing
                </Link>
              ) : (
                <WishlistButton listingId={listing.listing_id} initial={saved} />
              )}
            </div>

            {listing.measurements && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50/60 px-3 py-2.5 text-sm">
                <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <div>
                  <p className="font-semibold text-ink">Measurements</p>
                  <p className="text-muted">{listing.measurements}</p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Shirt className="h-4 w-4 text-brand-600" />
                Description
              </h2>
              <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-muted">
                {listing.description}
              </p>
            </div>

            {isOwner && (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-gold-200 bg-gold-50 px-3 py-2 text-xs text-brand-900">
                <BadgeCheck className="h-4 w-4" />
                This is your listing. Buyers will see your verified seller card below.
              </p>
            )}
          </div>

          <SellerCard seller={listing.seller ?? null} />
        </div>
      </div>

      <div className="mt-5">
        <CommentThread
          listingId={listing.listing_id}
          sellerId={listing.seller_id}
          currentUserId={session.authUser.id}
          isAdmin={Boolean(session.profile.is_admin)}
          initialComments={comments}
        />
      </div>
    </div>
  );
}
