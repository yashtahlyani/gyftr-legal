# SPOC Directory — pending email addresses

Source: `Enhancements Legal Panel V2.pdf`, "Functional Spec v4," Section 8
(`Spocs.xlsx`, as shared). Captured here so this list survives until the
missing emails land — **do not seed this into `profiles` with fabricated
emails**; `profiles.email` is the login identity (matched against real
Google/Cognito accounts), and a wrong or placeholder email here would
either block that person's real login or silently attach their agreements
to the wrong account later.

Once Siddharth provides real email addresses, insert them into `profiles`
(see `backend/seed.sql` for the pattern) — `role` maps Legal→`legal`,
Finance→`finance`, Compliance→`compliance`, Business→`business`;
`team_code` maps to `L`/`F`/`C`/`B` respectively.

## Legal (`role='legal'`, `team_code='L'`)
| Name | Email |
|---|---|
| Neha Goswami | *pending* |
| Nitin | *pending — see note below* |
| Bhuwaneshwar | *pending* |
| Kushagra | *pending* |

## Finance (`role='finance'`, `team_code='F'`)
| Name | Email |
|---|---|
| Pankaj Sharma | *pending* |
| Nikunj Kanodia | *pending* |
| Ankit | *pending* |
| Purnima | *pending* |

## Compliance (`role='compliance'`, `team_code='C'`)
| Name | Email |
|---|---|
| Pankaj Mittal | *pending* |
| Nitin Kumar | *pending — see note below* |
| Himanshu Khanna | *pending* |

## Business (`role='business'`, `team_code='B'`)
| Name | Email |
|---|---|
| Anjali Gupta | *pending* |
| Khusboo Nagpal | *pending* |
| Sandeep Kumar | *pending* |
| Rajiv Jadon | *pending* |
| Kavish | *pending* |
| Gautam Mehra | *pending* |
| Anjali Jain | *pending* |
| Neha Sharma | *pending* |
| Yashoda | *pending* |
| Rajiv Magan | *pending* |
| Himanshu Karamchandani | *pending* |
| Shradhha Pratap Singh | *pending* |
| Pratishta | *pending* |

## Note on the two "Nitin"s

The source spreadsheet listed "Nitin Kumar" under both Legal and
Compliance. The spec confirms these are two different people: **"Nitin"**
(Legal) and **"Nitin Kumar"** (Compliance) — kept as two distinct rows
above. Don't collapse them into one profile.

## What replaces the current 4-profile seed

`backend/seed.sql` currently seeds exactly 4 people (one per team —
Nitin/Neha/Pankaj Mehta/Nikhil), matching the tool's original 4-person
model. This spec's directory has ~28 people across the same 4 teams — a
real multi-person roster. Once emails are available, `seed.sql` (or a
follow-up seed file) needs to grow from "one person per team" to "N people
per team," and every place in the frontend that currently assumes exactly
one SPOC per team (the SPOC dropdowns fixed earlier this project, the
`ROLES[role]` single-person-per-role model in `app-logic.js`) needs the
same `GET /api/users`-backed treatment already used for the SPOC dropdowns
— see `infra/HANDOVER.md` "Common changes cookbook."
