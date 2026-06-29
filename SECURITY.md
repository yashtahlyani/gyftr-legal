# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not open a public issue**.
Instead, email the maintainer with details and steps to reproduce. We aim to
acknowledge reports within a few business days.

## Handling secrets

This project never commits real credentials:

- All keys and tokens are read from environment variables. See `.env.example`
  for the full list. `.env.local` is gitignored and must never be committed.
- Server-side secrets (Claude API key, Adobe client secret) are set with
  `supabase secrets set` and are never exposed to the browser bundle.
- Client-side Google API keys must be **restricted by HTTP referrer** in the
  Google Cloud Console so they cannot be reused from other origins.

## If a secret is ever exposed

Rotate it immediately — removing it from the code or git history is not enough,
because anything pushed to a remote should be considered compromised:

1. Revoke/regenerate the key in the relevant provider console
   (Google Cloud, Supabase, OpenAI, Adobe).
2. Update the value in your local `.env.local` and in deployment secrets.
3. Confirm the old key no longer works.
