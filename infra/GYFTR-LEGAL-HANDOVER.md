GyFTR Legal Portal
Complete Setup, Deployment & Handover Guide

This document provides all the information required to set up, migrate, deploy, operate, and maintain the GyFTR Legal Portal.
It is intended to serve as a complete technical handover for the next developer or administrator responsible for the portal.
Please read the document completely before beginning the migration or deployment process.

---

## 1. Portal Overview

The GyFTR Legal Portal is an internal agreement-tracking platform used by the Legal, Finance, Business, and Compliance teams.

The portal enables team members to:
- Create and track legal agreements end-to-end (pending → review → final → closed / reopened)
- Track per-team (Legal/Finance/Business/Compliance) review status on each agreement
- Upload and compare draft versions, with document viewing/editing via Google Docs
- Track clause-by-clause negotiation history, with AI-assisted risk analysis
- Add remarks/comments and send reminders ("nudges")
- Maintain a full status-change audit history per agreement
- Run e-signature via Adobe Sign
- View a dashboard of bottlenecks, open clauses, and team turnaround

### Technology Stack
- Frontend: Vite + vanilla JavaScript (no framework)
- Backend: Node.js (Express)
- Database: PostgreSQL
- Authentication: AWS Cognito
- Backend Hosting: AWS EC2
- Frontend Hosting: AWS S3 + CloudFront
- Database Hosting: AWS RDS
- File Storage: AWS S3 (private bucket for draft files)
- Secrets Management: AWS Secrets Manager
- AI clause analysis: OpenAI (unrelated to this migration, kept as-is)
- E-signature: Adobe Sign (unrelated to this migration, kept as-is)

### Current State
At the time of handover:
- The application code is complete, including the AWS backend, migration scripts, and frontend rewiring.
- The source code is available on GitHub.
- Existing production data is stored in Supabase.
- The new backend uses PostgreSQL on AWS RDS.
- Authentication has moved from Supabase to AWS Cognito.
- The frontend is hosted using S3 and CloudFront.
- The backend API runs on EC2 behind an Application Load Balancer.
- A demo-mode login (role pills, sample data, no password) is intentionally kept for quick demos — it never touches real RDS data.
- The primary remaining task is to **provision the AWS resources**, **migrate the existing Supabase data**, and **deploy** the complete application — the code side of the migration is done.

---

## 2. Project Resources

**Git Repository**
https://github.com/yashtahlyani/gyftr-legal

**Existing System**
The current application data is stored in Supabase.
Supabase is required only during the migration process. Once the AWS deployment and data migration have been verified successfully, unnecessary Supabase credentials should be revoked.

---

## 3. Credentials & Security

Sensitive credentials should never be committed to GitHub or stored directly inside the application source code.

**Supabase Migration Credentials**

| Field | Value |
|---|---|
| Supabase Project URL | `https://aiaeruajrbrxkoaqzdpp.supabase.co` |
| Supabase Anon Key | *Get from Supabase Dashboard → Settings → API → Project API keys → `anon` `public`. Do not paste it into this document or any file committed to Git.* |
| Supabase Personal Access Token | *Generate from Supabase Dashboard → Account → Access Tokens when you're ready to run the migration. Set it only as a shell environment variable (`export SUPABASE_PAT=...`), never in a file.* |

The Personal Access Token is required only during database migration.
After migration has been completed and verified, delete the token from:
**Supabase Dashboard → Account → Access Tokens**

**Important**
Store production credentials securely using:
- AWS Secrets Manager
- Environment variables
- Approved organizational password-management systems

Do not share production passwords or access keys through email, chat, or documentation intended for general circulation. This document intentionally omits real secret values for that reason.

---

## 4. User Accounts & Roles

All users authenticate using their `@gyftr.net` email addresses.

During migration, accounts are created with a randomly generated temporary password (see `migration/create-cognito-users.js` — it prints one per user, it does **not** assign a shared default password since this portal holds real legal-agreement access). Users must change their password on first login (Cognito's standard "new password required" flow).

| Name | Email | Role | Team code |
|---|---|---|---|
| Nitin | nitin@gyftr.net | Legal | L |
| Neha | neha@gyftr.net | Finance | F |
| Pankaj Mehta | pankaj.mehta@gyftr.net | Business | B |
| Nikhil | nikhil@gyftr.net | Compliance | C |

There is no separate "super admin" tier in this portal — **Legal** is the only role with elevated permissions: only Legal can create agreements, change overall agreement status, change client-facing status/dates, upload drafts, and set clause outcomes. Every other role can read everything and add remarks/reminders/team-status updates for their own team. See `backend/authz.js` for the full rule set.

---

## 5. Prerequisites

Before beginning deployment, ensure you have:
- An AWS account with billing enabled
- Node.js v18 or higher
- Git installed
- PostgreSQL command-line tools (`psql`)
- AWS CLI
- Access to the project's GitHub repository
- Access to the existing Supabase project
- Access to the domain/DNS provider for `gyftr.net`
- Basic familiarity with terminal commands

**Estimated Setup Time**
Approximately 3–4 hours, assuming all required AWS and DNS access is already available.

---

## 6. Step 1 — Clone & Install the Project

Open a terminal and run:

```bash
git clone https://github.com/yashtahlyani/gyftr-legal
cd gyftr-legal

npm install

cd backend
npm install
cd ..

cd migration
npm install
cd ..
```

This installs dependencies for:
- Frontend
- Backend
- Migration and setup scripts

---

## 7. Step 2 — Create PostgreSQL Database on AWS RDS

AWS RDS will become the primary production database for the portal.

**Create the RDS Instance**

Open:
**AWS Console → RDS → Create Database**

Use the following configuration:
- Creation Method: Standard Create
- Engine: PostgreSQL
- PostgreSQL Version: 16
- Template: Free Tier for testing or Production for live deployment
- DB Instance Identifier: `gyftr-legal`
- Master Username: `gyftr_admin`
- Instance Type: `db.t3.small` (holds real legal data — don't undersize for production)
- Storage: 20 GB

Create a strong database password and store it securely.

**Connectivity**

Temporarily configure:
- Public Access: Yes

This allows the migration script to connect to RDS from a local computer.
After migration, public database access should be disabled and access restricted to the backend infrastructure.

Create a security group named:
`gyftr-legal-rds-sg`

Click **Create Database**.

Provisioning generally takes approximately 5–10 minutes.

**Save the RDS Endpoint**

Once the database is available:
**RDS → Databases → gyftr-legal → Connectivity & Security**

Copy the database endpoint.

Example:
`gyftr-legal.xxxx.ap-south-1.rds.amazonaws.com`

---

## 8. Create the Database Schema

Connect to PostgreSQL:

```bash
psql "postgresql://gyftr_admin:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/postgres"
```

Once connected, create the database and run the schema file:

```bash
\q
```

```bash
psql "postgresql://gyftr_admin:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/postgres" -c "CREATE DATABASE gyftr_legal;"

psql "postgresql://gyftr_admin:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/gyftr_legal" -f backend/schema.sql
```

`backend/schema.sql` creates every table this portal needs:

```sql
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table profiles (
  id           uuid primary key default gen_random_uuid(),
  cognito_sub  text unique,
  email        text unique not null,
  name         text not null,
  role         text not null check (role in ('legal','finance','business','compliance')),
  team_code    text not null check (team_code in ('L','F','C','B')),
  avatar       text,
  created_at   timestamptz default now()
);

create table agreements (
  id               uuid default gen_random_uuid() primary key,
  client           text not null,
  tag              text,
  type             text not null,
  status           text default 'pending'
    check (status in ('pending','review','final','closed','reopen')),
  client_status    text default 'awaiting'
    check (client_status in ('awaiting','responded','negotiating','finalised')),
  promise_date     date,
  start_date       date default current_date,
  spoc_legal       text,
  spoc_finance     text,
  spoc_business    text,
  spoc_compliance  text,
  doc_link         text,
  client_dates     jsonb default '{}',
  created_by       uuid references profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table drafts (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  draft_no      text not null,
  direction     text default 'sent' check (direction in ('sent','received')),
  note          text,
  file_path     text,
  file_name     text,
  date          date default current_date,
  created_by    uuid references profiles(id),
  created_at    timestamptz default now()
);

create table team_statuses (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  team_code     text not null check (team_code in ('L','F','C','B')),
  status        text default 'Pending'
    check (status in ('Pending','Under Review','Approved','Rejected')),
  aging_days    int default 0,
  updated_by    text,
  updated_at    timestamptz default now(),
  unique(agreement_id, team_code)
);

create table remarks (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  author_id     uuid references profiles(id),
  author_name   text not null,
  author_role   text,
  text          text not null,
  created_at    timestamptz default now()
);

create table history_log (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  team          text,
  changed_by    text,
  from_status   text,
  to_status     text,
  created_at    timestamptz default now()
);

create table clauses (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  clause_no     text,
  clause_name   text,
  outcome       text default 'pending'
    check (outcome in ('accepted','held','partial','pending')),
  full_context  text,
  created_at    timestamptz default now(),
  unique(agreement_id, clause_no)
);

create table clause_changes (
  id          uuid default gen_random_uuid() primary key,
  clause_id   uuid references clauses(id) on delete cascade,
  draft_no    text,
  change_text text,
  created_at  timestamptz default now(),
  unique(clause_id, draft_no)
);

create table reminders (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  from_role     text,
  from_name     text,
  to_teams      text[],
  client_name   text,
  dismissed_by  text[] default '{}',
  sent_at       timestamptz default now()
);

create table signatures (
  id                  uuid default gen_random_uuid() primary key,
  agreement_id        uuid references agreements(id) on delete cascade,
  signer_name         text,
  signer_role         text,
  signer_email        text,
  adobe_envelope_id   text,
  status              text default 'pending',
  signed_at           timestamptz,
  signed_file_path    text,
  created_at          timestamptz default now()
);

create index idx_agreements_created_by   on agreements(created_by);
create index idx_drafts_agreement_id     on drafts(agreement_id);
create index idx_team_statuses_agreement on team_statuses(agreement_id);
create index idx_remarks_agreement_id    on remarks(agreement_id);
create index idx_history_log_agreement   on history_log(agreement_id);
create index idx_clauses_agreement_id    on clauses(agreement_id);
create index idx_clause_changes_clause   on clause_changes(clause_id);
create index idx_reminders_agreement_id  on reminders(agreement_id);
create index idx_signatures_agreement_id on signatures(agreement_id);
create index idx_profiles_cognito_sub    on profiles(cognito_sub);
create index idx_profiles_email          on profiles(email);
```

(This is the exact content of `backend/schema.sql` in the repo — running `-f backend/schema.sql` as shown above does the same thing as pasting it in by hand.)

Exit PostgreSQL using:
```bash
\q
```

---

## 9. Step 3 — Configure AWS Secrets Manager

AWS Secrets Manager stores database credentials securely so that they do not need to be hardcoded into the backend.

Open:
**AWS Console → Secrets Manager → Store a New Secret**

Choose:
Secret Type: **Other type of secret**

Add:
```
host     = YOUR_RDS_ENDPOINT
port     = 5432
dbname   = gyftr_legal
username = gyftr_admin
password = YOUR_DATABASE_PASSWORD
```

Continue and set the secret name to:
`gyftr/legal/db`

Complete the creation process.

---

## 10. Step 4 — Configure AWS Cognito

AWS Cognito handles authentication and replaces the existing Supabase authentication system.

Open:
**AWS Console → Cognito → Create User Pool**

Configure:
- Sign-in Option: Email
- Password Policy: minimum 8 chars, require uppercase + number + symbol
- MFA: Disabled (revisit later given this holds legal agreement data)
- Account Recovery: Default

Set:
- User Pool Name: `gyftr-legal-users`
- App Client Name: `gyftr-legal-web`
- Client Type: Public Client
- Client Secret: Do not generate

Create the user pool.

**Save the Following Values**

After creation, copy:
User Pool ID
Example: `ap-south-1_AbcXYZ`

Then open:
App Clients

Copy the:
Client ID

Both values are required for the frontend and backend configuration.

---

## 11. Step 5 — Create Cognito User Accounts

The project contains a script (`migration/create-cognito-users.js`) that creates a Cognito account for every row in the `profiles` table and links it back via `cognito_sub` — you don't need to create the 4 users by hand in the console.

**Create AWS Credentials**

Open:
**AWS Console → IAM → Users**

Create a deployment/migration user and grant only the permissions required to manage Cognito users (`cognito-idp:AdminCreateUser`).

Generate temporary access credentials for the setup process.

**Mac/Linux**
```bash
cd migration

export COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
export AWS_REGION=ap-south-1
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
export RDS_HOST=YOUR_RDS_ENDPOINT
export RDS_USER=gyftr_admin
export RDS_PASSWORD=YOUR_DATABASE_PASSWORD
export RDS_DB=gyftr_legal

node create-cognito-users.js
```

**Windows Command Prompt**
```cmd
cd migration

set COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
set AWS_REGION=ap-south-1
set AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
set AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
set RDS_HOST=YOUR_RDS_ENDPOINT
set RDS_USER=gyftr_admin
set RDS_PASSWORD=YOUR_DATABASE_PASSWORD
set RDS_DB=gyftr_legal

node create-cognito-users.js
```

The terminal will display a temporary password for each of the 4 users — share each one with that person over a secure channel, not email/Slack in plaintext. They must set their own password on first login.

**Note**: this script requires `profiles` rows to already exist in RDS (created by the migration in Step 6 below, or inserted by hand for a fresh environment with no Supabase data to migrate). Run Step 6 first if you're migrating real data.

After completing setup, remove or deactivate temporary IAM credentials that are no longer required.

---

## 12. Step 6 — Migrate Supabase Data to AWS RDS

The migration script transfers existing:
- Agreements
- Drafts (rows **and** the actual files, copied from Supabase Storage to S3)
- Team statuses
- Remarks
- History log
- Clauses and clause changes
- Reminders
- Signatures
- Profiles (with email pulled from Supabase's Admin Auth API, since the old `profiles` table didn't store email directly)

from Supabase to PostgreSQL on AWS RDS + S3.

**Mac/Linux**
```bash
cd migration

export SUPABASE_URL=https://aiaeruajrbrxkoaqzdpp.supabase.co
export SUPABASE_PAT=YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN
export RDS_HOST=YOUR_RDS_ENDPOINT
export RDS_USER=gyftr_admin
export RDS_PASSWORD=YOUR_DATABASE_PASSWORD
export RDS_DB=gyftr_legal
export DRAFTS_BUCKET=gyftr-legal-drafts
export AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
export AWS_REGION=ap-south-1

node migrate-db.js
```

**Windows Command Prompt**
```cmd
cd migration

set SUPABASE_URL=https://aiaeruajrbrxkoaqzdpp.supabase.co
set SUPABASE_PAT=YOUR_SUPABASE_PERSONAL_ACCESS_TOKEN
set RDS_HOST=YOUR_RDS_ENDPOINT
set RDS_USER=gyftr_admin
set RDS_PASSWORD=YOUR_DATABASE_PASSWORD
set RDS_DB=gyftr_legal
set DRAFTS_BUCKET=gyftr-legal-drafts
set AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
set AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
set AWS_REGION=ap-south-1

node migrate-db.js
```

Wait until the script confirms:
`Migration complete.`

**Safe to re-run** — every insert uses `ON CONFLICT (id) DO NOTHING`, so running it twice does not duplicate or corrupt data.

**Verify Migration**

Connect to RDS and execute:
```sql
SELECT COUNT(*) FROM agreements;
SELECT COUNT(*) FROM drafts;
SELECT COUNT(*) FROM profiles;
```

Each result should return a value greater than 0 (assuming the source Supabase project has data).

It is recommended to verify the counts of all migrated tables (`team_statuses`, `remarks`, `history_log`, `clauses`, `clause_changes`, `reminders`, `signatures`) before decommissioning the old system.

---

## 13. Step 7 — Deploy Backend on AWS EC2

The Node.js API will run on an EC2 instance.

Open:
**AWS Console → EC2 → Launch Instance**

Configure:
- Name: `gyftr-legal-api`
- AMI: Amazon Linux 2023
- Instance Type: `t3.small`

**Key Pair**

Create:
`gyftr-legal-key`

Download the `.pem` file and store it securely.
The private key cannot be downloaded again after creation.

**Security Group**

Create:
`gyftr-legal-ec2-sg`

Initially configure the networking required for deployment and testing.
For production, avoid exposing application port 3001 directly to the public internet. Restrict it so that the backend receives traffic through the Application Load Balancer.
Allow SSH (22) only from trusted administrator IP addresses.

**IAM Role**

Create an EC2 IAM role:
`gyftr-legal-ec2-role`

Grant the instance permission to:
- Read the required database secret from AWS Secrets Manager (`secretsmanager:GetSecretValue` on `gyftr/legal/db`)
- Read/write the drafts bucket (`s3:GetObject`, `s3:PutObject` on `arn:aws:s3:::gyftr-legal-drafts/*`)

---

## 14. Connect to EC2

Connect using SSH:
```bash
chmod 400 gyftr-legal-key.pem

ssh -i gyftr-legal-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

After connecting:
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs git

# Clone the repository
git clone https://github.com/yashtahlyani/gyftr-legal /app/gyftr-legal

cd /app/gyftr-legal/backend

npm install
```

---

## 15. Configure Backend Environment

Inside:
`/app/gyftr-legal/backend`

Create `.env`:
```bash
cat > .env << 'EOF'
PORT=3001
AWS_SECRET_NAME=gyftr/legal/db
AWS_REGION=ap-south-1
COGNITO_USER_POOL_ID=YOUR_COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID=YOUR_COGNITO_CLIENT_ID
COGNITO_REGION=ap-south-1
DRAFTS_BUCKET=gyftr-legal-drafts
FRONTEND_URL=https://legal.gyftr.net
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
ADOBE_CLIENT_ID=YOUR_ADOBE_CLIENT_ID
ADOBE_CLIENT_SECRET=YOUR_ADOBE_CLIENT_SECRET
EOF
```

---

## 16. Configure PM2

PM2 keeps the Node.js backend running continuously.

Install PM2:
```bash
sudo npm install -g pm2
```

Start the backend:
```bash
pm2 start server.js --name gyftr-legal-api
pm2 startup
pm2 save
```

Check status:
```bash
pm2 status
```

For initial testing, access:
`http://YOUR_EC2_IP:3001/health`

A healthy API should return:
```json
{"ok":true}
```

---

## 17. Step 8 — Configure HTTPS with AWS ALB

The frontend must communicate with the backend through HTTPS.

The intended production API URL is:
`https://api.legal.gyftr.net`

**Create SSL Certificate**

Open:
**AWS Console → Certificate Manager → Request Certificate**

Request a certificate for:
`api.legal.gyftr.net`

Validate ownership using DNS.
Add the CNAME validation record provided by AWS to the DNS provider.

**Create Application Load Balancer**

Open:
**EC2 → Load Balancers → Create Load Balancer → Application Load Balancer**

Configure:
- Name: `gyftr-legal-api-alb`
- Scheme: Internet-facing
- HTTPS Listener: Port 443

Attach the ACM certificate created for:
`api.legal.gyftr.net`

**Target Group**

Create a target group:
- Target Type: Instances
- Backend Port: 3001
- Health check path: `/health`

Register the EC2 instance.

After the ALB is created, copy its DNS name.
Example: `gyftr-legal-api-alb.xxxx.elb.amazonaws.com`

**DNS Configuration**
```
api.legal.gyftr.net
        ↓
Application Load Balancer
        ↓
EC2 Backend :3001
```

Add the appropriate DNS record pointing `api.legal.gyftr.net` to the ALB.

---

## 18. Step 9 — Deploy Frontend with S3 & CloudFront

The production frontend will be available at:
`https://legal.gyftr.net`

**Configure Frontend Environment**

Inside the root `gyftr-legal` directory, create `.env.local`:
```
VITE_API_URL=https://api.legal.gyftr.net
VITE_COGNITO_USER_POOL_ID=YOUR_COGNITO_USER_POOL_ID
VITE_COGNITO_CLIENT_ID=YOUR_COGNITO_CLIENT_ID
VITE_OPENAI_API_KEY=YOUR_OPENAI_API_KEY
VITE_GOOGLE_DOCS_API_KEY=YOUR_GOOGLE_DOCS_API_KEY
VITE_GOOGLE_DRIVE_API_KEY=YOUR_GOOGLE_DRIVE_API_KEY
VITE_GOOGLE_PICKER_API_KEY=YOUR_GOOGLE_PICKER_API_KEY
VITE_GOOGLE_OAUTH_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
```

Build the frontend:
```bash
cd gyftr-legal
npm run build
```

This generates:
`dist/`

---

## 19. Create the S3 Buckets

This portal needs **two** S3 buckets — one for the frontend, one for private draft files.

**Frontend bucket**

Open:
**AWS Console → S3 → Create Bucket**

Configure:
- Bucket Name: `gyftr-legal-frontend`
- Region: `ap-south-1`

Keep the bucket private and let CloudFront access it using Origin Access Control (OAC).

Upload the build:
```bash
aws s3 sync dist/ s3://gyftr-legal-frontend/ --delete
```

**Drafts bucket**

Open:
**AWS Console → S3 → Create Bucket**

Configure:
- Bucket Name: `gyftr-legal-drafts`
- Region: `ap-south-1`

Keep **Block all public access ON** — this bucket is private; the backend hands out short-lived presigned URLs to view/upload draft files (see `backend/s3.js`). No CloudFront needed for this one.

---

## 20. Configure CloudFront

Open:
**AWS Console → CloudFront → Create Distribution**

**Origin**

Select:
`gyftr-legal-frontend.s3.ap-south-1.amazonaws.com`

Configure:
- Origin Access: Origin Access Control (OAC)
- Create a new OAC and apply the generated S3 bucket policy.

**Viewer Configuration**

Set:
- Viewer Protocol Policy: Redirect HTTP to HTTPS
- Default Root Object: `index.html`

**Routing**

This is a static multi-page app (`index.html` = login, `app.html` = portal), not a client-side router, so unlike a React Router SPA you generally don't need a catch-all 404 → `index.html` rewrite — both HTML files are real files in `dist/`. Leave the default error behavior as-is unless you find a specific route that 404s.

**Custom Domain**

Add:
`legal.gyftr.net`

Attach an ACM certificate covering the domain.

Create the distribution and copy its CloudFront domain name.

**DNS**
```
legal.gyftr.net
        ↓
CloudFront
        ↓
S3 Frontend
```

---

## 21. Step 10 — Production Testing

Once deployment is complete, open:
`https://legal.gyftr.net`

Perform the following checks:

**Authentication**
- Verify that valid users can log in.
- Verify invalid credentials are rejected.
- Verify each user receives the correct role (Legal/Finance/Business/Compliance).
- Verify demo-mode role pills still work and show sample data (not real agreements).

**Legal role**
- Log in as Nitin (nitin@gyftr.net).
- Confirm:
  - Agreements load and show migrated data.
  - "New Agreement" button is visible and works.
  - Overall agreement status can be changed.
  - Client-facing status/dates can be edited.
  - Team status can be updated for any team.
  - Clause outcomes can be set.

**Non-Legal role**
- Log in as Neha (neha@gyftr.net) or another non-Legal user.
- Confirm:
  - Agreements are visible (read access works for everyone).
  - "New Agreement" is hidden/restricted.
  - Only their own team's status can be updated.
  - Remarks can still be added.

**Additional Verification**

Test:
- Agreement creation
- Team status updates + history log entries
- Remarks
- Client status updates
- AI clause analysis (works in both demo mode and real login — it's intentionally unauthenticated on the backend)
- Google Doc picker/viewer (unrelated to this migration, should be unaffected)
- Logout
- Role-based access
- Refreshing/directly opening `index.html` and `app.html`

Once these checks pass, the AWS deployment can be considered live.

---

## 22. Deployment Architecture

The production architecture should be:
```
User
  ↓
legal.gyftr.net
  ↓
CloudFront
  ↓
S3 — Frontend (index.html, app.html)
  ↓
api.legal.gyftr.net
  ↓
Application Load Balancer
  ↓
EC2 — Node.js (Express) Backend
  ↓
AWS RDS — PostgreSQL
  ↓
AWS S3 — gyftr-legal-drafts (private, presigned URLs only)
```

Authentication is handled separately through:
```
Frontend / Backend
        ↓
AWS Cognito
```

Database credentials are provided securely through:
```
EC2 Backend
     ↓
AWS Secrets Manager
     ↓
RDS Credentials
```

AI clause analysis and e-signature are external third-party calls, unrelated to this migration:
```
EC2 Backend  →  OpenAI (clause risk analysis)
EC2 Backend  →  Adobe Sign (e-signature)
```

---

## 23. Deploying Future Updates

**Frontend Updates**

When frontend code changes:
```bash
cd gyftr-legal

git pull
npm install
npm run build

aws s3 sync dist/ s3://gyftr-legal-frontend/ --delete
```

Invalidate the CloudFront cache:
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_CF_DISTRIBUTION_ID \
  --paths "/*"
```

The updated frontend should become available after the invalidation completes.

---

## 24. Backend Updates

Connect to EC2:
```bash
ssh -i gyftr-legal-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

Then:
```bash
cd /app/gyftr-legal

git pull

cd backend
npm install

pm2 restart gyftr-legal-api
```

Verify:
```bash
pm2 status
```

If necessary:
```bash
pm2 logs gyftr-legal-api
```

---

## 25. Common Administrative Changes

**Add a New Team Member**

Step 1 — Insert a `profiles` row
```sql
insert into profiles (email, name, role, team_code)
values ('new.person@gyftr.net', 'New Person', 'legal', 'L');
```
(`role` must be one of `legal`/`finance`/`business`/`compliance`; `team_code` one of `L`/`F`/`C`/`B`, matching the role.)

Step 2 — Create their Cognito account and link it
```bash
cd migration
export COGNITO_USER_POOL_ID=... AWS_REGION=ap-south-1 \
  AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... \
  RDS_HOST=... RDS_USER=gyftr_admin RDS_PASSWORD=... RDS_DB=gyftr_legal

node create-cognito-users.js
```
This only processes `profiles` rows that don't already have a `cognito_sub`, so it's safe to re-run any time someone new joins — it won't touch existing users.

**Remove a Team Member**

Deactivate them in Cognito (**Cognito console → Users → (user) → Disable**) rather than deleting the `profiles` row, so their name/authorship is preserved on historical remarks/history entries.

---

## 26. Change Permission Rules

Unlike the sibling Work Portal (which hardcodes role lists in the frontend), this portal's authorization lives entirely on the server, in one file:

`backend/authz.js`

Each rule is a small function (e.g. `canManageAgreements`, `canUpdateTeamStatus`) used by the relevant route in `backend/routes/`. To change who can do what, edit the function there — no frontend change needed, and no database migration needed.

After changing it:
```bash
ssh -i gyftr-legal-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
cd /app/gyftr-legal && git pull
cd backend && npm install
pm2 restart gyftr-legal-api
```

---

## 27. Reset a User Password

Open:
**AWS Console → Cognito → User Pool → Users**

Find the required user and select:
**Actions → Reset Password**

Or via CLI:
```bash
aws cognito-idp admin-reset-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username user@gyftr.net
```

---

## 28. Troubleshooting

**Frontend Shows a Blank Page / Every Screen Empty for Real Accounts**

Open browser Developer Tools using F12 and check the Console and Network tab.
Verify the frontend environment variables used at build time:
```
VITE_API_URL
VITE_COGNITO_USER_POOL_ID
VITE_COGNITO_CLIENT_ID
```
Incorrect environment variables are a common cause — demo-mode login will still work even if these are wrong, since it never calls the API, so if demo mode works but real login doesn't, start here.

**Login Fails**

Open:
**AWS Console → Cognito → User Pool → Users**

Verify:
- User exists
- Email is correct
- Account status is valid
- Cognito configuration (Pool ID / Client ID) matches between frontend and backend `.env`

**"No profile linked to this account" after a successful Cognito login**

The Cognito user exists but its email doesn't match a `profiles.email` row, or `create-cognito-users.js` didn't finish linking `cognito_sub`. Check:
```sql
select email, cognito_sub from profiles where email = 'their@gyftr.net';
```

**Agreements Are Not Loading**

Check whether the backend is running.
SSH into EC2 and execute:
```bash
pm2 status
```
If `gyftr-legal-api` is stopped or errored:
```bash
pm2 logs gyftr-legal-api
```
Restart if necessary:
```bash
pm2 restart gyftr-legal-api
```

**Backend Cannot Connect to Database**

Check:
- RDS instance is running.
- EC2 has network access to RDS.
- RDS security group (`gyftr-legal-rds-sg`) permits PostgreSQL traffic from the EC2 security group (`gyftr-legal-ec2-sg`).
- Port 5432 is correctly configured.
- Secrets Manager (`gyftr/legal/db`) contains the correct database credentials.
- EC2 IAM role can read the required secret.
- Database username and password are correct.

**Draft Upload/View Fails with an S3 Error**

Check the EC2 IAM role has `s3:GetObject`/`s3:PutObject` on `arn:aws:s3:::gyftr-legal-drafts/*`, and that `DRAFTS_BUCKET` in `backend/.env` matches the real bucket name.

**CloudFront Shows an Old Version**

Create a cache invalidation:
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_CF_DISTRIBUTION_ID \
  --paths "/*"
```

**Backend API Is Not Accessible**

Check:
```bash
pm2 status
pm2 logs gyftr-legal-api
```
Then verify:
- EC2 instance is running.
- ALB target is healthy.
- Target group uses port 3001 with health check path `/health`.
- HTTPS listener is configured.
- ACM certificate is valid.
- DNS for `api.legal.gyftr.net` points to the correct ALB.

**Migration Script Fails at "Fetching auth.users via Admin API"**

`SUPABASE_PAT` needs Management API access on the source project, not just a regular anon/service key. Generate one from Supabase → Account → Access Tokens.

---

## 29. Post-Migration Security Checklist

After confirming that the AWS version works correctly:
- Verify all Supabase data has migrated successfully.
- Compare record counts between Supabase and RDS for every table.
- Test major portal functionality end-to-end.
- Revoke the Supabase Personal Access Token used for migration.
- Remove unnecessary AWS access keys.
- Remove temporary IAM permissions.
- Disable unnecessary public access to RDS.
- Restrict RDS access to the EC2/backend security group.
- Restrict EC2 application traffic to the ALB where possible.
- Keep the S3 frontend bucket private behind CloudFront OAC.
- Keep the S3 drafts bucket fully private (no public access, no CloudFront).
- Confirm HTTPS is enforced on both `legal.gyftr.net` and `api.legal.gyftr.net`.
- Ensure `.env`/`.env.local` files are excluded from Git.
- Ensure passwords and API keys are not committed to the repository.
- Ask users to replace temporary passwords with their own secure passwords.

---

## 30. Final Go-Live Checklist

Before declaring the migration complete, confirm:

**Infrastructure**
- RDS PostgreSQL is running.
- Cognito user pool is configured.
- All 4 required users exist and are linked (`cognito_sub` set).
- EC2 backend is running.
- Application Load Balancer is healthy.
- S3 frontend bucket is deployed.
- S3 drafts bucket exists and is private.
- CloudFront distribution is active.
- SSL certificates are valid (both domains).
- DNS records are working.

**Application**
- Login works (both demo mode and real Cognito accounts).
- Agreements load.
- Existing data has migrated (agreement count matches Supabase).
- New agreements can be created (Legal only).
- Team status updates work, and are correctly restricted to own team (or Legal).
- Remarks work.
- Client status/date edits work (Legal only).
- Clause outcome updates work (Legal only).
- AI clause analysis works.
- Dashboard/turnaround/bottleneck views work.
- History/audit log entries are recorded correctly.

**Security**
- Temporary credentials have been removed.
- Supabase migration token has been revoked.
- Database is not unnecessarily exposed publicly.
- EC2 access is restricted.
- Production credentials are stored securely.

Once all items above have been verified, the migration and production handover are complete.

---

## 31. Quick Reference

| Item | Value |
|---|---|
| Production Frontend | `https://legal.gyftr.net` |
| Production API | `https://api.legal.gyftr.net` |
| Git Repository | `https://github.com/yashtahlyani/gyftr-legal` |
| AWS Region | `ap-south-1` |
| RDS Database Identifier | `gyftr-legal` |
| RDS Database Name | `gyftr_legal` |
| Database User | `gyftr_admin` |
| Cognito User Pool | `gyftr-legal-users` |
| Cognito App Client | `gyftr-legal-web` |
| EC2 Instance | `gyftr-legal-api` |
| Backend PM2 Process | `gyftr-legal-api` |
| Secrets Manager Secret | `gyftr/legal/db` |
| Frontend S3 Bucket | `gyftr-legal-frontend` |
| Drafts S3 Bucket | `gyftr-legal-drafts` |
| Frontend Domain | `legal.gyftr.net` |
| Backend Domain | `api.legal.gyftr.net` |

---

## 32. Handover Notes

The application has been structured so that the AWS deployment replaces the previous Supabase-based infrastructure while retaining the existing portal functionality and historical data.

The most important responsibilities for the new maintainer are:
- Keep production credentials secure.
- Verify backups and database availability.
- Test role-based access whenever users are added or modified — via `backend/authz.js`, not a frontend hardcoded list.
- Deploy frontend changes through S3 and CloudFront.
- Deploy backend changes through EC2 and PM2.
- Monitor backend logs when API issues occur.
- Keep AWS permissions limited to what each service requires.
- Maintain the GitHub repository as the primary source of application code.
- Do not delete or permanently disable the old Supabase environment until the migrated AWS system has been thoroughly tested and the migrated data has been verified.
- Two things that existed pre-migration were intentionally **not** carried over: the Claude-based clause-diff Supabase Edge Function, and a duplicate OpenAI Edge Function — both were confirmed dead code before the migration. Their source is kept under `supabase/functions/` for reference only.
- The Drafts modal and "nudge" reminders have a working backend (`backend/routes/drafts.js`, `backend/routes/reminders.js`) but the frontend doesn't call them yet — same as before the migration. See `infra/HANDOVER.md` "Common changes cookbook" if you want to wire those up.

For a plain-language architecture explanation and a shorter day-to-day cookbook, see `infra/HANDOVER.md`. For pure AWS console/CLI provisioning steps without the narrative framing, see `infra/aws-setup.md`. For the pre-migration feature/screen-level writeup of the app itself, see `docs/KT.md`.

---

## Contact

Migration Built & Handed Over By:
Yash Tahlyani
Email: yash.tahlyani@gyftr.net

Project: GyFTR Legal Portal
