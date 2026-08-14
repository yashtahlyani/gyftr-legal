# AWS Setup Guide — GyfTR Legal Portal

Full migration from Vercel + Supabase to a self-hosted AWS stack.
**Region**: ap-south-1 (Mumbai) throughout, matching the sibling GyfTR Portal migration.

Target architecture: **S3 + CloudFront** (static frontend) → **ALB + EC2** running an
Express API → **RDS Postgres** (private) → **Cognito** (auth), with **Secrets Manager**
holding DB credentials, and a second private **S3** bucket for draft files.

---

## 1. RDS Postgres (replaces Supabase DB)

1. Go to **RDS → Create database**.
2. Engine: **PostgreSQL 16**, template: **Production** (this holds real legal data).
3. DB identifier: `gyftr-legal`, master username: `gyftr_admin`.
4. Instance: `db.t3.small` (bump up if the team grows).
5. VPC: default, **Public access: No** — only EC2 (via its security group) can reach it.
6. Create a security group `gyftr-legal-rds-sg` — inbound: PostgreSQL 5432 from `gyftr-legal-ec2-sg` only.
7. After creation, note the **Endpoint** (e.g. `gyftr-legal.xxxx.ap-south-1.rds.amazonaws.com`).
8. Connect via an EC2 bastion or SSH tunnel and run `backend/schema.sql` against it:
   ```bash
   psql "postgresql://gyftr_admin:<password>@<rds-endpoint>:5432/postgres" -f backend/schema.sql
   ```
   (Create the `gyftr_legal` database first if you didn't pick `postgres` as the default DB.)

---

## 2. AWS Secrets Manager (replaces .env / Supabase project settings)

1. Go to **Secrets Manager → Store a new secret**.
2. Type: **Other type of secret**.
3. Add key/value pairs:
   - `host` → RDS endpoint
   - `port` → `5432`
   - `dbname` → `gyftr_legal`
   - `username` → `gyftr_admin`
   - `password` → (your RDS password)
4. Secret name: `gyftr/legal/db`.
5. The backend reads this at startup via `AWS_SECRET_NAME=gyftr/legal/db` (see `backend/db.js`).

---

## 3. AWS Cognito (replaces Supabase Auth)

1. Go to **Cognito → Create user pool**.
2. Sign-in options: **Email**.
3. Password policy: minimum 8 chars, require uppercase + number + symbol.
4. MFA: optional (off for now, revisit given this holds legal agreement data).
5. User pool name: `gyftr-legal-users`.
6. App client name: `gyftr-legal-web`, type: **Public client**, no secret.
7. Note the **User Pool ID** (e.g. `ap-south-1_AbcXYZ`) and **Client ID**.
8. Put these in the frontend `.env.local`:
   ```
   VITE_COGNITO_USER_POOL_ID=ap-south-1_AbcXYZ
   VITE_COGNITO_CLIENT_ID=...
   ```
   and the same two (plus `COGNITO_REGION=ap-south-1`) in `backend/.env`.
9. **Create the 4 real users**: run `migration/create-cognito-users.js` (see §8) —
   it creates one Cognito account per `profiles` row and links it back via
   `cognito_sub`, rather than creating them by hand in the console.

---

## 4. S3 — draft files (replaces the Supabase Storage `legal-drafts` bucket)

1. Go to **S3 → Create bucket**: `gyftr-legal-drafts`.
2. Keep **Block all public access ON** — this bucket is private; the backend
   hands out short-lived presigned URLs (see `backend/s3.js`).
3. No bucket policy needed beyond the default (private) — access is via the
   EC2 instance's IAM role (see §5 step 5) using the AWS SDK, not a public URL.
4. Set `DRAFTS_BUCKET=gyftr-legal-drafts` in `backend/.env`.

---

## 5. EC2 (runs the Express backend)

1. Go to **EC2 → Launch instance**.
2. AMI: **Amazon Linux 2023**, instance type: `t3.small`.
3. Key pair: create `gyftr-legal-key` and download the `.pem`.
4. Security group `gyftr-legal-ec2-sg`: inbound port 7978 from the ALB's security group, port 22 from your IP only.
5. IAM role: create role `gyftr-legal-ec2-role` with policies:
   - A custom policy scoped to `secretsmanager:GetSecretValue` on `gyftr/legal/db`
   - A custom policy scoped to `s3:GetObject`, `s3:PutObject` on `arn:aws:s3:::gyftr-legal-drafts/*`
6. Assign the IAM role to the EC2 instance.
7. SSH in and run:
   ```bash
   sudo dnf install -y nodejs git
   git clone <repo> /app/gyftr-legal
   cd /app/gyftr-legal/backend
   npm install
   # Create /app/gyftr-legal/backend/.env — see backend/.env.example.
   # At minimum:
   #   PORT=7978
   #   AWS_SECRET_NAME=gyftr/legal/db
   #   AWS_REGION=ap-south-1
   #   COGNITO_USER_POOL_ID=ap-south-1_AbcXYZ
   #   COGNITO_CLIENT_ID=...
   #   COGNITO_REGION=ap-south-1
   #   DRAFTS_BUCKET=gyftr-legal-drafts
   #   FRONTEND_URL=https://legal.your-domain.example
   #   OPENAI_API_KEY=...
   #   ADOBE_CLIENT_ID=...
   #   ADOBE_CLIENT_SECRET=...
   node server.js
   ```
8. Use **PM2** to keep it running:
   ```bash
   npm install -g pm2
   pm2 start server.js --name gyftr-legal-api
   pm2 startup && pm2 save
   ```

---

## 6. Application Load Balancer (HTTPS for the API)

1. Go to **EC2 → Load Balancers → Create ALB**.
2. Name: `gyftr-legal-api-alb`, scheme: **Internet-facing**.
3. Listener: HTTPS 443 (attach an ACM certificate for `api.legal.your-domain.example`).
4. Target group: `gyftr-legal-api-tg`, protocol HTTP, port 7978, health check path `/health`, target: the EC2 instance.
5. In Route53 (or your DNS): add `api.legal.your-domain.example` CNAME → ALB DNS name.
6. Set `VITE_API_URL=https://api.legal.your-domain.example` in the frontend `.env.local`.

---

## 7. S3 + CloudFront (hosts the frontend)

1. Go to **S3 → Create bucket**: `gyftr-legal-frontend`.
2. Keep **Block all public access ON** — served via CloudFront's Origin Access Control only.
3. Build the frontend:
   ```bash
   cd /path/to/gyftr-legal
   npm install
   npm run build   # outputs to dist/
   ```
4. Upload `dist/` to S3:
   ```bash
   aws s3 sync dist/ s3://gyftr-legal-frontend/ --delete
   ```
5. Go to **CloudFront → Create distribution**:
   - Origin: `gyftr-legal-frontend.s3.ap-south-1.amazonaws.com`
   - Origin access: **Origin Access Control (OAC)** — let CloudFront auto-create the bucket policy.
   - Viewer protocol: Redirect HTTP → HTTPS.
   - Default root object: `index.html` (the login page).
   - Custom error response: since this is a static multi-page app (not a
     client-side router), you generally don't need a catch-all → index.html
     rewrite the way a React Router SPA would — `index.html` and `app.html`
     are both real files in `dist/`.
   - Attach an ACM certificate for `legal.your-domain.example`.
6. In Route53: add `legal.your-domain.example` CNAME → CloudFront domain.

---

## 8. Migrate data from Supabase → RDS

Run the RDS schema first (§1 step 8), then:

```bash
cd migration
npm install

export SUPABASE_URL=https://aiaeruajrbrxkoaqzdpp.supabase.co
export SUPABASE_PAT=<your-supabase-personal-access-token>   # set in your shell only, never in a file
export RDS_HOST=gyftr-legal.xxxx.ap-south-1.rds.amazonaws.com
export RDS_USER=gyftr_admin
export RDS_PASSWORD=<rds-password>
export RDS_DB=gyftr_legal
export DRAFTS_BUCKET=gyftr-legal-drafts
# AWS credentials for the S3 file-copy step — same as any AWS CLI usage:
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=ap-south-1

node migrate-db.js
```

This copies every agreement, draft (row + file), team status, remark,
history entry, clause, clause change, reminder, signature, and profile —
preserving every ID. **Safe to re-run** — every insert is `ON CONFLICT DO
NOTHING`, so a second run just skips rows that already made it across.

Then create Cognito accounts and link them:

```bash
export COGNITO_USER_POOL_ID=ap-south-1_AbcXYZ
export AWS_REGION=ap-south-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
# RDS_* vars from above still apply

node create-cognito-users.js
```

This creates one Cognito account per row in `profiles` that doesn't already
have a `cognito_sub`, and writes the returned `sub` back into that row. It
prints a temporary password per user — each must set their own password on
first login (nobody gets a shared default password, since this holds real
legal-agreement access). Re-run any time new people join; it skips everyone
already linked.

Finally, verify the deploy:

```bash
export SMOKE_API_URL=https://api.legal.your-domain.example
export SMOKE_TOKEN=<a real Cognito ID token — see migration/smoke-test.js for how to get one>
node smoke-test.js
```

---

## 9. Deploy updates

**Backend** (on EC2):
```bash
cd /app/gyftr-legal && git pull
cd backend && npm install
pm2 restart gyftr-legal-api
```

**Frontend** (from your laptop):
```bash
npm run build
aws s3 sync dist/ s3://gyftr-legal-frontend/ --delete
aws cloudfront create-invalidation --distribution-id <CF_ID> --paths "/*"
```

---

## 10. Environment variables summary

| Variable | Where | Value |
|---|---|---|
| `VITE_API_URL` | Frontend `.env.local` | `https://api.legal.your-domain.example` |
| `VITE_COGNITO_USER_POOL_ID` | Frontend `.env.local` | From Cognito console |
| `VITE_COGNITO_CLIENT_ID` | Frontend `.env.local` | From Cognito console |
| `VITE_OPENAI_API_KEY` | Frontend `.env.local` | Optional client-supplied fallback (see `backend/.env` `OPENAI_API_KEY` instead) |
| `VITE_GOOGLE_*` | Frontend `.env.local` | Unrelated to this migration — same Google Drive/Docs/Picker keys as before |
| `PORT` | Backend `.env` | `7978` |
| `AWS_SECRET_NAME` | Backend `.env` | `gyftr/legal/db` |
| `AWS_REGION` | Backend `.env` | `ap-south-1` |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` / `COGNITO_REGION` | Backend `.env` | Same as frontend |
| `DRAFTS_BUCKET` | Backend `.env` | `gyftr-legal-drafts` |
| `FRONTEND_URL` | Backend `.env` | `https://legal.your-domain.example` (CORS) |
| `OPENAI_API_KEY` | Backend `.env` | AI clause analysis (unrelated to this migration, kept as-is) |
| `ADOBE_CLIENT_ID` / `ADOBE_CLIENT_SECRET` | Backend `.env` | E-signature (unrelated to this migration, kept as-is) |

---

## 11. Key files reference

| File | Purpose |
|---|---|
| `backend/server.js` | Express app entry point |
| `backend/db.js` | RDS connection pool + Secrets Manager loader |
| `backend/s3.js` | Draft file upload / presigned URL helpers |
| `backend/middleware/auth.js` | Cognito JWT verification |
| `backend/middleware/loadProfile.js` | Loads the profiles row for the authenticated Cognito user |
| `backend/authz.js` | Server-side authorization — 1:1 port of every old Supabase RLS policy |
| `backend/routes/*.js` | REST API, one file per resource |
| `backend/schema.sql` | Plain Postgres schema for RDS (no RLS, no `auth.users` FK) |
| `src/lib/api.js` | Frontend API client (fetch wrapper + row→portal-format mapper) |
| `src/lib/auth-cognito.js` | Cognito login/session (real-account login path) |
| `migration/migrate-db.js` | One-time (re-runnable) Supabase → RDS data copy |
| `migration/create-cognito-users.js` | Creates + links a Cognito account per real user |
| `migration/smoke-test.js` | Post-deploy verification |
| `infra/HANDOVER.md` | Plain-language overview, login info, common changes, troubleshooting |
