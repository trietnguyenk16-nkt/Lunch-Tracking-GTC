# Database and Vercel Deployment

## Current deployment boundary

The repository now contains the PostgreSQL schema, initial migration, deterministic seed, and a Vercel-compatible `/api/health` function. Production provisioning and deployment still require access to a PostgreSQL provider and a Vercel project; no database or Vercel credentials are committed to the repository.

## Database setup without Docker

Create a PostgreSQL database with a managed provider such as Supabase, Neon, or another PostgreSQL service. Copy `.env.example` to `.env` and replace the placeholder values with the provider's connection strings:

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

Use the provider's pooled/runtime connection for `DATABASE_URL` and its direct connection for `DIRECT_URL`. The schema uses integer minor-unit amounts and explicit currency codes. Historical expenses and payments use restrictive foreign keys so they cannot be deleted accidentally through a related employee deletion.

## Production database

Create a managed PostgreSQL database, preferably Supabase PostgreSQL as specified by the project brief. Configure `DATABASE_URL` with the provider's pooled/runtime connection and `DIRECT_URL` with the direct connection used for migrations. Add both values to the Vercel project environment settings for Preview and Production; do not put them in Git or in `vercel.json`.

Review the SQL migration in `prisma/migrations/20260813000000_init/migration.sql` before production use. Apply it through the CI or release environment with `npm run db:migrate`. Production migration execution must be explicit and must not use `prisma migrate reset`.

## Vercel deployment — manual user step

This is the remaining user-executed deployment step. Log in to Vercel, link this repository to the intended Vercel project, configure the database environment variables, deploy, and verify the health endpoint.

### Step 1: Authenticate and link the project

```bash
npx vercel@latest login
npx vercel@latest link
```

Select the correct Vercel team and project when prompted. If the project does not exist, allow Vercel to create it from the repository.

### Step 2: Configure environment variables

Add `DATABASE_URL` and `DIRECT_URL` in the Vercel project settings for both **Preview** and **Production**. Use the managed PostgreSQL provider's pooled/runtime URL for `DATABASE_URL` and its direct migration URL for `DIRECT_URL`. Do not commit these values.

### Step 3: Deploy and run the migration

After authenticating the Vercel CLI or connecting the Git repository in the Vercel dashboard:

```bash
npx vercel link
npx vercel env add DATABASE_URL preview
npx vercel env add DIRECT_URL preview
npx vercel env add DATABASE_URL production
npx vercel env add DIRECT_URL production
npx vercel --prebuilt
npx vercel --prod
```

The project build command is `npm run build`. The health check is `GET /api/health`.

### Step 4: Verify the deployment

Open the deployment URL and confirm that `/api/health` returns HTTP 200 with `ok: true` and `database: "connected"`. If the check fails, inspect Vercel function logs and confirm both database variables are configured in the environment associated with the deployment.

### Step 5: Record completion

After verification, paste the production URL, deployment ID, and health-check result into issue #12, then check off the deployment acceptance criteria. It returns HTTP 200 only when the database connection is configured and responds to `SELECT 1`; missing or unavailable database configuration returns HTTP 503.

## Smoke test and rollback

After deployment, request `/api/health` from the deployment URL and verify the JSON response reports `ok: true` and `database: "connected"`. Then run the application-level settlement read path once the API route is connected to the persisted ledger.

Vercel rollback should use the previous known-good deployment. Database rollback should use a reviewed forward migration rather than destructive reset operations. Any migration that changes historical expense or payment semantics requires an explicit data migration review before release.

## Manual access required

The remaining manual steps are provider-account authentication, creation of the managed PostgreSQL project, insertion of environment variables into Vercel, approval of the first production migration, and deployment from the Vercel project. These operations cannot be completed safely without the user's provider access and production project selection. Docker is not required.
