# Deployment

The app deploys as two services plus two external providers:

| Piece        | Host                     | Notes                                        |
| ------------ | ------------------------ | -------------------------------------------- |
| Next.js      | Vercel                   | Server Components + `/api/*` BFF             |
| Express API  | Render                   | Root directory `api`                         |
| PostgreSQL   | **Supabase**             | Session pooler connection string, TLS on     |
| Photos       | Cloudinary               | Signed direct uploads                        |
| Email        | **Gmail API**            | OAuth2 refresh token with `gmail.send` scope |

```
Browser ──► Vercel (Next.js) ──► Render (Express API) ──► Supabase Postgres
                                     │                    Cloudinary
                                     └──────────────────► Gmail API
```

## 1. Supabase database

1. Create a project at [supabase.com](https://supabase.com) and wait for the
   database to finish provisioning.
2. Open **Project Settings → Database → Connection string**.
3. Copy the **Session pooler** URI (port `5432`):

   ```text
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```

   Why the session pooler: the free plan resolves `db.<ref>.supabase.co` to
   IPv6 only, which many CI machines and Render instances cannot reach. Session
   mode keeps a stable connection, so the migration runner's `BEGIN`/`COMMIT`
   and the API's long-lived pool both work.
4. URL-encode special characters in the password before putting it in the URL:
   `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`, `?` → `%3F`.
5. Nothing needs to be created manually. The migrations create every table,
   index, trigger and constraint in the `public` schema.

Apply the schema, seed categories, and create the first admin:

```bash
npm run db:check        # provider, host, TLS, tables (no password printed)
npm run db:migrate      # api/migrations/001_init.sql
npm run db:seed         # 5 categories
ADMIN_EMAIL=you@bicol-u.edu.ph \
  ADMIN_PASSWORD='strong-password' \
  ADMIN_NAME='Your Name' \
  npm run bootstrap-admin
```

Run these from the repository root with the **same `DATABASE_URL`** the API will
use. `DATABASE_SSL=auto` (the default) turns TLS on for Supabase automatically.
If the pooler rejects DDL with a prepared-statement or permission error, switch
to the direct connection string for migrations only, then switch back.

Useful checks:

```sql
select count(*) from users;
select name, applied_at from schema_migrations;
```

## 2. Gmail API for OTP email

The API sends OTPs through the Gmail REST API, not SMTP. One-time setup:

1. **Google Cloud project** — create one at
   [console.cloud.google.com](https://console.cloud.google.com).
2. **Enable the Gmail API** — *APIs & Services → Library → Gmail API → Enable*.
3. **OAuth consent screen** — choose *External*, fill the app name and support
   email. Add the scope `https://mail.google.com/` (the `gmail.send` scope
   requires it for sending). While the app is in *Testing*, add the sending
   mailbox as a test user.
4. **OAuth client** — *Credentials → Create credentials → OAuth client ID →
   Desktop app*. Copy the client ID and client secret.
5. **Refresh token** — authorize the sending account and exchange the code:

   - *Google OAuth 2.0 Playground*: gear icon → check *Use your own OAuth
     credentials* → enter the client ID/secret → scope `https://mail.google.com/`
     → *Authorize APIs* → exchange the authorization code for tokens → copy
     `refresh_token`.
   - Or use `oauth2l` / a short local script with a loopback redirect.
6. **Verify the token** — the Google token endpoint returns
   `{"error":"invalid_grant"}` if the token was revoked, the account password
   changed, or the app is still in testing and the token expired after 7 days.
   Re-run step 5 in that case.

Configure the API:

```dotenv
EMAIL_MODE=gmail
GMAIL_USER=uniformity.bu@gmail.com
GMAIL_CLIENT_ID=...apps.googleusercontent.com
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
MAIL_FROM=Uniformity <uniformity.bu@gmail.com>
```

`MAIL_FROM` must be the authenticated mailbox or a verified *Send mail as*
alias; Gmail rejects any other sender. If `MAIL_FROM` is left at the local
placeholder, the API falls back to `GMAIL_USER`.

Test real delivery before deploying:

```bash
npm run email:test -- you@bicol-u.edu.ph
```

This runs the same OAuth exchange, MIME construction, and send call as
registration. A delivery failure at startup or registration surfaces the Gmail
error message (for example `invalid_grant`, `insufficientPermissions`) and the
API refuses to boot if `EMAIL_MODE=gmail` is set without all four variables.

> Gmail sending limits: a free `@gmail.com` account can send roughly 500
> messages per day. That is far above the OTP volume of a class project, but
> use a Workspace account or an SMTP relay if the app grows.

## 3. Express API on Render

`render.yaml` at the repository root defines the service. Either use it as a
Blueprint or create a web service manually with:

- Root directory: `api`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/health`

Set these environment variables:

```dotenv
NODE_ENV=production
PORT=10000                  # Render injects PORT; keep the service default
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
DATABASE_SSL=auto
DATABASE_SSL_STRICT=false
DATABASE_POOL_MAX=12
JWT_ACCESS_SECRET=<48+ random chars>
JWT_REFRESH_SECRET=<48+ random chars>
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
REFRESH_REUSE_GRACE_SECONDS=30
BCRYPT_ROUNDS=12
WEB_ORIGIN=https://<your-app>.vercel.app
# COOKIE_DOMAIN=            # leave empty when using the Next.js BFF
# COOKIE_SECURE=            # defaults to true in production
OTP_TTL_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
EXPOSE_DEV_OTP=false
EMAIL_MODE=gmail
GMAIL_USER=...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
MAIL_FROM=Uniformity <...@gmail.com>
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
UPLOAD_DRIVER=cloudinary
```

Notes:

- Keep `DATABASE_POOL_MAX` modest when several API instances share the Supabase
  pooler; each instance opens its own pool.
- Do **not** set `UPLOAD_DRIVER=local` in production. Without Cloudinary keys
  the API returns `503 UPLOADS_DISABLED` instead of writing to ephemeral disk.
- The API serves `/uploads/*` read-only from the repository `public` folder so
  imported legacy photos keep working. New uploads use Cloudinary URLs.
- `WEB_ORIGIN` only matters for direct browser-to-API calls; normal traffic goes
  through the BFF. List every frontend origin, comma-separated.

## 4. Next.js on Vercel

Import the repository and set:

```dotenv
API_URL=https://<your-api>.onrender.com
NEXT_PUBLIC_APP_URL=https://<your-app>.vercel.app
```

`API_URL` is used at build time (rewrites) and runtime (BFF), so redeploy after
changing it.

The browser only talks to the Vercel origin:

- `/api/*` → BFF proxy → Express
- `/uploads/*` → rewrite → Express

Because the API's `Set-Cookie` headers are copied by the BFF, the session
cookies live on the Vercel domain. **No shared parent domain or
`COOKIE_DOMAIN` is required.**

## 5. Smoke test

```bash
curl https://<your-api>.onrender.com/health
# {"status":"ok","db":"up",...}

curl -i https://<your-app>.vercel.app/login
# 200 text/html

curl -i -c cookies.txt -X POST https://<your-app>.vercel.app/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"you@bicol-u.edu.ph","password":"…"}'
# 200 + two Set-Cookie headers
```

Then in a browser:

1. Register a test student and confirm the OTP arrives in the Gmail inbox.
2. Verify the account, browse, create a listing with a photo, edit it, mark it
   sold, comment, and save a wishlist item.
3. Sign in as the admin and check the moderation pages.
4. Suspend and reinstate the test student.

## 6. Operational notes

- Rotate the imported development admin password before launch, or delete the
  imported accounts entirely.
- Keep `JWT_*` secrets stable; changing them invalidates every session.
- Supabase pauses free projects after a week of inactivity. `/health` reports
  `503` while paused; restore the project from the dashboard.
- Back up the database (Supabase → Database → Backups). `refresh_tokens` and
  `email_verification_codes` can be pruned periodically:

  ```sql
  delete from refresh_tokens where expires_at < now();
  delete from email_verification_codes where expires_at < now() - interval '7 days';
  ```

- Gmail refresh tokens for an OAuth app in *Testing* expire after 7 days. Publish
  the app (or use a Workspace-internal app) before the defense/demo, and test
  OTP delivery the morning of the demo.
- Cloudinary uploads use the `uniformity/<userId>/` folder prefix. Do not rename
  it without updating `userUploadFolder()` and the listing validator.
- If the API is unreachable, the BFF returns `502 API_UNREACHABLE` and the
  frontend redirects to login on the next guarded page.
