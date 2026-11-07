import Link from "next/link";
import Image from "next/image";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { requireAdmin } from "@/lib/auth/session";
import { listAdminListings } from "@/lib/data/admin";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "Moderate listings | Uniformity" };

export default async function AdminListingsPage() {
  await requireAdmin();
  const listings = await listAdminListings();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Listing moderation</h1>
      <p className="mt-1 text-sm text-muted">
        {listings.length} listing{listings.length === 1 ? "" : "s"} across the
        marketplace. Deleting also removes the cloud photos.
      </p>

      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-brand-50/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Item</th>
                <th className="px-3 py-2.5 font-semibold">Seller</th>
                <th className="px-3 py-2.5 font-semibold">Price</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Posted</th>
                <th className="px-3 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted">
                    No listings yet.
                  </td>
                </tr>
              ) : (
                listings.map((listing) => {
                  const photo = listing.photos?.[0];
                  return (
                    <tr key={listing.listing_id} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                            {photo ? (
                              <Image
                                src={photo.image_url}
                                alt=""
                                width={40}
                                height={40}
                                sizes="40px"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/listings/${listing.listing_id}`}
                              className="block max-w-[220px] truncate font-medium text-ink hover:text-brand-700"
                            >
                              {listing.title}
                            </Link>
                            <p className="text-xs text-muted">{listing.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-ink">{listing.seller?.name ?? "—"}</p>
                        <p className="max-w-[180px] truncate text-xs text-muted">
                          {listing.seller?.email ?? ""}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-brand-800">
                        {formatPrice(listing.price)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={
                            listing.status === "Active"
                              ? "badge border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "badge border-line bg-brand-50 text-brand-700"
                          }
                        >
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted">
                        {formatDate(listing.created_at)}
                      </td>
                      <td className="px-3 py-2.5">
                        <AdminDeleteButton
                          endpoint={`/api/admin/listings/${listing.listing_id}`}
                          confirmText={`Delete "${listing.title}" and its photos?`}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
