-- ═══════════════════════════════════════════════════════════
-- GyfTR Legal Portal — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── PROFILES (extends Supabase auth.users) ──────────────────
create table profiles (
  id          uuid references auth.users primary key,
  name        text not null,
  role        text not null check (role in ('legal','finance','business','compliance')),
  team_code   text not null check (team_code in ('L','F','C','B')),
  avatar      text,
  created_at  timestamptz default now()
);

-- ── AGREEMENTS ──────────────────────────────────────────────
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

-- ── DRAFTS ──────────────────────────────────────────────────
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

-- ── TEAM STATUSES ───────────────────────────────────────────
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

-- ── REMARKS ─────────────────────────────────────────────────
create table remarks (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  author_id     uuid references profiles(id),
  author_name   text not null,
  author_role   text,
  text          text not null,
  created_at    timestamptz default now()
);

-- ── HISTORY LOG ─────────────────────────────────────────────
create table history_log (
  id            uuid default gen_random_uuid() primary key,
  agreement_id  uuid references agreements(id) on delete cascade,
  team          text,
  changed_by    text,
  from_status   text,
  to_status     text,
  created_at    timestamptz default now()
);

-- ── CLAUSES (AI analysis output) ────────────────────────────
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

-- ── CLAUSE CHANGES (per draft) ───────────────────────────────
create table clause_changes (
  id          uuid default gen_random_uuid() primary key,
  clause_id   uuid references clauses(id) on delete cascade,
  draft_no    text,
  change_text text,
  created_at  timestamptz default now(),
  unique(clause_id, draft_no)
);

-- ── REMINDERS ───────────────────────────────────────────────
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

-- ── SIGNATURES ──────────────────────────────────────────────
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

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table agreements    enable row level security;
alter table drafts        enable row level security;
alter table team_statuses enable row level security;
alter table remarks       enable row level security;
alter table history_log   enable row level security;
alter table clauses       enable row level security;
alter table clause_changes enable row level security;
alter table reminders     enable row level security;
alter table signatures    enable row level security;

-- All authenticated users can read everything
create policy "Read agreements"     on agreements     for select using (auth.role() = 'authenticated');
create policy "Read drafts"         on drafts         for select using (auth.role() = 'authenticated');
create policy "Read team_statuses"  on team_statuses  for select using (auth.role() = 'authenticated');
create policy "Read remarks"        on remarks        for select using (auth.role() = 'authenticated');
create policy "Read history_log"    on history_log    for select using (auth.role() = 'authenticated');
create policy "Read clauses"        on clauses        for select using (auth.role() = 'authenticated');
create policy "Read clause_changes" on clause_changes for select using (auth.role() = 'authenticated');
create policy "Read reminders"      on reminders      for select using (auth.role() = 'authenticated');
create policy "Read signatures"     on signatures     for select using (auth.role() = 'authenticated');

-- Only Legal can create/update agreements
create policy "Legal creates agreements" on agreements for insert
  with check ((select role from profiles where id = auth.uid()) = 'legal');

create policy "Legal updates agreements" on agreements for update
  using ((select role from profiles where id = auth.uid()) = 'legal');

-- Each team updates only their own status row (Legal can update all)
create policy "Update own team status" on team_statuses for update
  using (
    team_code = (select team_code from profiles where id = auth.uid())
    or (select role from profiles where id = auth.uid()) = 'legal'
  );

create policy "Insert team status" on team_statuses for insert
  with check (auth.role() = 'authenticated');

-- Any authenticated user can add remarks and history
create policy "Add remarks"     on remarks      for insert with check (auth.role() = 'authenticated');
create policy "Add history"     on history_log  for insert with check (auth.role() = 'authenticated');
create policy "Add reminders"   on reminders    for insert with check (auth.role() = 'authenticated');
create policy "Update reminders" on reminders   for update using (auth.role() = 'authenticated');

-- Legal uploads drafts; all can read
create policy "Upload drafts" on drafts for insert
  with check ((select role from profiles where id = auth.uid()) = 'legal');

-- Storage policies
insert into storage.buckets (id, name, public) values ('legal-drafts', 'legal-drafts', false);

create policy "Authenticated upload" on storage.objects for insert
  with check (bucket_id = 'legal-drafts' and auth.role() = 'authenticated');

create policy "Authenticated read" on storage.objects for select
  using (bucket_id = 'legal-drafts' and auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════
-- SEED TEST USERS
-- (run after creating users in Auth dashboard — replace UUIDs)
-- ═══════════════════════════════════════════════════════════

-- Prefer seed.sql which uses email-join UPSERT — no hardcoded UUIDs needed.
-- insert into profiles (id, name, role, team_code, avatar) values
-- ('UUID-OF-NITIN',   'Nitin',        'legal',      'L', 'NI'),
-- ('UUID-OF-NEHA',    'Neha',         'finance',    'F', 'NE'),
-- ('UUID-OF-PANKAJ',  'Pankaj Mehta', 'business',   'B', 'PM'),
-- ('UUID-OF-NIKHIL',  'Nikhil',       'compliance', 'C', 'NK');
