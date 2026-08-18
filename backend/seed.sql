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
