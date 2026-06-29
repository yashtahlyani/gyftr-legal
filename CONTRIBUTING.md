# Contributing

Thanks for your interest in improving the GyfTR Legal Portal.

## Getting started

1. Fork and clone the repo.
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in your Supabase keys.
4. `npm run dev` and open http://localhost:5173

## Workflow

- Create a feature branch off `main`: `git checkout -b feat/short-description`
- Keep commits small and focused. Use clear, imperative commit messages
  (e.g. `Add reminder email template`, `Fix draft upload race condition`).
- Run `npm run build` before opening a PR to make sure the production build
  still compiles.
- Open a pull request against `main` and describe what changed and why.

## Code style

- ES modules, no framework — keep dependencies minimal.
- Data access lives in `src/data/`, UI logic in `src/ui/`, auth in `src/auth/`.
- Never commit secrets. `.env.local` is gitignored; use `.env.example` to
  document new variables.

## Reporting issues

Open an issue with steps to reproduce, expected vs. actual behaviour, and
browser/console output where relevant.
