# OnSite

OnSite is a mobile-first construction management web app, installable on Android and Apple devices as a Progressive Web App (PWA). The current production foundation replaces the local-storage prototype with PostgreSQL, Better Auth, server-side authorization, and a VPS deployment path.

## Current product scope

Implemented in the current vertical slice:

- Account registration, email verification, sign-in, sign-out, and password reset.
- Company onboarding with plan selection, a 14-day trial, and displayed pricing; billing collection is not enabled.
- Project creation/listing, project membership, invitations, and invitation acceptance.
- Protected responsive workspace with role-filtered project sections and project membership checks on server reads and writes.
- Project workflows for task statuses, project stages/dependencies, material balances, budgets/fund releases/site cash, supplier directory, site diaries/issues/attendance, gate entries, and project zones.
- Audit events for project record changes.
- Static offline fallback that does not cache private or authenticated responses.

Several reference workflows still need implementation or external services: purchase orders and delivery/approval tracking, vendor order/invoice/payment workflows, the complete finance chain, file uploads, interactive zone maps, and SMS verification. Documents currently have metadata-only screens and no upload/download controls. The 14-day trial does not collect card details or initiate charges. This is an in-progress product foundation, not a claim that the complete v3.1 design has shipped.

## Requirements

- Node.js 22 (matches the production Docker image)
- npm
- PostgreSQL 17 for local development

## Local development

1. Copy `.env.example` to `.env`.
2. Set `APP_ORIGIN` to `http://localhost:3000`, configure a local `DATABASE_URL`, and set a random `BETTER_AUTH_SECRET` of at least 32 characters.
3. Configure SMTP credentials to deliver emails to an inbox, or leave `SMTP_HOST` blank to preview their links in the local dev terminal.
4. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   npm run db:generate
   ```

5. Apply development migrations and start Next.js:

   ```bash
   npm run db:migrate
   npm run dev
   ```

The app is available at [http://localhost:3000](http://localhost:3000). `npm test` runs the focused validation and request-guard tests; `npx tsc --noEmit` runs the TypeScript check.

For local-only testing, leave `SMTP_HOST` blank; verification and reset links are printed to the development terminal. This fallback is disabled in production, where SMTP must be configured.

To populate a disposable demo workspace after migrations are applied, run this in PowerShell:

```powershell
$env:ENABLE_DEMO_SEED = "true"
npm run db:seed
```

Sign in with `demo@onsite.test` and `OnSiteDemo!2026`. Set `DEMO_ACCOUNT_PASSWORD` before running the seed if you want a different password. The seed is disabled in production and requires the explicit `ENABLE_DEMO_SEED=true` opt-in. It resets only the reserved demo project and its audit history on each run; use it only with a development/test database, never a production database.

## Database migrations

`npm run db:migrate` applies development migrations to the database selected by `DATABASE_URL`; do not run it until that URL points to the intended development database. For production, use `npm run db:deploy` after reviewing and backing up the target database. The current migration set includes the initial schema, the Better Auth rate-limit timestamp correction, and subscription/trial tables. After adding migrations, stop any running development server before regenerating Prisma or starting another build process.

## Security and data boundaries

- Better Auth creates UUID identities. Company and project records are returned only after checking the signed-in user’s active memberships.
- Project invitations use random one-use tokens stored as hashes, expire after seven days, and require a verified account with the invited email address.
- Password reset links expire after 30 minutes and password resets revoke existing sessions.
- Request bodies are validated with strict Zod schemas; text fields are normalized and control characters removed. Passwords are intentionally preserved as entered.
- App middleware checks the configured host and request origin. The reverse proxy accepts the configured domain, overwrites forwarded client-IP headers, applies API/auth throttles, and returns JSON for API rate limits.
- The service worker caches only the static offline page; authenticated pages and project data are never cached.
- Database indexes are limited to membership, project-list, task, approval, report, attendance, issue, and inventory query paths.

## PWA installation

Open the deployed site in Chrome on Android or Safari on iOS and use the browser’s **Install app** / **Add to Home Screen** action. The PWA provides a responsive app shell and static offline fallback; native camera, push-notification, background-sync, and full offline data workflows are not included yet.

## Inputs needed to finish integrations

Choose and configure these providers on the VPS before enabling the related workflows:

- **Production email:** SMTP host, port, sender, and credentials for verification, reset, and invitation delivery.
- **Subscription billing:** choose Paystack or Flutterwave before implementing checkout, renewals, and verified payment webhooks.
- **Phone verification:** choose an SMS provider and supply its VPS-side credentials before enabling the phone-code onboarding shown in the reference.
- **Private files:** choose an S3-compatible private object store (for example, Cloudflare R2 or S3) before enabling document/photo uploads.
- **Deployment:** provide the production domain, VPS access/runtime details, and TLS certificate setup when ready to deploy.

Keep all credentials in the VPS `.env` or the provider's secret manager; do not send secrets in chat or commit them to the repository.

## VPS deployment

The deployment target is a Linux VPS with Docker Compose, a domain pointed at the server, and TLS certificates available under `/etc/letsencrypt/live/$APP_HOST/`.

1. Copy `.env.example` to `.env` on the VPS and set strong unique secrets, production `APP_ORIGIN`/`APP_HOST`, PostgreSQL credentials, and SMTP settings. Never commit `.env`.
2. Ensure the TLS certificate exists and the initial Nginx upstream file points to `server app-blue:3000;`.
3. Run the deployment from a Bash shell on the VPS:

   ```bash
   chmod +x deploy/blue-green-deploy.sh
   deploy/blue-green-deploy.sh 2026.01.0
   ```

The script builds versioned app and migration images, applies migrations, starts and health-checks the inactive color, switches the Nginx upstream, verifies the public health endpoint, and restores the previous upstream if verification fails. It keeps the old app container available for quick rollback.

Database migrations must remain additive and compatible with both app versions during a rollout. Blue-green rollback restores application traffic, not database schema state. Back up PostgreSQL before deployments and test restore procedures; this repository does not yet provision automated off-host backups.

## Useful commands

```bash
npm test
npx tsc --noEmit
npm run build
npm run db:generate
npm run db:migrate
npm run db:deploy
```
