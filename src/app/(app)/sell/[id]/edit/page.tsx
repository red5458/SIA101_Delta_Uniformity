import { notFound, redirect } from "next/navigation";
import { ListingForm } from "@/components/listings/listing-form";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getCategories, getListingById } from "@/lib/data/listings";

export const metadata = { title: "Edit listing | Uniformity" };

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireVerifiedUser();

  const [listing, categories] = await Promise.all([
    getListingById(id),
    getCategories(),
  ]);

  if (!listing) notFound();
  if (listing.seller_id !== session.authUser.id) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-ink">Edit listing</h1>
      <p className="mt-1 text-sm text-muted">
        Update details or swap photos. Removing a photo also removes it from cloud
        storage after saving.
      </p>
      <div className="mt-5">
        <ListingForm categories={categories} initial={listing} />
      </div>
    </div>
  );
}
