# Architecture

Uniformity is split into two independently deployable applications:

```
┌──────────────────────────┐        ┌──────────────────────────┐
│ Next.js (Vercel)         │        │ Express API (Render)     │
│                          │        │                          │
│ Server Components        │ HTTPS  │ Routes → Controllers     │
│  └─ apiFetch() ──────────┼───────►│          │               │
│ Route Handler /api/*     │        │          ▼               │
│  └─ BFF proxy ───────────┼───────►│        Services          │
│ /uploads rewrite         │        │          │               │
└──────────────────────────┘        │          ▼               │
                                    │   Supabase Postgres      │
                                    │      Cloudinary          │
                                    │   Gmail API              │
                                    └──────────────────────────┘
```

## Why two applications?

The marketplace was originally built on a hosted BaaS where the Next.js app
queried the database directly with a client SDK and relied on row-level
security. For a systems-integration/architecture project we replaced that with
an owned backend so that every rule lives in code we control:

- Authentication and OTP are implemented in the API.
- Validation is centralized in Zod schemas per module.
- Authorization is explicit middleware plus SQL ownership checks.
- The database schema, indexes, triggers, and constraints are versioned SQL.
- Photos, email, and payments (none by design) are boundary services the API
  orchestrates.

The frontend was intentionally kept: pages, components, styling, and the
`/api/*` URL contract are unchanged.

## Request lifecycle

### Server-rendered page

1. The browser requests `/browse` from Next.js.
2. `src/proxy.ts` checks the `uniformity_access` cookie. If it is missing,
   malformed, or within 60 seconds of expiry, it calls `POST /api/auth/refresh`
   on the API, rotates the cookies, and forwards them to both the browser
   response and the current request.
3. The page calls `requireVerifiedUser()` → `getSession()` → `apiFetch('/auth/me')`.
   `apiFetch` forwards the incoming cookie header to Express.
4. The page calls the data layer (`src/lib/data/*`), which performs one or more
   `apiFetch` calls.
5. The API authenticates the JWT, runs parameterized SQL, and returns
   `{ data: … }`. Server Components render HTML.

`getSession` is wrapped in React `cache()`, so a layout and page rendered in the
same request share a single `/auth/me` call.

### Browser mutation

1. A client component posts to `/api/listings` on the Next.js origin.
2. The catch-all handler `src/app/api/[...path]/route.ts` forwards method,
   allowed headers, cookies, and the raw body to the API.
3. It copies the upstream status, `content-type`, and **every** `Set-Cookie`
   header back to the browser.

This keeps cookies same-origin from the browser's perspective, avoids CORS
preflights, and lets the API live on a different host without a shared parent
domain.

### Static uploads

`apiFetch` never handles images. For photos the browser asks
`POST /api/uploads/signature`, receives a short-lived Cloudinary signature
scoped to `uniformity/<userId>/`, and uploads the compressed file directly to
Cloudinary. The API only stores the returned URL and public id.

A multipart fallback (`POST /api/uploads/direct`) exists for blocked direct
uploads. In development with no Cloudinary keys (`UPLOAD_DRIVER=auto`), it stores
files in `public/uploads/<userId>/` and returns a `local:` key. Next.js rewrites
`/uploads/*` to the API so those files are served consistently.

### Database and email providers

- **PostgreSQL on Supabase.** The API uses `pg` with a single pool and the
  Supabase **session pooler** URI. `DATABASE_SSL=auto` enables TLS based on the
  hostname (`*.supabase.co`, `*.pooler.supabase.com`) or an `sslmode=require`
  parameter, so local Postgres still works with `DATABASE_SSL=false`. Migrations
  run on a dedicated client so `BEGIN`/`COMMIT` stay on one connection even
  behind a pooler.
- **Gmail API for OTP delivery.** `EMAIL_MODE=gmail` exchanges a refresh token at
  `oauth2.googleapis.com/token`, caches the access token until shortly before
  expiry, builds an RFC 2822 multipart/alternative message, and posts it to
  `gmail.googleapis.com/.../messages/send`. A `401` triggers one forced token
  refresh and retry; `invalid_grant` and missing-scope errors are surfaced with
  actionable messages. `npm run email:test -- <inbox>` exercises this path.

## API layers

```
src/modules/<domain>/
  *.routes.ts      HTTP verbs, middleware, rate limits
  *.controller.ts  parse request → call service → send envelope
  *.service.ts     business rules and SQL
  *.schema.ts      Zod input validation
```

Cross-cutting code lives in `src/middleware` (auth, active-user guard, admin
guard, rate limits, centralized errors), `src/config` (env validation, pg pool,
logger, Cloudinary, Gmail/SMTP mailer), and `src/utils` (response envelope,
typed `ApiError`, database error hints).

Every response uses one envelope:

```json
{ "data": … }
{ "error": { "message": "…", "code": "VALIDATION_ERROR", "issues": [] } }
```

## Authentication design

| Concern        | Decision                                                        |
| -------------- | --------------------------------------------------------------- |
| Access token   | JWT, 15 minutes, `sub` + `role`, `iss=uniformity-api`, `aud=uniformity-web` |
| Refresh token  | 30-day opaque random value; SHA-256 hash stored in Postgres     |
| Rotation       | Every refresh issues a new token and marks the old one replaced |
| Replay defense | Reuse outside a 30-second grace window revokes the whole family |
| Race handling  | Grace window + in-process dedupe in `src/proxy.ts`              |
| Storage        | `HttpOnly`, `SameSite=Lax`, `Secure` in production              |
| Passwords      | bcrypt cost 12                                                  |
| OTP            | 6 digits, hashed, 10-minute TTL, 5 attempts, 60-second cooldown |

The access token is intentionally short so a revoked account loses access
quickly, while the refresh token makes sessions convenient. Only hashes of
refresh tokens and OTPs are stored, so a database leak does not expose live
credentials.

## Data model

```
users ──< listings ──< listing_photos
  │           │
  │           ├──< wishlists >── users
  │           └──< comments ──< comments (parent_id)
  ├──< refresh_tokens
  └──< email_verification_codes

categories ──< listings
```

- `users` holds the student profile and the bcrypt password hash.
- `refresh_tokens` stores `token_hash`, `family_id`, `expires_at`,
  `revoked_at`, and `replaced_by`.
- `email_verification_codes` stores `code_hash`, `expires_at`, `attempts`, and
  `created_at` (used for the resend cooldown).
- Foreign keys cascade where deleting the parent should remove dependent rows
  (e.g. listing → photos, wishlists, comments).

See `api/migrations/001_init.sql` for the authoritative definition.

## Security boundaries

| Boundary              | Control                                                    |
| --------------------- | ---------------------------------------------------------- |
| Browser → Next.js     | HttpOnly session cookies, CSRF-safe same-origin mutations  |
| Next.js → API         | Cookie header forwarding, BFF allow-list of headers        |
| API → Postgres        | Parameterized queries, least-privilege app role            |
| API → Cloudinary      | Signed uploads scoped to `uniformity/<userId>/`            |
| API → Gmail API       | OAuth2 refresh token, `gmail.send` scope, server-side only |
| Admin actions         | `authenticate` + `requireAdmin` middleware on the router   |
| Writes                | `requireActive` blocks suspended/unverified accounts       |

Rate limits are layered: authentication endpoints are stricter than general
reads, and write endpoints have their own bucket.

## Trade-offs

- **Two deployables instead of one** — clearer separation and an owned API, at
  the cost of an extra network hop and two sets of environment variables.
- **BFF proxy** — removes cross-origin cookie complexity and keeps the existing
  `/api/*` client contract, at the cost of proxying request bodies once.
- **Signed direct uploads** — the API never buffers 5 MB images and cannot
  exceed platform body limits, but requires Cloudinary configuration (or the
  development disk fallback).
- **Refresh rotation with a grace window** — stronger replay detection without
  logging users out when two tabs refresh simultaneously.
- **SQL instead of an ORM** — explicit, inspectable queries and no schema
  duplication, at the cost of writing mapping code.

## Verification checklist

Run both servers and confirm:

- Register → OTP → login sets both cookies; logout clears them.
- An expired access token is refreshed transparently and the page renders 200
  without a redirect.
- Replaying a rotated refresh token inside the grace window succeeds; outside
  it, the family is revoked.
- Browse, filters, pagination, listing detail, Q&A, wishlist, create/edit/
  delete, status toggle, and every admin page work through the BFF.
- Deleting a listing removes its photo from Cloudinary (or disk in dev).
- Suspended accounts cannot write.
