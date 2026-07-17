# Pordee Deploy Notes

Phase 1 deploy target: **Dokploy** running the app as one Docker Compose
deployment, backed by **Postgres** in the same compose file.

Finance data and Better Auth both persist in Postgres. The app requires
`DATABASE_URL` to run; there is no SQLite file and no in-memory fallback.

## Local

```bash
pnpm install
# Postgres must be reachable at DATABASE_URL (see .env.example).
pnpm db:migrate            # apply finance migrations
pnpm dev                   # http://localhost:5173 (Vite)
pnpm build && pnpm start   # SSR runtime check on port 3000
```

Better Auth migrates its own tables (`user`, `session`, `account`,
`verification`) into the same Postgres on first request.

## Docker (local sanity check)

```bash
docker build -t pordee-app .
docker run --rm -p 3000:3000 \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  -e BETTER_AUTH_SECRET=replace-with-a-random-secret \
  -e DATABASE_URL=postgres://pordee:pordee@host.docker.internal:5432/pordee \
  -e CLOUDFLARE_TURNSTILE_ENABLED=false \
  pordee-app
```

The image no longer mounts a data volume — all state lives in Postgres.
PWA service worker is only emitted in production builds.

## Dokploy Docker Compose

Use one Dokploy **Compose** service for the whole stack. The compose file lives
at the repo root and builds the web image from `./app/Dockerfile`.

1. In Dokploy, create a Docker Compose service.
2. Point it at this repo and set **Compose Path** to `./docker-compose.yml`.
3. Add a domain in the Dokploy Domains tab and route it to service `web`, port
   `3000`.
4. Set these environment variables in the Compose service:

```bash
BETTER_AUTH_URL=https://your-pordee-domain.example
BETTER_AUTH_SECRET=<generate-a-long-random-secret>
POSTGRES_PASSWORD=<generate-a-long-random-db-password>

# Cloudflare Turnstile protects email/password login and signup.
# Production enables it automatically only when both keys are configured.
CLOUDFLARE_TURNSTILE_ENABLED=true
CLOUDFLARE_TURNSTILE_SITE_KEY=<cloudflare-turnstile-site-key>
CLOUDFLARE_TURNSTILE_SECRET_KEY=<cloudflare-turnstile-secret-key>

# Optional Google OAuth:
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Password reset email through a verified Resend sending domain:
RESEND_API_KEY=<resend-api-key>
AUTH_EMAIL_FROM=Pordee <no-reply@your-pordee-domain.example>

# Daily Check-in Web Push:
VAPID_PUBLIC_KEY=<public-vapid-key>
VAPID_PRIVATE_KEY=<private-vapid-key>
VAPID_SUBJECT=mailto:ops@your-pordee-domain.example
REMINDER_CRON_SECRET=<generate-a-long-random-secret>
```

The compose file derives `DATABASE_URL` internally as
`postgres://pordee:${POSTGRES_PASSWORD}@postgres:5432/pordee`, so do not point
the web app at a separate Dokploy Postgres service.

Finance migrations are applied by the app through `ensureFinanceDatabase()` on
first finance repository access. Better Auth tables migrate automatically on
auth requests through `ensureAuthDatabase()`.

Useful secret generation:

```bash
openssl rand -base64 32
```

## Cloudflare Turnstile

Turnstile is enforced on email/password login and signup before Better Auth is
called when both the site key and secret key are configured. Social login still
goes through the provider redirect flow.

The app accepts either the Pordee-prefixed env names above or the shorter
`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `TURNSTILE_ENABLED` aliases.

## Password Reset Email

The `/forgot-password` flow uses Better Auth reset tokens and sends the reset
link through Resend. Verify the sending domain in Resend first, then set
`RESEND_API_KEY` and `AUTH_EMAIL_FROM` in the Dokploy Compose environment.
`BETTER_AUTH_URL` must remain the public HTTPS app URL so reset links return to
the correct Pordee deployment. Reset tokens expire after one hour and a
successful reset revokes the user's existing sessions.

## Daily Check-in Web Push

Generate one durable VAPID key pair locally. Do not generate a new pair on each
deploy because existing browser subscriptions are bound to the public key.

```bash
pnpm exec web-push generate-vapid-keys --json
openssl rand -base64 32 # REMINDER_CRON_SECRET
```

Add the four push variables above to the Dokploy Compose environment and
redeploy. Pordee keeps account-level reminder time/preferences in Postgres and
stores each browser subscription separately. The default is 20:00 in
`Asia/Bangkok`; the scheduler skips a user after any transaction on that local
date and creates a unique daily run so overlapping jobs cannot send twice.
Disabling the account-level reminder revokes every stored device subscription;
re-enabling connects only the device where the user grants permission again.
Each account is capped at five active devices and test sends are rate-limited.

Configure a Dokploy scheduled HTTP task to run every five minutes:

```bash
curl --fail --silent --show-error \
  --request POST \
  --header "Authorization: Bearer $REMINDER_CRON_SECRET" \
  https://your-pordee-domain.example/api/cron/daily-reminders
```

Keep the secret in the Authorization header, never in the URL. The endpoint
fails closed when the secret is missing, accepts only POST, and returns aggregate
counts without subscription endpoints or user data.

Web Push requires HTTPS outside localhost. On iOS/iPadOS 16.4+, users must add
Pordee to the Home Screen and launch the installed app before enabling
notifications. Permission is requested only after the user presses Enable.

For local development, keep `CLOUDFLARE_TURNSTILE_ENABLED=false`, or use
Cloudflare's test credentials:

```bash
CLOUDFLARE_TURNSTILE_ENABLED=true
CLOUDFLARE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
CLOUDFLARE_TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

If a Content Security Policy is added later, allow
`https://challenges.cloudflare.com` for Turnstile scripts, frames, and
connections.

## Deploy Readiness Notes

- Use Docker Compose type, not static build.
- Keep the Compose Path at `./docker-compose.yml`; the compose file handles the
  `./app` build context.
- Keep replicas at `1` (a single connection pool per instance; multi-instance
  pool tuning is out of scope for Phase 1).
- After changing env vars or domain settings, redeploy the app.

## CI

GitHub Actions config lives at `.github/workflows/ci.yml` (repo root, not
inside `app/`). It runs from the `app/` working directory on every PR/push
to `main`:

- typecheck, lint, `format:check`, vitest (unit)
- `db:migrate` + integration tests against a `postgres:16` service
- build
- Playwright smoke (chromium) in a separate job, also against Postgres

CI activates as soon as the repo is pushed to GitHub. Dokploy deploy is
independent — it pulls from the same repo but does not require CI to pass.
