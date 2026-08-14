# GyfTR Legal Portal

[![CI](https://github.com/yashtahlyani/gyftr-legal/actions/workflows/ci.yml/badge.svg)](https://github.com/yashtahlyani/gyftr-legal/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with Vite](https://img.shields.io/badge/built%20with-Vite-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![AWS](https://img.shields.io/badge/hosted%20on-AWS-FF9900.svg?logo=amazonaws&logoColor=white)](https://aws.amazon.com/)

Production legal agreement tracking portal — Vite frontend, Express API, self-hosted on AWS.

A lightweight, framework-free portal for tracking legal agreements, drafts,
remarks, team review status, reminders, and AI-assisted clause analysis.

![GyfTR Legal Portal dashboard](docs/screenshot.png)

> Dashboard: per-client agreement tracking with client/internal status,
> multi-team review state, draft counts, remarks, and one-click document access.

> **Migration note**: this app originally ran on Vercel + Supabase. It now
> runs on a self-hosted AWS stack (S3 + CloudFront, ALB + EC2, RDS Postgres,
> Cognito). See `infra/HANDOVER.md` for the full architecture and setup
> guide, and `docs/KT.md` for the original feature/screen-level writeup
> (still accurate — only the backend, auth, and hosting changed).

## Project Structure

```
gyftr-legal/
├── frontend/                   # Vite multi-page app (login + portal)
│   ├── Dockerfile              # builds the bundle, serves via nginx
│   ├── buildspec.yml           # CodeBuild → S3 + CloudFront
│   ├── nginx.conf
│   ├── index.html              # Login page
│   ├── app.html                # Main portal (all screens)
│   ├── vite.config.js
│   └── src/
│       ├── css/style.css
│       ├── data/sample.js      # Demo data (dev-only demo login)
│       ├── lib/
│       │   ├── api.js          # Backend API client
│       │   ├── auth-cognito.js # Cognito login/session
│       │   └── writeQueue.js   # Retries writes that failed to reach the API
│       ├── ui/                 # app-logic, ai-analyze, google-api, utils
│       ├── login.js            # Entry point → index.html
│       └── main.js             # Entry point → app.html
│
├── backend/                    # Express API
│   ├── Dockerfile
│   ├── buildspec.yml           # CodeBuild → ECR
│   ├── server.js
│   ├── db.js                   # RDS connection (Secrets Manager or env vars)
│   ├── s3.js                   # Draft file storage
│   ├── authz.js                # Authorization rules
│   ├── schema.sql              # Applied automatically on boot
│   ├── middleware/             # auth.js, loadProfile.js
│   └── routes/
│
├── scripts/                    # Operational AWS scripts
│   ├── audit-access.js         # who has what access (read-only)
│   ├── create-cognito-users.js
│   ├── force-password-reset.js
│   ├── migrate-email-domain.js # not needed: both email domains are accepted
│   └── smoke-test.js
│
├── infra/                      # aws-setup.md, HANDOVER.md
├── docs/                       # KT.md, reference/
├── docker-compose.yml          # Local stack: Postgres + API + UI
├── DEPLOY.md                   # Release runbook
└── .env.example                # docker-compose values only
```

## Setup — Step by Step

### Step 1 — Install dependencies
```bash
npm run install:all      # frontend + backend + scripts
```

### Step 2 — Create frontend/.env.local
```
VITE_API_URL=https://api.your-domain.example
VITE_COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your_cognito_client_id
```
No secrets here — `VITE_`-prefixed values are compiled into the public bundle.
Server-side keys (OpenAI, Adobe, DB) belong in `backend/.env`.
Get these from the AWS Cognito console and your backend's ALB/DNS — see
`infra/aws-setup.md` for full provisioning steps if none of this exists yet.

### Step 3 — Provision AWS + set up the database

Follow `infra/aws-setup.md` in order (RDS → Secrets Manager → Cognito → S3
drafts bucket → EC2 → ALB → S3 + CloudFront), then run `backend/schema.sql`
against RDS.

### Step 4 — Migrate or seed users

For a fresh environment, create the 4 team profiles directly in RDS and run
`scripts/create-cognito-users.js` to create their Cognito accounts. The
portal does not auto-create profiles: a Cognito user with no `profiles` row
gets a visible "No profile linked to this account" error rather than silently
being given default access.

To deploy a new release, follow **[`DEPLOY.md`](DEPLOY.md)**.

### Step 5 — Start dev server
```bash
npm run dev:frontend
```
Open http://localhost:5173. In development you can log in without any AWS
setup via the role pills on the login screen (Legal/Finance/Business/
Compliance) — local sample data only, no backend required. This is compiled
out of production builds.

### Step 6 — Run the backend locally (optional, for full-stack dev)
```bash
cp backend/.env.example backend/.env   # fill in RDS/Cognito/S3/OpenAI values
npm run dev:backend
```

Or run the whole stack (Postgres + API + UI) in containers:
```bash
cp .env.example .env && npm run docker:up    # UI on :8080
```

## Prototype vs Production Mode

**Demo mode** (role-picker login, no password) exists in `npm run dev` only.
It uses hardcoded sample data from `frontend/src/data/sample.js` and never touches the
real database. `vite build` strips it, so the deployed portal always requires a
real Cognito login. Both `@gyftr.net` and `@gyftr.com` addresses are accepted.

## APIs Used

| Service | Purpose | Setup |
|---------|---------|-------|
| AWS Cognito | Authentication | `infra/aws-setup.md` §3 |
| AWS RDS (Postgres) | Database | `infra/aws-setup.md` §1 |
| AWS S3 | Draft file storage + frontend hosting | `infra/aws-setup.md` §4, §7 |
| OpenAI | AI clause risk analysis | platform.openai.com |
| Adobe Sign API | Legal e-signatures | developer.adobe.com |

## Build for Production
```bash
npm run build
# Output in /dist — deploy to S3 + CloudFront, see infra/aws-setup.md §7
```
