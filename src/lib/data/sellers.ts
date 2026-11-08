import "server-only";

import { cache } from "react";
import { apiFetchSafe } from "@/lib/api/server";
import type { SellerPageData } from "@/types/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loads a student's seller card and storefront. Cached per request so
 * `generateMetadata` and the page share one API call.
 */
export const getSellerPage = cache(
  (id: string): Promise<SellerPageData | null> => {
    if (!UUID_RE.test(id)) return Promise.resolve(null);
    return apiFetchSafe<SellerPageData>(`/sellers/${encodeURIComponent(id)}`);
  },
);
