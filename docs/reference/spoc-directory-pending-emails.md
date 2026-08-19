# SPOC Directory — resolved

Real emails arrived (`Spocs_Updated.xlsx`, shared 2026-08-20) and are now
seeded directly in `backend/seed.sql` — see the "Real SPOC directory" block
there for the authoritative, current list. This file is kept only for the
two decisions made when seeding it, since neither is derivable from the
sheet alone:

- **"Nitin Kumar"** appears once, under **Legal only**. The sheet also
  listed him under Compliance with the same email — confirmed (2026-08-20)
  that this was wrong; he is not on the Compliance team. Do not add a
  Compliance row for him.
- **Bhuwaneshwar** (Legal) has no email in the sheet yet. Left out of
  `profiles` entirely — do not guess one. Add him to `backend/seed.sql`
  the same way as everyone else once a real address is provided.

The earlier version of this file assumed "Nitin" (Legal) and "Nitin Kumar"
(Compliance) were two different people, based on an older, less complete
copy of the spreadsheet. That assumption was wrong and has been dropped —
go by `Spocs_Updated.xlsx` / `backend/seed.sql`, not by anything below.

## What still needs a manual step

Seeding `profiles` is enough for:
- SPOC dropdowns (already pulled from `GET /api/users` — see
  `frontend/src/ui/app-logic.js` around `getUsers()`).
- Google SSO login (`docs/GOOGLE-SSO-RUNBOOK.md`) — `backend/middleware/loadProfile.js`
  auto-links a Google sign-in to its matching `profiles` row by verified
  email on first login, no extra step needed.

It is **not** enough on its own for native Cognito email/password login —
that still requires running `scripts/create-cognito-users.js` (see
`infra/aws-setup.md` §3/§8) to actually create each person's Cognito
account. If Google SSO goes live per the runbook, that script becomes
optional for anyone who only ever signs in via Google.
