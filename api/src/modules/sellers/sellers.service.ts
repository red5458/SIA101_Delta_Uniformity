import { query } from "../../config/db";
import type { Listing, SellerSummary } from "../../types";
import { getSellerListings } from "../listings/listings.service";

interface SellerRow extends SellerSummary {
  created_at: Date | string;
}

export interface SellerPage {
  seller: SellerSummary & { created_at: string };
  listings: Listing[];
  stats: { active: number; sold: number };
}

/**
 * Public seller storefront: the same card shown on a listing detail page plus
 * everything that student has posted. Suspended accounts are hidden, matching
 * the feed and detail rules.
 */
export async function getSellerPage(userId: string): Promise<SellerPage | null> {
  const { rows } = await query<SellerRow>(
    `SELECT user_id,
            name,
            program,
            year_level,
            department,
            contact_email,
            contact_mobile,
            contact_messenger,
            avatar_url,
            is_verified,
            created_at
       FROM users
      WHERE user_id = $1
        AND is_suspended = false`,
    [userId],
  );

  const seller = rows[0];
  if (!seller) return null;

  const listings = await getSellerListings(userId);

  return {
    seller: {
      ...seller,
      created_at: new Date(seller.created_at).toISOString(),
    },
    listings,
    stats: {
      active: listings.filter((listing) => listing.status === "Active").length,
      sold: listings.filter((listing) => listing.status === "Sold").length,
    },
  };
}
