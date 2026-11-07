import "server-only";

import { cookies } from "next/headers";

/**
 * Base URL of the Express API. Server Components and Route Handlers talk to
 * this directly; the browser only ever talks to the Next origin through the
 * `/api/*` proxy so auth cookies stay same-origin.
 */
export const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(
  /\/+$/,
  "",
);

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { message?: string; code?: string };
}

/**
 * Calls the API on behalf of the current request, forwarding the incoming
 * cookies so the API can authenticate the student. Never cached: feeds and
 * moderation data must be fresh.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const headers: Record<string, string> = {
    accept: "application/json",
    ...options.headers,
  };
  if (cookieHeader) headers.cookie = cookieHeader;

  let body: string | undefined;
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });

  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      payload?.error?.message ?? "Request failed",
      payload?.error?.code,
    );
  }

  return payload?.data as T;
}

/**
 * For pages where "missing" is a valid state (a listing that was removed, a
 * suspended seller). Auth and server errors still propagate.
 */
export async function apiFetchSafe<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    if (
      error instanceof ApiRequestError &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      return null;
    }
    throw error;
  }
}
