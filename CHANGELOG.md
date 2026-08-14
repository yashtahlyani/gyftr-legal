# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Self-hosted AWS backend (`backend/`): Express API on EC2, RDS Postgres, S3
  for draft files, Cognito for auth, Secrets Manager for DB credentials.
  `backend/authz.js` ports every Supabase RLS policy 1:1 into server-side
  authorization, since RDS has no row-level security of its own.
- `scripts/` — one-time, idempotent Supabase → AWS migration scripts:
  `migrate-db.js` (data + draft files, preserves every ID),
  `create-cognito-users.js` (creates + links a Cognito account per real
  user), `smoke-test.js` (post-deploy verification).
- `infra/aws-setup.md` and `infra/HANDOVER.md` — full AWS provisioning
  guide and plain-language handover doc (architecture, login info, common
  changes, troubleshooting).
- `docs/KT.md` — pre-migration knowledge-transfer document (frontend
  screens/features still accurate; backend/deployment sections marked
  superseded by `infra/HANDOVER.md`).
- `.env.example` documenting required environment variables.
- MIT `LICENSE`.
- `CONTRIBUTING.md` with setup and workflow guidelines.
- GitHub Actions CI workflow that installs dependencies and runs the build.
- Issue and pull request templates.
- `SECURITY.md` with a vulnerability-reporting and secret-handling policy.

### Changed
- All Google credentials (API keys + OAuth client ID) now load from
  environment variables instead of being hard-coded.
- Migrated hosting and backend from Vercel + Supabase to a self-hosted AWS
  stack (S3 + CloudFront, ALB + EC2, RDS, Cognito). `src/lib/supabase.js`
  and every direct `supabase.from(...)`/`supabase.auth.*` call in the
  frontend were replaced with `src/lib/api.js` (fetch-based API client) and
  `src/lib/auth-cognito.js`.
- `README.md`, `.env.example`, and `.github/workflows/ci.yml` updated to
  reflect the new stack; CI now also syntax-checks `backend/`.

### Removed
- `api/ai-analyze.js` (Vercel Function) — logic ported to
  `backend/routes/ai-analyze.js`.
- Dead code confirmed unused before the migration: `src/lib/supabase.js`,
  `src/auth/login.js`, `src/auth/guard.js`, and every file in `src/data/`
  except `sample.js`.

### Security
- Removed hard-coded credentials from the source and rewrote git history so
  they no longer appear in any commit.
- Authorization is now enforced server-side in `backend/authz.js` (RDS has
  no row-level security), rather than relying on Postgres RLS policies.

## [1.0.0] - 2025-06-19

### Added
- Initial Vite + Supabase project scaffold.
- Supabase backend: `schema.sql`, `seed.sql`, and `analyse-drafts` /
  `sign-document` edge functions.
- Supabase client, auth flow (sign-in/sign-out + route guard), and base styles.
- Data layer modules: agreements, clauses, drafts, remarks, reminders,
  team status, and sample fixtures.
- UI layer: app logic, AI clause analysis, Google API integration, utilities.
- HTML entry points (`index.html`, `app.html`) and single-file prototype.
