# Changelog

All notable changes to this project are documented here. The format is based
on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `.env.example` documenting required environment variables.
- MIT `LICENSE`.
- `CONTRIBUTING.md` with setup and workflow guidelines.
- GitHub Actions CI workflow that installs dependencies and runs the build.

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
