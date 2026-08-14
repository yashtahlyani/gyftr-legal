-- ═══════════════════════════════════════════════════════════
-- GyfTR Legal Portal — RDS Postgres Schema (AWS migration)
--
-- Plain Postgres — no Supabase-specific features:
--   - No `auth.users` FK (Cognito is external to the DB)
--   - No Row Level Security (authorization now lives in the
--     Express backend — see backend/authz.js)
--   - `profiles.cognito_sub` replaces the old `id = auth.users.id` link
--
-- Run this once against a fresh RDS database before running
-- migration/migrate-db.js. Safe to run on an empty DB only —
-- it does not use IF NOT EXISTS, matching the original schema.sql.
--
-- No CREATE EXTENSION here: the app DB user is not a superuser, and
-- gen_random_uuid() is built into Postgres 13+ (no uuid-ossp/pgcrypto needed).
-- ═══════════════════════════════════════════════════════════

-- ── PROFILES ──────────────────────────────────────────────────
-- id is preserved verbatim from the old Supabase profiles.id (=
-- old auth.users.id) during migration, so every other table's
-- foreign key below needs no remapping.
create table if not exists profiles (
  id           uuid primary key default gen_random_uuid(),
  cognito_sub  text unique,        -- filled in by migration/create-cognito-users.js
  email        text unique not null,
  name         text not null,
  role         text not null check (role in ('legal','finance','business','compliance')),
  team_code    text not null check (team_code in ('L','F','C','B')),
  avatar       text,
  created_at   timestamptz default now()
);

-- ── AGREEMENTS ──────────────────────────────────────────────
create table if not exists agreements (
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

-- ── DRAFTS ──────────────────────────────────────────────────
-- file_path is now an S3 object key (was a Supabase Storage path) —
-- same string shape (`${agreementId}/${draftNo}${ext}`), different bucket.
create table if not exists drafts (
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

-- ── TEAM STATUSES ───────────────────────────────────────────
create table if not exists team_statuses (
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

-- ── REMARKS ─────────────────────────────────────────────────
create table if not exists remarks (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  author_id     uuid references profiles(id),
  author_name   text not null,
  author_role   text,
  text          text not null,
  created_at    timestamptz default now()
);

-- ── HISTORY LOG ─────────────────────────────────────────────
create table if not exists history_log (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  team          text,
  changed_by    text,
  from_status   text,
  to_status     text,
  created_at    timestamptz default now()
);

-- ── CLAUSES (AI analysis output) ────────────────────────────
create table if not exists clauses (
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

-- ── CLAUSE CHANGES (per draft) ───────────────────────────────
create table if not exists clause_changes (
  id          uuid default gen_random_uuid() primary key,
  clause_id   uuid references clauses(id) on delete cascade,
  draft_no    text,
  change_text text,
  created_at  timestamptz default now(),
  unique(clause_id, draft_no)
);

-- ── REMINDERS ───────────────────────────────────────────────
create table if not exists reminders (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  from_role     text,
  from_name     text,
  to_teams      text[],
  client_name   text,
  dismissed_by  text[] default '{}',
  sent_at       timestamptz default now()
);

-- ── SIGNATURES ──────────────────────────────────────────────
create table if not exists signatures (
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

-- ── INDEXES (not present in the original Supabase schema.sql,
--    but the RLS-free authorization module now runs one of
--    these lookups on every request, so add them here) ───────
create index if not exists idx_agreements_created_by   on agreements(created_by);
create index if not exists idx_drafts_agreement_id     on drafts(agreement_id);
create index if not exists idx_team_statuses_agreement on team_statuses(agreement_id);
create index if not exists idx_remarks_agreement_id    on remarks(agreement_id);
create index if not exists idx_history_log_agreement   on history_log(agreement_id);
create index if not exists idx_clauses_agreement_id    on clauses(agreement_id);
create index if not exists idx_clause_changes_clause   on clause_changes(clause_id);
create index if not exists idx_reminders_agreement_id  on reminders(agreement_id);
create index if not exists idx_signatures_agreement_id on signatures(agreement_id);
create index if not exists idx_profiles_cognito_sub    on profiles(cognito_sub);
create index if not exists idx_profiles_email          on profiles(email);

-- ═══════════════════════════════════════════════════════════
-- No RLS policies here — see backend/authz.js for the 1:1 port
-- of every policy that used to live in supabase/schema.sql:
--
--   Read agreements/drafts/team_statuses/remarks/history_log/
--     clauses/clause_changes/reminders/signatures
--       → any authenticated user (any row with a valid Cognito JWT)
--   Legal creates/updates agreements       → role = 'legal'
--   Update own team status                 → team_code matches, or role = 'legal'
--   Insert team status                     → any authenticated user
--   Add remarks/history/reminders          → any authenticated user
--   Update reminders                       → any authenticated user
--   Upload drafts                          → role = 'legal'
-- ═══════════════════════════════════════════════════════════
