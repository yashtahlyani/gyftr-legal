-- ═══════════════════════════════════════════════════════════
-- GyfTR Legal Portal — DEMO data (opt-in, local/dev/staging ONLY)
--
-- ⚠ DO NOT run this against any database that holds real agreements. ⚠
-- Mixing real and fake agreements in one account is exactly the bug fixed
-- in this project's history (see docs/KT.md, "sample-data pollution") —
-- this file exists so that mistake can't happen again by keeping fake data
-- in a clearly separate, never-auto-applied script instead of baked into
-- the app or run automatically on boot.
--
-- Requires backend/seed.sql to have been run first (needs the 4 profiles
-- to exist, to attribute created_by / drafts / remarks correctly).
--
-- NOT applied automatically — backend/db.js only auto-applies schema.sql
-- and seed.sql. Run this by hand only on a database you know is empty of
-- real data:
--   psql "$DATABASE_URL" -f backend/seed.sql
--   psql "$DATABASE_URL" -f backend/seed-demo.sql
--
-- Idempotent per agreement via a fixed slug in client_dates->>'_seed_key',
-- checked before inserting — safe to re-run without duplicating rows.
-- ═══════════════════════════════════════════════════════════

do $$
declare
  uid_legal      uuid;
  uid_finance    uuid;
  uid_business   uuid;
  uid_compliance uuid;
  ag1 uuid;
  ag2 uuid;
  ag3 uuid;
  cl1 uuid;
  cl2 uuid;
begin
  select id into uid_legal      from profiles where email = 'nitin@gyftr.net';
  select id into uid_finance    from profiles where email = 'neha@gyftr.net';
  select id into uid_business   from profiles where email = 'pankaj.mehta@gyftr.net';
  select id into uid_compliance from profiles where email = 'nikhil@gyftr.net';

  if uid_legal is null then
    raise exception 'seed-demo.sql requires backend/seed.sql to have been run first (no profile for nitin@gyftr.net)';
  end if;

  -- Skip entirely if this demo batch already exists (idempotent re-run).
  if exists (select 1 from agreements where client_dates->>'_seed_key' = 'demo-v1') then
    raise notice 'Demo data already seeded (client_dates._seed_key = demo-v1) — skipping.';
    return;
  end if;

  -- ── Agreement 1: Meridian Finance — under review, active negotiation ──
  insert into agreements
    (client, tag, type, status, client_status, promise_date, start_date,
     spoc_legal, spoc_finance, spoc_business, spoc_compliance, client_dates, created_by)
  values
    ('Meridian Finance Limited', 'MFL', 'API / Direct', 'review', 'responded',
     current_date + interval '10 days', current_date - interval '21 days',
     'Nitin', 'Neha', 'Pankaj Mehta', 'Nikhil',
     '{"_seed_key":"demo-v1"}'::jsonb, uid_legal)
  returning id into ag1;

  insert into team_statuses (agreement_id, team_code, status, updated_by) values
    (ag1, 'L', 'Approved',      'Nitin'),
    (ag1, 'F', 'Under Review',  'Neha'),
    (ag1, 'B', 'Approved',      'Pankaj Mehta'),
    (ag1, 'C', 'Pending',       null);

  insert into history_log (agreement_id, team, changed_by, from_status, to_status) values
    (ag1, 'Legal', 'Nitin', '—', 'Pending'),
    (ag1, 'Legal', 'Nitin', 'Pending', 'Approved'),
    (ag1, 'Finance', 'Neha', 'Pending', 'Under Review');

  insert into drafts (agreement_id, draft_no, direction, note, date, created_by) values
    (ag1, 'D1', 'sent',     'Initial draft sent to Meridian for review.', current_date - interval '18 days', uid_legal),
    (ag1, 'D2', 'received', 'Meridian pushed back on revenue share and liability cap.', current_date - interval '9 days', uid_legal);

  insert into remarks (agreement_id, author_id, author_name, author_role, text) values
    (ag1, uid_legal, 'Nitin', 'Legal', 'Agreement created.'),
    (ag1, uid_finance, 'Neha', 'Finance', 'Revenue share terms look aggressive from their side — reviewing against our floor.');

  insert into clauses (agreement_id, clause_no, clause_name, outcome, full_context) values
    (ag1, '4', 'Revenue Share', 'partial', 'Meridian wants 70/30; template default is 80/20. Countered at 75/25.')
  returning id into cl1;
  insert into clause_changes (clause_id, draft_no, change_text) values
    (cl1, 'D1', 'GyfTR standard 80/20 revenue share.'),
    (cl1, 'D2', 'Meridian requested 70/30 citing volume commitment.');

  insert into clauses (agreement_id, clause_no, clause_name, outcome, full_context) values
    (ag1, '9', 'Liability Cap', 'pending', 'Meridian requesting liability cap raised from 1x to 3x annual fees.')
  returning id into cl2;
  insert into clause_changes (clause_id, draft_no, change_text) values
    (cl2, 'D1', 'Liability capped at 1x annual fees paid.'),
    (cl2, 'D2', 'Meridian requested 3x cap, citing integration risk.');

  -- ── Agreement 2: Ironclad Industries — final sign, all teams approved ──
  insert into agreements
    (client, tag, type, status, client_status, promise_date, start_date,
     spoc_legal, spoc_finance, spoc_business, spoc_compliance, client_dates, created_by)
  values
    ('Ironclad Industries', 'IRON', 'White Label', 'final', 'negotiating',
     current_date + interval '3 days', current_date - interval '40 days',
     'Nitin', 'Neha', 'Pankaj Mehta', 'Nikhil',
     '{"_seed_key":"demo-v1"}'::jsonb, uid_legal)
  returning id into ag2;

  insert into team_statuses (agreement_id, team_code, status, updated_by) values
    (ag2, 'L', 'Approved', 'Nitin'),
    (ag2, 'F', 'Approved', 'Neha'),
    (ag2, 'B', 'Approved', 'Pankaj Mehta'),
    (ag2, 'C', 'Approved', 'Nikhil');

  insert into history_log (agreement_id, team, changed_by, from_status, to_status) values
    (ag2, null, 'Nitin', 'review', 'Final Sign');

  insert into drafts (agreement_id, draft_no, direction, note, date, created_by) values
    (ag2, 'D1', 'sent',     'Initial white-label agreement draft.', current_date - interval '35 days', uid_legal),
    (ag2, 'D2', 'received', 'Ironclad accepted with minor branding-guideline edits.', current_date - interval '20 days', uid_legal),
    (ag2, 'D3', 'sent',     'Final version incorporating branding edits — ready to sign.', current_date - interval '5 days', uid_legal);

  insert into remarks (agreement_id, author_id, author_name, author_role, text) values
    (ag2, uid_legal, 'Nitin', 'Legal', 'Agreement created.'),
    (ag2, uid_compliance, 'Nikhil', 'Compliance', 'Compliance review complete — no outstanding concerns.');

  -- ── Agreement 3: Crestview Bank — closed, executed ──
  insert into agreements
    (client, tag, type, status, client_status, promise_date, start_date,
     spoc_legal, spoc_finance, spoc_business, spoc_compliance, client_dates, created_by)
  values
    ('Crestview Bank', 'CRES', 'Enterprise', 'closed', 'finalised',
     current_date - interval '15 days', current_date - interval '90 days',
     'Nitin', 'Neha', 'Pankaj Mehta', 'Nikhil',
     '{"_seed_key":"demo-v1"}'::jsonb, uid_legal)
  returning id into ag3;

  insert into team_statuses (agreement_id, team_code, status, updated_by) values
    (ag3, 'L', 'Approved', 'Nitin'),
    (ag3, 'F', 'Approved', 'Neha'),
    (ag3, 'B', 'Approved', 'Pankaj Mehta'),
    (ag3, 'C', 'Approved', 'Nikhil');

  insert into history_log (agreement_id, team, changed_by, from_status, to_status) values
    (ag3, null, 'Nitin', 'Final Sign', 'Closed');

  insert into remarks (agreement_id, author_id, author_name, author_role, text) values
    (ag3, uid_legal, 'Nitin', 'Legal', 'Agreement executed and filed.');

  raise notice 'Seeded 3 demo agreements (client_dates._seed_key = demo-v1).';
end $$;
