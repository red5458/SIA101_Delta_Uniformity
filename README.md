# Uniformity

A campus-only marketplace for **Bicol University Polangui** students. Upper-year
students pass down pre-loved uniforms, department shirts, and course equipment to
lower-year students.

There is **no cart, no checkout, and no shipping**. Buyers save items to a
wishlist, ask questions on the listing, and arrange an on-campus meetup with the
seller. Payment happens in cash at the meetup.

The app is a **Next.js 16 frontend** backed by a **self-hosted Express +
PostgreSQL REST API** in [`api/`](api). Authentication is JWT + a rotating
refresh token, email OTP is implemented in the API, and listing photos are
uploaded directly to Cloudinary with server-signed requests.

---

## Architecture

```
Browser
  │  same-origin requests only
  ▼
Next.js (Vercel)
  ├── Server Components ──► apiFetch() ──► Express API (Render)
  ├── /api/* BFF proxy ───────────────────► Express API
  └── /uploads/* rewrite ─────────────────► Express (legacy/local photos)
                                               │
                                               ├── Supabase Postgres
                                               ├── Cloudinary (signed uploads)
                                               └── Gmail API / SMTP (OTP email)
```

- The browser never talks to the API directly. Next.js proxies `/api/*` and
  copies every `Set-Cookie` header back, so the session cookies stay on the
  Next.js origin and are **same-origin** even when the API is on another host.
- Server Components and the BFF both call the Express API. Server Components
  forward the incoming cookie header through `src/lib/api/server.ts`.
- The Express API owns all business rules, validation (Zod), authentication,
  rate limiting, and SQL. There is no BaaS and no client-side database access.

See [`docs/architecture.md`](docs/architecture.md) for the request lifecycle,
auth design, and layer breakdown.

---

## Features

- **Institutional sign-up** — only `@bicol-u.edu.ph` addresses are accepted. A
  6-digit emailed code (hashed, expiring, resend-cooldown, attempt-limited)
  verifies the account.
- **Dual-role accounts** — every verified student can buy and sell.
- **Verified seller card** — each listing shows the seller's program, year
  level, department, and a *Verified BU Student* badge with email, mobile, and
  Messenger contact links.
- **Listing CRUD** — create, edit, delete, and toggle `Active` / `Sold`.
- **Cloud photos** — up to 6 photos per listing, compressed in the browser, then
  uploaded directly to Cloudinary with a short-lived signature scoped to the
  student's own folder. Removing or deleting photos cleans up the assets. A
  multipart fallback (`/api/uploads/direct`) exists for environments where
  direct upload is blocked, and doubles as an offline development driver.
- **Filtered feed** — search, department, category, item type, size, condition,
  price range, and price/newest sorting with pagination. Sold items leave the
  feed.
- **Wishlist** — bookmark listings instead of adding to a cart.
- **Public Q&A** — threaded comments on every listing. Seller replies get a
  **Seller** badge. Authors and admins can delete comments.
- **Admin panel** — overview stats, listing moderation (with photo cleanup),
  user suspension/reinstatement, and comment removal.
- **Mobile-first UI** — sticky header, bottom tab bar, responsive cards.

---

## Tech stack

| Layer          | Choice                                                       |
| -------------- | ------------------------------------------------------------ |
| Frontend       | Next.js 16.4 (App Router, Server Components, Proxy), React 19 |
| Styling        | Tailwind CSS 3.4, Lucide icons, Sonner                       |
| Fonts          | Poppins via `next/font` (self-hosted, preloaded)             |
| API            | Express 5 + TypeScript, Zod validation, Pino logging          |
| Database       | PostgreSQL 15+ on Supabase, `pg`, SQL migrations, triggers   |
| Auth           | `jsonwebtoken` access tokens + opaque rotating refresh tokens |
| Passwords      | `bcryptjs`, cost 12                                          |
| Media          | Cloudinary signed direct uploads (`multer` memory fallback)  |
| Email          | Gmail API (OAuth2 refresh token) or SMTP; console in dev     |

Performance notes:

- Poppins is bundled and preloaded by `next/font`, so there is no render-blocking
  Google Fonts request.
- `getSession()` is wrapped in React `cache()`, so a layout plus page render
  performs one `/auth/me` call instead of one per component.
- Feed and detail data are fetched with `Promise.all` where independent.
- `browser-image-compression` is imported only when a photo is picked, and
  photos are served through `next/image`.
- The proxy deduplicates concurrent refreshes in-process, and the API keeps a
  short reuse grace window so parallel requests cannot revoke a valid session.

---

## Getting started

### 1. Install

```bash
npm install
npm --prefix api install
```

Requires Node.js 20+ and a running PostgreSQL server (16 or newer).

### 2. Create the database

The app expects a PostgreSQL 15+ database. Supabase is the deployment target;
any Postgres works locally.

**Supabase (recommended):**

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → Database → Connection string** and copy the
   **Session pooler** URI (port `5432`). The direct `db.<ref>.supabase.co` host
   is IPv6-only on the free plan, so the pooler is the portable choice.
3. URL-encode special characters in the password (`@` → `%40`, `#` → `%23`).

**Local Postgres:**

```sql
CREATE ROLE uniformity LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE uniformity OWNER uniformity;
```

### 3. Configure environments

Root `.env.local` (Next.js):

```dotenv
API_URL=http://127.0.0.1:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`api/.env` (copy from `api/.env.example`):

```dotenv
NODE_ENV=development
PORT=4000
# Supabase session pooler (or a local Postgres URL with DATABASE_SSL=false)
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
DATABASE_SSL=auto
JWT_ACCESS_SECRET=<at least 32 random characters>
JWT_REFRESH_SECRET=<at least 32 random characters>
WEB_ORIGIN=http://localhost:3000
EXPOSE_DEV_OTP=true
EMAIL_MODE=console
UPLOAD_DRIVER=auto
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`DATABASE_SSL=auto` turns TLS on for Supabase and for `sslmode=require` URLs,
and stays off for local Postgres. `npm run db:check` prints the resolved
host/provider/TLS mode and table counts without leaking the password.

With `EMAIL_MODE=console` and `EXPOSE_DEV_OTP=true`, the OTP is logged by the
API and returned in the register response so you can verify an account locally
without an inbox. Switching to Gmail is covered under
[Email delivery](#email-delivery).

With no Cloudinary keys and `UPLOAD_DRIVER=auto`, development stores photos on
disk under `public/uploads/<userId>/`. Set the three `CLOUDINARY_*` keys (and
`UPLOAD_DRIVER=cloudinary` if you want to force it) for the real signed-upload
path.

### 4. Migrate, seed, and create an admin

```bash
npm run db:check       # verify the connection first
npm run db:migrate     # api/migrations/001_init.sql
npm run db:seed        # categories
ADMIN_EMAIL=you@bicol-u.edu.ph ADMIN_PASSWORD='strong-password' ADMIN_NAME='Your Name' npm run bootstrap-admin
```

### 5. Run

```bash
npm run api:dev   # Express API on http://127.0.0.1:4000
npm run dev       # Next.js on http://localhost:3000
```

Production:

```bash
npm run api:build && npm run api:start
npm run build && npm run start
```

Other scripts: `npm run typecheck`, `npm --prefix api run typecheck`,
`npm run db:check`, `npm run email:test -- <inbox>`.

---

## Environment variables

### Next.js

| Variable              | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `API_URL`             | Base URL of the Express API (server-side only)                |
| `NEXT_PUBLIC_APP_URL` | Public origin of the app, used in metadata                    |

### API

| Variable                     | Purpose                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`               | Supabase session-pooler (or local) connection string        |
| `DATABASE_SSL`               | `auto` (default), `true`, or `false`; auto enables TLS on Supabase |
| `DATABASE_SSL_STRICT`        | `true` verifies the provider certificate chain              |
| `DATABASE_POOL_MAX`          | Pool size, default `12`                                     |
| `JWT_ACCESS_SECRET`          | ≥32 chars, signs 15-minute access tokens                    |
| `JWT_REFRESH_SECRET`         | ≥32 chars, hashes/validates refresh tokens                  |
| `ACCESS_TOKEN_TTL_SECONDS`   | Default `900`                                               |
| `REFRESH_TOKEN_TTL_DAYS`     | Default `30`                                                |
| `REFRESH_REUSE_GRACE_SECONDS`| Default `30`, race window for concurrent refresh requests   |
| `BCRYPT_ROUNDS`              | Default `12`                                                |
| `WEB_ORIGIN`                 | Comma-separated allowed CORS origins                        |
| `COOKIE_DOMAIN`              | Optional cookie domain (leave empty when using the BFF)     |
| `COOKIE_SECURE`              | Defaults to `true` in production                            |
| `OTP_TTL_MINUTES`            | Default `10`                                                |
| `OTP_MAX_ATTEMPTS`           | Default `5`                                                 |
| `OTP_RESEND_COOLDOWN_SECONDS`| Default `60`                                                |
| `EXPOSE_DEV_OTP`             | Development only; return the code in the API response       |
| `EMAIL_MODE`                 | `console`, `gmail`, or `smtp`                               |
| `GMAIL_USER`                 | Mailbox that sends OTPs (also the `MAIL_FROM` address)      |
| `GMAIL_CLIENT_ID`            | OAuth client ID (Desktop app)                               |
| `GMAIL_CLIENT_SECRET`        | OAuth client secret                                         |
| `GMAIL_REFRESH_TOKEN`        | Long-lived token with the `gmail.send` scope                 |
| `MAIL_FROM`, `SMTP_*`        | Sender name and optional SMTP delivery settings             |
| `CLOUDINARY_*`               | Cloud name, API key, and API secret                         |
| `UPLOAD_DRIVER`              | `auto`, `cloudinary`, or `local`                            |
| `PUBLIC_DIR`                 | Optional path to the Next.js `public` folder                |
| `ADMIN_*`                    | Used only by `bootstrap-admin`                              |

---

## Authentication

1. `POST /api/auth/register` validates the BU email and stores a bcrypt password
   hash, profile data, and a **hashed** 6-digit OTP with an expiry.
2. `POST /api/auth/verify` checks the OTP (attempt-limited), marks the account
   verified, and signs in.
3. Successful login/verification sets two **HttpOnly** cookies:
   - `uniformity_access` — 15-minute JWT with `sub`, `role`, `iss`, `aud`.
   - `uniformity_refresh` — 30-day opaque token. Only its SHA-256 hash is stored
     in `refresh_tokens`, grouped into a `family_id`.
4. Every refresh rotates the token. Reusing an old token outside the grace
   window revokes the whole family (replay detection). Inside
   `REFRESH_REUSE_GRACE_SECONDS`, a concurrent request mints another token for
   the same family instead of logging the student out.
5. `src/proxy.ts` detects an expired/near-expiry access token and refreshes it
   before Server Components run, forwarding the new cookies to both the browser
   and the current request.
6. Logout clears both cookies and revokes the refresh token.

### Email delivery

OTP codes are delivered by the API, not the browser. Two providers are
supported:

- **Gmail API (production)** — `EMAIL_MODE=gmail` exchanges a stored OAuth2
  refresh token for an access token and posts an RFC 2822 message to
  `gmail.googleapis.com`. The token is cached until ~1 minute before expiry and
  refreshed once on a `401`. The refresh token and client secret never leave
  the API.
- **SMTP** — `EMAIL_MODE=smtp` for Resend/Brevo/SES style relays.
- **Console (development)** — logs the code; with `EXPOSE_DEV_OTP=true` it is
  also returned in the API response.

Gmail setup:

1. Create a Google Cloud project and enable the **Gmail API**.
2. Configure the OAuth consent screen and add the `https://mail.google.com/`
   scope (required by `gmail.send`).
3. Create an OAuth client of type **Desktop app** and note the client ID/secret.
4. Authorize with the sending mailbox and exchange the code for a refresh token
   (OAuth 2.0 Playground or `oauth2l`).
5. Set `EMAIL_MODE=gmail`, `GMAIL_USER`, `GMAIL_CLIENT_ID`,
   `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, and
   `MAIL_FROM=Uniformity <the-same-gmail-address>`.
6. Verify real delivery with `npm run email:test -- you@bicol-u.edu.ph` (or any
   inbox you can open). This exercises the same code path as registration.

Gmail only accepts a sender that is the authenticated mailbox or a verified
"Send mail as" alias. The API falls back to `GMAIL_USER` when `MAIL_FROM` is
still the local placeholder.

---

## Data model

| Table            | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `users`          | Student profile and credentials (bcrypt hash, flags, contacts)        |
| `categories`     | Seeded taxonomy (uniform, PE, department shirt, equipment, etc.)      |
| `listings`       | Item for sale, seller, category, price, condition, size, status       |
| `listing_photos` | Ordered photos with CDN URL and storage key                           |
| `wishlists`      | Per-user saved listings, unique on `(user_id, listing_id)`            |
| `comments`       | Threaded Q&A with optional `parent_id`                                |
| `refresh_tokens` | Hashed refresh tokens with family, expiry, and rotation metadata      |
| `email_verification_codes` | Hashed OTPs with expiry, attempts, and cooldown   |

The schema lives in [`api/migrations/001_init.sql`](api/migrations/001_init.sql).
Triggers keep `updated_at` fresh, and constraints enforce the no-cart rules
(unique wishlist entries, one OTP per user, cascade deletes).

---

## Security model

- Passwords are never stored in plaintext; `bcryptjs` with cost 12.
- Access tokens are short-lived JWTs; refresh tokens are opaque, hashed at rest,
  rotated on every use, and grouped into families for replay detection.
- Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- OTP codes are hashed, expire, have a resend cooldown, and are attempt-limited.
- All SQL uses parameterized queries; all request bodies are validated with Zod.
- Rate limits: authentication endpoints, write endpoints, and global requests.
- Helmet sets security headers; CORS only allows configured origins.
- Photo uploads are signed server-side and scoped to
  `uniformity/<userId>/`, so a student cannot upload into another account's
  folder or delete foreign assets. Removal is best-effort and never fails the
  request.
- Admins are enforced server-side by middleware, not by hiding UI.
- Suspended or unverified accounts are blocked by `requireActive` middleware on
  every write path.

---

## API surface

All routes are under `/api` on the Express server and are proxied unchanged by
the Next.js BFF.

| Route                              | Methods                  | Access        |
| ---------------------------------- | ------------------------ | ------------- |
| `/auth/register`                   | `POST`                   | public        |
| `/auth/verify`, `/auth/resend`     | `POST`                   | public        |
| `/auth/login`, `/auth/refresh`     | `POST`                   | public        |
| `/auth/logout`                     | `POST`                   | public        |
| `/auth/me`                         | `GET`                    | authenticated |
| `/profile`                         | `PATCH`                  | authenticated |
| `/listings/categories`             | `GET`                    | authenticated |
| `/listings`                        | `GET`, `POST`            | authenticated |
| `/listings/mine`                   | `GET`                    | authenticated |
| `/listings/:id`                    | `GET`, `PATCH`, `DELETE` | authenticated |
| `/comments?listing_id=`            | `GET`, `POST`            | authenticated |
| `/comments/:id`                    | `DELETE`                 | author/admin  |
| `/wishlist`, `/wishlist/ids`       | `GET`                    | authenticated |
| `/wishlist/toggle`                 | `POST`                   | active user   |
| `/uploads/signature`               | `POST`                   | active user   |
| `/uploads/direct`                  | `POST`                   | active user   |
| `/admin/stats`                     | `GET`                    | admin         |
| `/admin/listings`, `/admin/users`  | `GET`                    | admin         |
| `/admin/comments`                  | `GET`                    | admin         |
| `/admin/listings/:id`              | `DELETE`                 | admin         |
| `/admin/comments/:id`              | `DELETE`                 | admin         |
| `/admin/users/:id/suspend`         | `POST`                   | admin         |
| `/health`                          | `GET`                    | public        |

Pages: `/`, `/login`, `/register`, `/verify-email`, `/complete-profile`,
`/browse`, `/listings/[id]`, `/wishlist`, `/sell/new`, `/sell/[id]/edit`,
`/dashboard`, `/profile`, `/suspended`, and `/admin/*`.

---

## Project layout

```
api/
  migrations/001_init.sql     Schema, triggers, constraints, category seed
  src/app.ts                  Express app wiring
  src/config/                 Env validation, pg pool, logger, Cloudinary
  src/middleware/             Auth, active-user guard, rate limits, errors
  src/modules/auth/           Register/verify/login/refresh/rotation
  src/modules/profile/        Profile updates
  src/modules/listings/       Feed, detail, CRUD, photos, media cleanup
  src/modules/comments/       Threaded Q&A
  src/modules/wishlist/       Saved listings
  src/modules/uploads/        Cloudinary signature + multipart fallback
  src/modules/admin/          Moderation endpoints
  src/db/                     Migration runner and seed
  src/scripts/                Admin bootstrap, db:check, email:test
src/app/(auth)/               Login, register, verify-email
src/app/(app)/                Authenticated marketplace pages
src/app/(admin)/admin/        Admin overview, listings, users, comments
src/app/api/[...path]/        Same-origin BFF proxy to Express
src/components/               UI: listings, comments, sellers, admin, auth
src/lib/api/server.ts         Server-side API client (forwards cookies)
src/lib/auth/session.ts       Session loading and route guards
src/lib/data/                 Feed, detail, comments, wishlist, admin fetches
src/proxy.ts                  Silent refresh + cookie forwarding
docs/                         Architecture and deployment notes
```

---

## Deployment

Recommended split:

- **Next.js** → Vercel (set `API_URL` to the Render URL).
- **Express API** → Render web service (root directory `api`).
- **PostgreSQL** → **Supabase** (session pooler connection string).
- **Photos** → Cloudinary.
- **Email** → **Gmail API** (`EMAIL_MODE=gmail`).

`render.yaml` describes the API service. After the first deploy:

1. Set the API environment variables from `api/.env.example` (`NODE_ENV=production`,
   `DATABASE_URL` from Supabase, JWT secrets, `WEB_ORIGIN=https://your-app.vercel.app`,
   Cloudinary keys, Gmail API credentials). Leave `DATABASE_SSL=auto` and
   `COOKIE_SECURE` unset so TLS and secure cookies default to on.
2. Run `npm run db:check`, `npm run db:migrate` (and optionally `npm run db:seed`
   and `npm run bootstrap-admin`) against the production database from a local
   machine or a one-off Render shell.
3. Verify OTP delivery with `npm run email:test -- you@bicol-u.edu.ph`.
4. Set `API_URL=https://<api>.onrender.com` and
   `NEXT_PUBLIC_APP_URL=https://<app>.vercel.app` in Vercel.
5. Because all browser traffic goes through the Next.js BFF, the API cookies are
   stored on the Vercel origin. No shared parent domain is required.

More detail: [`docs/deployment.md`](docs/deployment.md).

---

## Notes and constraints

- This is an academic project; it does not process payments, hold funds, or
  track shipments by design.
- The admin panel loads up to 200 rows per moderation table.
- Photos are compressed client-side to roughly 0.7 MB and 1600 px before upload.
- Local development with `EMAIL_MODE=console` prints OTPs instead of sending
  email. Configure the Gmail API (`EMAIL_MODE=gmail`) before using real student
  inboxes, and confirm with `npm run email:test -- you@bicol-u.edu.ph`.
- Supabase free-tier projects pause after a week of inactivity; the API will log
  connection errors and `/health` returns `503` until the project resumes.
- `npm run db:check` is the first thing to run when a database change does not
  behave as expected — it reports provider, host, TLS mode, migrations and row
  counts without printing the password.
- The imported development accounts (`admin@bicol-u.edu.ph` and the sample
  student) use placeholder passwords from the migration run. Rotate them or
  delete them before deploying.
