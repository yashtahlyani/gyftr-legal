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
├── frontend/                 # Vite app (+ Dockerfile, buildspec)
│   ├── index.html            # Login page
│   ├── app.html              # Main portal (all screens)
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── css/style.css
│       ├── lib/              # api.js, auth-cognito.js, writeQueue.js
│       ├── data/sample.js
│       ├── ui/               # app-logic, google-api, ai-analyze, utils
│       ├── login.js
│       └── main.js
├── backend/                  # Express API (+ Dockerfile, buildspec)
│   ├── server.js
│   ├── db.js
│   ├── s3.js
│   ├── authz.js
│   ├── middleware/
│   ├── routes/
│   └── schema.sql
├── docker-compose.yml
├── migration/                # Cognito / ops scripts
│   ├── create-cognito-users.js
│   ├── force-password-reset.js
│   ├── migrate-email-domain.js
│   └── smoke-test.js
├── infra/
│   ├── aws-setup.md
│   ├── HANDOVER.md
│   └── GYFTR-LEGAL-HANDOVER.md
└── package.json              # Convenience scripts (dev:frontend / dev:backend)
```

## Setup — Step by Step

### Step 1 — Install dependencies
```bash
npm run install:all
```

### Step 2 — Create frontend env
```bash
cp frontend/.env.example frontend/.env
```
```
VITE_API_URL=https://legal-api.gyftr.net
VITE_COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=your_cognito_client_id
```
Get these from the AWS Cognito console and your backend's ALB/DNS — see
`infra/aws-setup.md` for full provisioning steps if none of this exists yet.

### Step 3 — Provision AWS + set up the database

Follow `infra/aws-setup.md` in order (RDS → Secrets Manager → Cognito → S3
drafts bucket → EC2 → ALB → S3 + CloudFront). `backend/schema.sql` is applied
idempotently on API start.

### Step 4 — Migrate or seed users

For a fresh environment with no existing data, create the team profiles
directly in RDS and run `migration/create-cognito-users.js` to create their
Cognito accounts. See `infra/aws-setup.md` and `infra/HANDOVER.md`.

### Step 5 — Start frontend
```bash
npm run dev:frontend
```
Open http://localhost:7979. Demo-mode role pills work only in Vite **dev**
builds (`import.meta.env.DEV`) — production always uses Cognito.

### Step 6 — Run the backend locally
```bash
cp backend/.env.example backend/.env   # fill in RDS/Cognito/S3 values
npm run dev:backend                    # API on :7978
```

## Docker (both services)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: https://legal.gyftr.net (local `:7979`)
- Backend:  https://legal-api.gyftr.net (local `:7978`)

## Prototype vs Production Mode

**Demo mode** (role-picker login, no password) still exists for quick demos
— it uses hardcoded sample data from `src/data/sample.js` and never touches
the real database. Logging in with a real `@gyftr.net` email routes through
Cognito and the live backend instead.

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
