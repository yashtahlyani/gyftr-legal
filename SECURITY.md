# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not open a public issue**.
Instead, email the maintainer with details and steps to reproduce. We aim to
acknowledge reports within a few business days.

## Handling secrets

This project never commits real credentials:

- All keys and tokens are read from environment variables. See
  `.env.example` (frontend) and `backend/.env.example` (backend) for the
  full list. `.env.local` and `backend/.env` are gitignored and must never
  be committed.
- Server-side secrets (OpenAI key, Adobe client secret, RDS credentials) live
  in `backend/.env` on the EC2 instance, or in AWS Secrets Manager
  (`gyftr/legal/db` — see `infra/aws-setup.md` §2), and are never exposed to
  the browser bundle.
- Client-side Google API keys must be **restricted by HTTP referrer** in the
  Google Cloud Console so they cannot be reused from other origins.
- Database authorization is enforced entirely in `backend/authz.js` (RDS has
  no row-level security) — any new route touching the database must use it.

## If a secret is ever exposed

Rotate it immediately — removing it from the code or git history is not enough,
because anything pushed to a remote should be considered compromised:

1. Revoke/regenerate the key in the relevant provider console
   (Google Cloud, AWS, OpenAI, Adobe).
2. Update the value in your local `.env.local`/`backend/.env` and in AWS
   Secrets Manager / the EC2 instance's env file.
3. Confirm the old key no longer works.
