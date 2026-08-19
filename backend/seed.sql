-- ═══════════════════════════════════════════════════════════
-- GyfTR Legal Portal — Seed (RDS)
--
-- Seeds the 4 real profiles every environment needs before anyone can log
-- in — without a matching `profiles` row, a Cognito account has nothing to
-- link to (`cognito_sub` stays NULL and the portal returns "No profile
-- linked to this account"). scripts/create-cognito-users.js reads these
-- rows to know who to create Cognito accounts for.
--
-- Safe to run anytime, including against production: every insert is
-- ON CONFLICT (email) DO UPDATE, so re-running just syncs name/role/team_code
-- to whatever's below rather than creating duplicates or erroring. It never
-- touches cognito_sub — linking only ever happens via
-- scripts/create-cognito-users.js / scripts/migrate-email-domain.js, never
-- here, so re-running this can't accidentally unlink an already-linked account.
--
-- Applied automatically on API boot, right after schema.sql — see
-- backend/db.js applySeed(). To add/remove someone, edit this file and
-- restart the API (or run it by hand: psql ... -f backend/seed.sql).
--
-- Fake/sample AGREEMENT data is deliberately NOT in this file — see
-- backend/seed-demo.sql for that, which is opt-in only and must never be
-- run against an environment holding real agreements (mixing real and
-- fake agreements in one account was an actual production bug earlier in
-- this project — see docs/KT.md — never again on purpose).
-- ═══════════════════════════════════════════════════════════

insert into profiles (email, name, role, team_code) values
  ('nitin@gyftr.net',        'Nitin',        'legal',      'L'),
  ('neha@gyftr.net',         'Neha',         'finance',    'F'),
  ('pankaj.mehta@gyftr.net', 'Pankaj Mehta', 'business',   'B'),
  ('nikhil@gyftr.net',       'Nikhil',       'compliance', 'C')
on conflict (email) do update set
  name      = excluded.name,
  role      = excluded.role,
  team_code = excluded.team_code;

-- ═══════════════════════════════════════════════════════════
-- Real SPOC directory — source: `Spocs_Updated.xlsx`, shared 2026-08-20.
-- Supersedes docs/reference/spoc-directory-pending-emails.md now that real
-- emails exist. Two decisions made explicitly by Yash when this was seeded:
--   - "Nitin Kumar" appears once, under Legal only — the sheet also listed
--     him under Compliance, but that's not correct; he is not on Compliance.
--   - Bhuwaneshwar (Legal) has no email in the sheet yet — left out entirely
--     until one is provided, rather than guessed. Add him the same way once
--     it lands.
-- Same idempotent ON CONFLICT (email) pattern as above — safe to re-run.
-- ═══════════════════════════════════════════════════════════
insert into profiles (email, name, role, team_code) values
  -- Legal
  ('neha.g@gyftr.com',           'Neha Goswami',            'legal',      'L'),
  ('nitin.k@gyftr.com',          'Nitin Kumar',              'legal',      'L'),
  ('kushagra.kourav@gyftr.com',  'Kushagra',                 'legal',      'L'),
  -- Finance
  ('pankaj@gyftr.com',           'Pankaj Sharma',            'finance',    'F'),
  ('nikunj.kanodia@gyftr.com',   'Nikunj Kanodia',           'finance',    'F'),
  ('ankit.a@gyftr.com',          'Ankit',                    'finance',    'F'),
  ('purnima.s@gyftr.com',        'Purnima',                  'finance',    'F'),
  -- Business
  ('anjali@gyftr.com',           'Anjali Gupta',             'business',   'B'),
  ('khushboo.n@gyftr.com',       'Khushboo Nagpal',          'business',   'B'),
  ('sandeep.k@gyftr.com',        'Sandeep Kumar',            'business',   'B'),
  ('rajiv.j@gyftr.com',          'Rajiv Jadon',               'business',   'B'),
  ('kavish@gyftr.com',           'Kavish',                    'business',   'B'),
  ('gautam.m@gyftr.com',         'Gautam Mehra',              'business',   'B'),
  ('anjali.j@gyftr.com',         'Anjali Jain',                'business',   'B'),
  ('neha.sharma@gyftr.com',      'Neha Sharma',                'business',   'B'),
  ('yashoda.s@gyftr.com',        'Yashoda',                    'business',   'B'),
  ('rajeev.m@gyftr.com',         'Rajeev Magan',               'business',   'B'),
  ('himanshu@gyftr.com',         'Himanshu Karamchandani',     'business',   'B'),
  ('shradha.s@gyftr.com',        'Shradha Pratap Singh',       'business',   'B'),
  ('pratishtha.r@gyftr.com',     'Pratishtha',                 'business',   'B'),
  -- Compliance
  ('pankaj.m@gyftr.com',         'Pankaj Mittal',              'compliance', 'C'),
  ('himanshu.k@gyftr.com',       'Himanshu Khanna',            'compliance', 'C')
on conflict (email) do update set
  name      = excluded.name,
  role      = excluded.role,
  team_code = excluded.team_code;
