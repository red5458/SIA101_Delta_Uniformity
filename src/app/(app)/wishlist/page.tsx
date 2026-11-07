import Link from "next/link";
import { BookmarkX } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getWishlistListings } from "@/lib/data/comments";

export const metadata = { title: "Wishlist | Uniformity" };

export default async function WishlistPage() {
  await requireVerifiedUser();
  const rows = await getWishlistListings();
  const items = rows.filter((row) => row.listing);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">Your wishlist</h1>
      <p className="mt-1 text-sm text-muted">
        Saved items stay here so you can come back before the next campus day. No cart,
        no checkout — just message the seller when you are ready.
      </p>

      {items.length === 0 ? (
        <div className="card mt-5 grid place-items-center px-4 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <BookmarkX className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-xl font-bold text-ink">
            No saved items yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Tap the bookmark on any listing to keep it here for later.
          </p>
          <Link href="/browse" className="btn-primary mt-4">
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((row) => (
            <ListingCard
              key={row.wishlist_id}
              listing={row.listing!}
              wishlisted
            />
          ))}
        </div>
      )}
    </div>
  );
}
