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
Browser  ──>  ALB ──>  ECS: frontend container  (Vite build served by `serve`, port 7979)
Browser  ──>  ALB ──>  ECS: backend container   (Express API, port 7978)  ──>  RDS Postgres (private)
                                                                           └─>  S3 (private, draft files)
Browser  ──>  Cognito  (login — returns a JWT the frontend sends on every API call)
Express API  ──>  OpenAI (AI clause risk analysis — unrelated 3rd party, unchanged)
Express API  ──>  Adobe Sign (e-signature — unrelated 3rd party, unchanged)
```

Both the frontend and backend are Docker containers built by
`frontend/buildspec.yml` / `backend/buildspec.yml` and run on ECS — **not**
S3 + CloudFront and **not** EC2 + PM2 (that was the original plan; see the
banner at the top of `infra/aws-setup.md`). `DEPLOY.md` is the current
operational runbook.

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

npm run install:all      # frontend + backend + scripts
```

### 2. Provision AWS

RDS, Secrets Manager, Cognito, and the private drafts S3 bucket: follow
`infra/aws-setup.md` §1–4. For compute/hosting, the real setup is ECS
containers behind an ALB, not the EC2/S3+CloudFront in that doc's later
sections — see `DEPLOY.md` and the `buildspec.yml`/`Dockerfile` in each of
`backend/` and `frontend/` for what's actually there.

### 3. Database schema

The migration off the old stack is **done** and the import script has been
removed — the portal is AWS-only, and there is no data to bring across any
more. `backend/schema.sql` is applied automatically when the API starts; it is
idempotent, so restarting is always safe.

`backend/seed.sql` runs right after it, also automatically, also idempotent —
it's just the 4 real profiles (see §4 below), not agreement data. It's the
thing that makes a brand-new RDS instance immediately loggable-into once
Cognito accounts exist, with no manual SQL step.

`backend/seed-demo.sql` is separate and **not** auto-applied: it's a handful
of fake sample agreements for clicking around a fresh dev/staging database.
Run it by hand only, and never against anything holding real agreements —
see the warning at the top of the file for why.

If you ever need the historical importer, it is in git history
(`git log --diff-filter=D -- scripts/migrate-db.js`).

### 4. Create Cognito accounts for the 4 real users

```bash
cd scripts
export COGNITO_USER_POOL_ID=<from Cognito console>
export AWS_REGION=ap-south-1
npm run create-cognito-users
```

Each user gets a **random** temporary password, printed as it runs. Capture
that output — it is the only copy. If you would rather everyone share one
temporary password, run `npm run force-password-reset` afterwards instead.

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

**Passwords — read this before telling anyone what theirs is.**

There are two different temporary passwords in play, and confusing them wastes
a lot of time:

| How the account was set up | Password |
|---|---|
| `scripts/create-cognito-users.js` | a **random** one per user (`Gy!xxxxxxT1`), printed to the terminal when the script ran |
| `scripts/force-password-reset.js` | **`Default@123`** for everyone (override with `TEMP_PASSWORD`) |

So `Default@123` only works **after** `force-password-reset.js` has been run
**on that specific account**. On a pool where accounts were created and never
reset, it will be rejected — and because Cognito collapses the error, it
looks identical to a wrong password. If the random passwords from the
original run are lost, that is the normal situation, and the fix is to reset
everyone:

```bash
cd scripts
npm run force-password-reset -- --dry-run   # see who would be reset
npm run force-password-reset                # CONFIRMED accounts → Default@123, must change on next login
```

**Brand-new accounts need `--all`.** The plain command above skips anyone
already in `FORCE_CHANGE_PASSWORD` — which is exactly the status
`create-cognito-users.js` puts every new account into (each with its own
random password, not `Default@123`). Running the plain command again after
creating new users looks like it worked ("Done. Reset: N") but silently
excludes them, and `Default@123` will still fail for those specific people.
Use `--all` to also catch them:

```bash
npm run force-password-reset -- --all
```

This is what actually gets a newly-created user onto the shared temp
password — not the plain command.

Either way the account lands in `FORCE_CHANGE_PASSWORD`, so the portal prompts
for a new password on first login and no shared password survives.

**Before assuming the password is wrong**, check what Cognito actually says —
"Incorrect email or password" is also what it returns when the account does not
exist in the pool the frontend is built against:

```bash
cd scripts
npm run check-login -- --email <email> --password '<password>'   --pool <pool-id> --client <client-id>
```

To reset one person: `npm run force-password-reset -- --only=<email>`, or from
the Cognito console → User pools → Users → (user) → Reset password.

**Demo mode is development-only.** The 4 role pills on the login page log in
with sample data and no password, but that path is now gated on
`import.meta.env.DEV`, so `vite build` compiles it out completely and it does
not exist in the deployed portal. Use `npm run dev` locally if you want it.

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
| Add/remove a user | Add a `profiles` row (`insert into profiles (email, name, role, team_code) values (...)`), then re-run `scripts/create-cognito-users.js` — it only processes rows without a `cognito_sub` |
| Change what a role can do | `backend/authz.js` — one function per rule, all in one file |
| Add a new API field to an existing table | `schema.sql` runs on every boot, but `CREATE TABLE IF NOT EXISTS` doesn't add columns to a table that already exists — so add the column there **and** run the matching `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` by hand once against the live RDS DB, then thread it through the relevant `backend/routes/*.js` and `frontend/src/lib/api.js` |
| Add a new table | Just add it to `schema.sql` (with `IF NOT EXISTS`) and deploy — the next boot creates it automatically, no manual step |
| Add a new table/resource | New file in `backend/routes/`, register it in `backend/server.js`, add the matching functions to `frontend/src/lib/api.js` |
| Reminders | Persisted. `sendNudge` calls `sendReminder()`; a failure is queued in `frontend/src/lib/writeQueue.js` and replayed on the next successful load. |
| Drafts | Persisted. `addDraft` calls `addDraftNote()` and rolls the row back on failure, queueing it for retry. File upload via `uploadDraft()` exists but the Drafts modal only collects date/direction/note. |
| Change the AI model/prompt | `backend/routes/ai-analyze.js` (this is what's live). The old Supabase Edge Functions are deleted; the unported Claude-based prompt is kept at `docs/reference/analyse-drafts-unported.ts` |
| Rotate the OpenAI/Adobe keys | Update the backend task's environment (Secrets Manager entry or task-definition env var, however it's wired) and force a new ECS deployment of the backend service — see `DEPLOY.md` §1 |
| Rotate DB credentials | Update the `gyftr/legal/db` secret in Secrets Manager — the backend re-reads it on every restart, no code change needed |

---

## Decisions made during the migration (and why)

- **Demo-mode login was kept for development only.** It was originally left
  enabled in production on the grounds that it only shows sample data. That was
  wrong on two counts: entering any address in `DEMO_EMAILS` with any password
  logged you into the portal without Cognito, and `app-logic.js` reads
  `demo_role` directly — when set, creating an agreement shows a success toast
  and never writes to the server, so a stale flag silently discarded a real
  user's work. It is now compiled out of production builds.
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
  `frontend/src/lib/api.js`.
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
unset, every `fetch` in `frontend/src/lib/api.js` fails silently for real accounts
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

**API is up but the portal doesn't work — database not ready**
The backend no longer crashes or fails to start when RDS is unreachable —
it stays up and keeps retrying in the background, so `pm2`/ECS-style
"is it running" checks aren't enough on their own. Check
`GET /health/deep` — `{"ok":true,"database":"reachable"}` means it's fine,
anything else means it's still retrying and says why. Check the backend
task's IAM role has `secretsmanager:GetSecretValue` on `gyftr/legal/db`
(or the `DB_*` env vars are set directly), and that the RDS security group
allows inbound 5432 from the backend service's security group. `scripts/doctor.js`
walks this exact chain from the outside with no AWS credentials needed.

**Draft upload/view fails with an S3 error**
Check the backend task's IAM role has `s3:GetObject`/`s3:PutObject` on
`arn:aws:s3:::gyftr-legal-drafts/*`, and that `DRAFTS_BUCKET` in the
backend's environment matches the real bucket name.

---

## Support

Questions about the pre-migration app itself (features, screens, business
logic): see `docs/KT.md`. Questions about this AWS migration specifically:
this document and `infra/aws-setup.md` are the source of truth going
forward — update them when the architecture changes, don't let them drift.
