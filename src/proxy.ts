import { NextResponse, type NextRequest } from "next/server";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(
  /\/+$/,
  "",
);

const ACCESS_COOKIE = "uniformity_access";
const REFRESH_COOKIE = "uniformity_refresh";

/** Refresh if the access token is missing, malformed, or about to expire. */
const REFRESH_WINDOW_MS = 60_000;

function expiresAt(token: string | undefined): number | null {
  if (!token) return null;
  const segment = token.split(".")[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function needsRefresh(token: string | undefined): boolean {
  const exp = expiresAt(token);
  if (exp === null) return true;
  return exp - Date.now() < REFRESH_WINDOW_MS;
}

interface RefreshResult {
  ok: boolean;
  cookies: string[];
}

const inFlight = new Map<string, Promise<RefreshResult>>();
const recent = new Map<string, { at: number; result: RefreshResult }>();
const RECENT_MS = 10_000;

function cookieHeader(name: string, value: string) {
  return `${name}=${value}`;
}

function splitSetCookie(raw: string): { name: string; value: string } | null {
  const pair = raw.split(";", 1)[0];
  if (!pair) return null;
  const index = pair.indexOf("=");
  if (index <= 0) return null;
  return {
    name: pair.slice(0, index).trim(),
    value: pair.slice(index + 1).trim(),
  };
}

/**
 * Calls the API refresh endpoint. Concurrent requests for the same refresh
 * token share one promise; the API also has a short reuse grace window for
 * requests that reach a different process.
 */
async function refreshSession(refreshToken: string): Promise<RefreshResult> {
  const cached = recent.get(refreshToken);
  if (cached && Date.now() - cached.at < RECENT_MS) return cached.result;

  const pending = inFlight.get(refreshToken);
  if (pending) return pending;

  const promise = (async (): Promise<RefreshResult> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { cookie: cookieHeader(REFRESH_COOKIE, refreshToken) },
        cache: "no-store",
      });

      const cookies =
        (
          response.headers as Headers & { getSetCookie?: () => string[] }
        ).getSetCookie?.() ?? [];

      return { ok: response.ok, cookies };
    } catch {
      return { ok: false, cookies: [] };
    }
  })();

  inFlight.set(refreshToken, promise);
  try {
    const result = await promise;
    recent.set(refreshToken, { at: Date.now(), result });
    if (recent.size > 50) recent.clear();
    return result;
  } finally {
    inFlight.delete(refreshToken);
  }
}

export async function proxy(request: NextRequest) {
  // Never rotate while handling auth itself: login/logout/refresh/verify must
  // see the browser's cookies exactly as sent.
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken || !needsRefresh(accessToken)) {
    return NextResponse.next();
  }

  const result = await refreshSession(refreshToken);

  for (const raw of result.cookies) {
    const parsed = splitSetCookie(raw);
    if (!parsed) continue;

    if (parsed.value) {
      // Mutate the request first so Server Components downstream read the new
      // tokens on this very request (no redirect round trip).
      request.cookies.set(parsed.name, parsed.value);
    } else {
      request.cookies.delete(parsed.name);
    }
  }

  if (!result.ok && result.cookies.length === 0) {
    // API unreachable or refused without clearing cookies. Drop them locally so
    // the app falls back to the login page instead of retrying forever.
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
      request.cookies.delete(name);
    }
  }

  // Snapshot the mutated request headers, then mirror the API's Set-Cookie
  // headers onto the browser response (preserving HttpOnly/SameSite/Max-Age).
  const response = NextResponse.next({ request });

  for (const raw of result.cookies) {
    response.headers.append("set-cookie", raw);
  }

  if (!result.ok && result.cookies.length === 0) {
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
      response.cookies.delete(name);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
