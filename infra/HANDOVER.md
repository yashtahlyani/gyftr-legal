# GyfTR Legal Portal — Handover Guide

## What this is

An internal portal for GyfTR's Legal team (and Finance/Business/Compliance
stakeholders) to track legal agreements end-to-end: draft versions, per-team
review status, clause negotiation history, remarks, reminders, AI-assisted
clause risk analysis, and e-signature. Vite + vanilla JS frontend, no framework.

This portal was originally built on Vercel + Supabase. It has been migrated
to a self-hosted AWS stack — **no more external backend dependencies**. See
`docs/KT.md` in the repo root for a full pre-migration architecture writeup
(still accurate for the frontend screens/features themselves — only the
backend, auth, and hosting changed).

---

## Architecture, plain language

```
Browser  ──>  CloudFront + S3  (static frontend: index.html login, app.html portal)
Browser  ──>  ALB + EC2 (Express API)  ──>  RDS Postgres (private)
                                       └─>  S3 (private, draft files)
Browser  ──>  Cognito  (login — returns a JWT the frontend sends on every API call)
Express API  ──>  OpenAI (AI clause risk analysis — unrelated 3rd party, unchanged)
Express API  ──>  Adobe Sign (e-signature — unrelated 3rd party, unchanged)
```

The frontend never talks to the database directly anymore — every read/write
goes through the Express API, which is the **only** thing that holds
database credentials and enforces who's allowed to do what. See
"Authorization model" below.

---

## Step-by-step setup from scratch

### 1. Clone & install

```bash
git clone <repo-url> gyftr-legal
cd gyftr-legal

npm install                                    # frontend
cd backend   && npm install && cd ..           # backend
cd migration && npm install && cd ..           # migration scripts
```

### 2. Provision AWS

Follow **`infra/aws-setup.md`** in order: RDS → Secrets Manager → Cognito →
S3 (drafts bucket) → EC2 → ALB → S3 + CloudFront (frontend).

### 3. Database schema

The migration off the old stack is **done** and the import script has been
removed — the portal is AWS-only, and there is no data to bring across any
more. `backend/schema.sql` is applied automatically when the API starts; it is
idempotent, so restarting is always safe.

If you ever need the historical importer, it is in git history
(`git log --diff-filter=D -- migration/migrate-db.js`).

### 4. Create Cognito accounts for the 4 real users

```bash
export COGNITO_USER_POOL_ID=<from Cognito console>
export AWS_REGION=ap-south-1
node create-cognito-users.js
```

### 5–8. Configure envs, build, deploy

See `infra/aws-setup.md` §5–9 for exact commands.

---

## Login info

All 4 real accounts (seeded via the original `supabase/seed.sql`, now RDS `profiles` rows):

| Email | Name | Role | Team |
|---|---|---|---|
| nitin@gyftr.net | Nitin | Legal | L |
| neha@gyftr.net | Neha | Finance | F |
| pankaj.mehta@gyftr.net | Pankaj Mehta | Business | B |
| nikhil@gyftr.net | Nikhil | Compliance | C |

**Passwords**: each account got a random AWS-generated temporary password
from `create-cognito-users.js` — printed to the terminal when it ran (share
it with that person over a secure channel, not email/Slack in plaintext).
They must set their own password on first login (Cognito's standard
"new password required" flow). Nobody has a shared default password.

If you need to reset someone's password: **Cognito console → User pools →
gyftr-legal-users → Users → (user) → Reset password**, or:
```bash
aws cognito-idp admin-reset-user-password --user-pool-id <pool-id> --username <email>
```

**Demo mode still exists** — the 4 role pills on the login page (Legal /
Finance / Business / Compliance) log straight in with sample data and no
password, exactly like before the migration. This was kept intentionally
(see "Decisions made during the migration" below) — it's useful for demos,
but it never touches real RDS data, so don't confuse it with a real account
when troubleshooting "why don't I see the real agreements."

---

## Authorization model (read this before changing any route)

RDS has no row-level security — the Express backend is now the **only**
security boundary. `backend/authz.js` documents, policy by policy, how every
old Supabase RLS rule was ported:

- Any authenticated user (valid Cognito token + a linked `profiles` row) can
  **read** everything.
- Only `role = 'legal'` can create/update/delete agreements, change client
  status/dates, or upload drafts.
- Each team can only update **their own** `team_statuses` row; Legal can
  update any.
- Anyone authenticated can add remarks / reminders / history entries.

**One gap we found and deliberately did not replicate**: the old Supabase
schema had no RLS `UPDATE` policy on the `clauses` table at all, meaning the
Legal-only "set clause outcome" dropdown in the UI likely silently failed
against real Supabase (RLS defaults to deny with no matching policy). The
new `PATCH /api/clauses/:id/outcome` route requires `role = 'legal'` instead
— matching the UI's own restriction rather than reproducing a bug. See the
comment at the top of `backend/routes/clauses.js` for the full note.

---

## Common changes cookbook

| Task | Where |
|---|---|
| Add/remove a user | Add a `profiles` row (`insert into profiles (email, name, role, team_code) values (...)`), then re-run `migration/create-cognito-users.js` — it only processes rows without a `cognito_sub` |
| Change what a role can do | `backend/authz.js` — one function per rule, all in one file |
| Add a new API field to an existing table | Add the column in `backend/schema.sql` **and** run the matching `ALTER TABLE` on the live RDS DB (schema.sql itself isn't re-run on an existing DB), then thread it through the relevant `backend/routes/*.js` and `src/lib/api.js` |
| Add a new table/resource | New file in `backend/routes/`, register it in `backend/server.js`, add the matching functions to `src/lib/api.js` |
| Make "nudges" (reminders) persist across refresh | Currently reminders are DB-backed on the server (`backend/routes/reminders.js`, ported for RLS parity) but the frontend's `sendNudge` in `src/ui/app-logic.js` never calls it — same as before the migration. Wire it up by calling `sendReminder()` from `src/lib/api.js` inside `sendNudge` |
| Make drafts (Drafts modal) persist across refresh | Same situation — `backend/routes/drafts.js` + S3 storage exist and work, but `addDraft`/`toggleDraftDir` in `app-logic.js` are still local-only, matching pre-migration behavior. Wire `uploadDraft()`/`updateDraftDirection()` from `src/lib/api.js` in if/when you want real file persistence there |
| Change the AI model/prompt | `backend/routes/ai-analyze.js` (this is what's live) — `supabase/functions/ai-analyze` and `supabase/functions/analyse-drafts` (Claude-based) are old, unused, kept only for reference |
| Rotate the OpenAI/Adobe keys | Update `backend/.env` on the EC2 instance, then `pm2 restart gyftr-legal-api` |
| Rotate DB credentials | Update the `gyftr/legal/db` secret in Secrets Manager — the backend re-reads it on every restart, no code change needed |

---

## Decisions made during the migration (and why)

- **Demo-mode login was kept**, alongside real Cognito auth, per an explicit
  choice made during the migration — it bypasses auth entirely and only ever
  shows sample/local data, never real RDS data, so it's not a security hole
  against production data.
- **`api/ai-analyze.js` (the old Vercel Function) and
  `supabase/functions/sign-document`/`ai-analyze` (the old Supabase Edge
  Functions) were removed** and their logic ported into
  `backend/routes/ai-analyze.js` and `backend/routes/sign-document.js`.
  `supabase/functions/analyse-drafts` (a Claude-based clause-diff function)
  and the duplicate `supabase/functions/ai-analyze` were **not** ported —
  they were never called by any UI code path before the migration either
  (confirmed dead code — see `docs/KT.md` §6.5). Their source is still in
  the repo under `supabase/functions/` for reference if the Claude-based
  path is wanted later.
- **`/api/ai-analyze` is intentionally left unauthenticated** on the
  backend, matching the old Vercel Function (which had no auth check
  either) — this is also what lets demo-mode use AI analysis.
- **The dead/unused frontend modules were deleted**, not migrated:
  `src/lib/supabase.js`, `src/auth/login.js`, `src/auth/guard.js`, and every
  file in `src/data/` except `sample.js` were confirmed unused by the live
  app before the migration (the app called Supabase inline in
  `src/ui/app-logic.js` instead of through these modules — see `docs/KT.md`
  §6.5 item 4). They're gone now; all live data access goes through the new
  `src/lib/api.js`.
- **Supabase Realtime was not used anywhere** in the app (confirmed by
  search before starting), so there was nothing to replace with polling.
- **`profiles.email`** is a new column — the old Supabase `profiles` table
  didn't need one because it FK'd straight to `auth.users`, which has email
  natively. RDS has no such link, so email was pulled from Supabase's
  Admin Auth API during migration and is now a first-class column, alongside
  `cognito_sub` (nullable until `create-cognito-users.js` links it).

---

## Troubleshooting

**Frontend loads but every screen is empty / login redirects immediately**
Check `VITE_API_URL` in the frontend's build-time env — if it's wrong or
unset, every `fetch` in `src/lib/api.js` fails silently for real accounts
(demo mode will still work, since it never calls the API). Check the browser
console/network tab for the actual failing request.

**"No profile linked to this account" after a successful Cognito login**
The Cognito user exists but its email doesn't match a `profiles.email` row,
or `create-cognito-users.js` didn't finish linking `cognito_sub`. Check:
```sql
select email, cognito_sub from profiles where email = '<their email>';
```

**401 on every API call even with a valid-looking token**
`COGNITO_USER_POOL_ID`/`COGNITO_CLIENT_ID` on the backend must match the
frontend's exactly, and the token must be an **ID token**, not an access
token (`backend/middleware/auth.js` verifies with `tokenUse: 'id'`).

**Backend won't start — "DB not initialized"**
`backend/db.js` fails fast if it can't reach RDS or Secrets Manager. Check
the EC2 instance's IAM role has `secretsmanager:GetSecretValue` on
`gyftr/legal/db`, and that the RDS security group allows inbound 5432 from
the EC2 security group.

**Draft upload/view fails with an S3 error**
Check the EC2 IAM role has `s3:GetObject`/`s3:PutObject` on
`arn:aws:s3:::gyftr-legal-drafts/*`, and that `DRAFTS_BUCKET` in
`backend/.env` matches the real bucket name.

**Migration script fails at "Fetching auth.users via Admin API"**
`SUPABASE_PAT` needs Management API access on the source project, not just
a regular anon/service key. Generate one from Supabase → Account → Access
Tokens.

---

## Support

Questions about the pre-migration app itself (features, screens, business
logic): see `docs/KT.md`. Questions about this AWS migration specifically:
this document and `infra/aws-setup.md` are the source of truth going
forward — update them when the architecture changes, don't let them drift.
