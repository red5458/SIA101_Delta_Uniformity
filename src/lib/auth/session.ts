import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { ApiRequestError, apiFetch } from "@/lib/api/server";
import type { Profile } from "@/types/db";

interface MeResponse {
  user: { id: string; email: string; emailVerified: boolean };
  profile: Profile;
  tokenTtlSeconds: number;
}

export interface Session {
  authUser: { id: string; email: string; emailVerified: boolean } | null;
  profile: Profile | null;
}

/**
 * Loads the authenticated student from the Express API. Wrapped in React
 * `cache` so a layout and page rendered in the same request share one auth
 * check instead of each performing their own round trip.
 *
 * An expired access token is refreshed by `src/proxy.ts` before the request
 * reaches this function; a 401 here therefore means the visitor is signed out.
 */
export const getSession = cache(async (): Promise<Session> => {
  try {
    const data = await apiFetch<MeResponse>("/auth/me");
    return {
      authUser: data.user,
      profile: data.profile,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return { authUser: null, profile: null };
    }
    throw error;
  }
});

export function isActiveProfile(profile: Profile | null): boolean {
  return Boolean(
    profile &&
      profile.is_verified &&
      !profile.is_suspended &&
      profile.year_level &&
      profile.department &&
      profile.program,
  );
}

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session.authUser) redirect("/login");
  if (session.profile?.is_suspended) redirect("/suspended");
  return session;
}

export async function requireVerifiedUser(): Promise<
  Session & { authUser: NonNullable<Session["authUser"]>; profile: Profile }
> {
  const session = await requireUser();
  if (!session.profile?.is_verified) {
    redirect(
      `/verify-email?email=${encodeURIComponent(session.authUser!.email)}`,
    );
  }
  if (!isActiveProfile(session.profile)) {
    redirect("/complete-profile");
  }
  return session as Session & {
    authUser: NonNullable<Session["authUser"]>;
    profile: Profile;
  };
}

export async function requireAdmin(): Promise<
  Session & { authUser: NonNullable<Session["authUser"]>; profile: Profile }
> {
  const session = await requireVerifiedUser();
  if (!session.profile.is_admin) redirect("/browse");
  return session;
}
