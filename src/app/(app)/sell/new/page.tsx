import { ListingForm } from "@/components/listings/listing-form";
import { requireVerifiedUser } from "@/lib/auth/session";
import { getCategories } from "@/lib/data/listings";

export const metadata = { title: "Sell an item | Uniformity" };

export default async function NewListingPage() {
  await requireVerifiedUser();
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-ink">Sell an item</h1>
      <p className="mt-1 text-sm text-muted">
        Photos, honest condition notes, and measurements help buyers decide. Meet on
        campus and collect cash — Uniformity does not process payments.
      </p>
      <div className="mt-5">
        <ListingForm categories={categories} />
      </div>
    </div>
  );
}
