# Contributing

Thanks for your interest in improving the GyfTR Legal Portal.

## Getting started

1. Fork and clone the repo.
2. `npm install`
3. Copy `.env.example` to `frontend/.env.local` and fill in your backend API URL and Cognito keys (or skip this and use demo-mode login for frontend-only work).
4. `npm run dev` and open http://localhost:5173

For backend changes: `cd backend && npm install`, copy `backend/.env.example` to `backend/.env` and fill in RDS/Cognito/S3 values, `npm run dev`. See `infra/HANDOVER.md` for the full setup.

## Workflow

- Create a feature branch off `main`: `git checkout -b feat/short-description`
- Keep commits small and focused. Use clear, imperative commit messages
  (e.g. `Add reminder email template`, `Fix draft upload race condition`).
- Run `npm run build` before opening a PR to make sure the production build
  still compiles.
- Open a pull request against `main` and describe what changed and why.

## Code style

- ES modules, no framework — keep dependencies minimal.
- Frontend: API calls live in `frontend/src/lib/api.js`, Cognito auth in
  `frontend/src/lib/auth-cognito.js`, UI logic in `frontend/src/ui/`.
- Backend: routes in `backend/routes/` (one file per resource), shared
  authorization rules in `backend/authz.js` — every route that reads/writes
  a table gated by role or team should use it rather than re-deriving the
  check inline.
- Never commit secrets. `frontend/.env.local`/`backend/.env` are gitignored; use the
  matching `.env.example` files to document new variables.

## Reporting issues

Open an issue with steps to reproduce, expected vs. actual behaviour, and
browser/console output where relevant.
