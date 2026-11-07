# AGENTS.md

## Uniformity architecture

Uniformity is a two-part application. The browser only talks to Next.js; the
Next.js app proxies `/api/*` to an owned Express API. Do not add a BaaS/SDK
database client back into the frontend.

- **Frontend:** Next.js 16 App Router in `src/`. Server Components call the API
  through `src/lib/api/server.ts` (`apiFetch`), which forwards cookies.
- **BFF:** `src/app/api/[...path]/route.ts` forwards browser requests to the
  API and copies every `Set-Cookie` back. Client components keep using
  same-origin `/api/*` URLs.
- **API:** Express 5 + TypeScript in `api/`. Layered per domain:
  `*.routes.ts` → `*.controller.ts` → `*.service.ts`, with Zod in
  `*.schema.ts`. Cross-cutting code lives in `api/src/config`,
  `api/src/middleware`, and `api/src/utils`.
- **Database:** PostgreSQL on Supabase (session pooler). `DATABASE_SSL=auto`
  enables TLS for Supabase and `sslmode=require` URLs. The authoritative schema
  is `api/migrations/001_init.sql`; run `npm run db:check`, `npm run db:migrate`,
  and `npm run db:seed`.
- **Auth:** 15-minute access JWT + 30-day rotating hashed refresh token
  (`refresh_tokens` family replay detection). Cookies are `HttpOnly`; the proxy
  (`src/proxy.ts`) refreshes silently before Server Components run.
- **Email:** OTP delivery through the Gmail API (OAuth2 refresh token,
  `api/src/config/mailer.ts`) or SMTP; console in development. With
  `EXPOSE_DEV_OTP=true` in development the code is also returned in the API
  response. Verify delivery with `npm run email:test -- you@bicol-u.edu.ph`.
- **Media:** Cloudinary signed direct uploads (`POST /api/uploads/signature`),
  with a multipart fallback (`POST /api/uploads/direct`). In development with
  no Cloudinary keys, `UPLOAD_DRIVER=auto` writes to `public/uploads/<userId>/`.

## Environment

- Root `.env.local`: `API_URL`, `NEXT_PUBLIC_APP_URL`.
- API `api/.env`: database, JWT secrets, cookies, OTP/email, Cloudinary.
- Never commit secrets. `api/.env` and `.env.local` are gitignored; use the
  `*.example` files as templates.

## Commands

```bash
npm run api:dev        # Express API on :4000
npm run dev            # Next.js on :3000
npm run db:check       # connection + schema diagnostic (safe)
npm run db:migrate     # apply SQL migrations
npm run db:seed        # seed categories
npm run bootstrap-admin
npm run email:test -- you@bicol-u.edu.ph   # real OTP delivery test
npm --prefix api test  # unit tests (Zod schemas + Gmail API)
npm run typecheck      # frontend typecheck
npm --prefix api run typecheck
npm run build && npm run start
```

## Business rules to preserve

- Only `@bicol-u.edu.ph` registrations; 6-digit email OTP.
- No cart, no checkout, no payments, no shipping. Wishlist + public Q&A +
  cash meetup only.
- Verified seller cards; suspended/unverified users cannot write.
- Admin moderation for listings, comments, and user suspension.
- Poppins typography, the existing component structure, and the `/api/*`
  client contract.
