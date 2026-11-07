import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = (process.env.API_URL ?? "http://127.0.0.1:4000").replace(
  /\/+$/,
  "",
);

type RouteContext = { params: Promise<{ path: string[] }> };

const FORWARDED_HEADERS = [
  "cookie",
  "content-type",
  "accept",
  "authorization",
  "user-agent",
  "x-forwarded-for",
  "x-real-ip",
] as const;

/**
 * Same-origin BFF. The browser keeps calling `/api/...`; this handler forwards
 * the request (including cookies and multipart bodies) to the Express API and
 * copies every `Set-Cookie` header back, so login/logout/refresh behave as if
 * the API were on this origin.
 */
async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  const target = new URL(`${API_URL}/api/${path.join("/")}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          message:
            "The Uniformity API is unreachable. Start it with `npm run api:dev`.",
          code: "API_UNREACHABLE",
        },
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  for (const name of ["content-type", "cache-control", "vary"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  const setCookies =
    (
      upstream.headers as Headers & { getSetCookie?: () => string[] }
    ).getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    responseHeaders.append("set-cookie", cookie);
  }

  const responseBody =
    request.method === "HEAD" ? null : await upstream.arrayBuffer();

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const HEAD = forward;
export const OPTIONS = forward;
