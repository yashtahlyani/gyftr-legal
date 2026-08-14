# GyfTR Legal Portal — Knowledge Transfer Document

**Repo:** `gyftr-legal` (github.com/yashtahlyani/gyftr-legal) · **Prepared:** 2026-07-15 · **Backend/hosting section updated:** 2026-08-04

This document is a full technical handoff of the GyfTR Legal Portal: what it is, how it's built, where it's deployed, and — most importantly — the known rough edges a new maintainer needs to know about before touching the code.

> **Superseded sections**: this doc was written when the app ran on Vercel +
> Supabase. It has since been migrated to a self-hosted AWS stack (S3 +
> CloudFront, ALB + EC2, RDS Postgres, Cognito). §1 (what this app does) and
> §5 (frontend deep dive) below are **still accurate** — only the backend,
> auth, and hosting changed. For everything backend/deployment-related, the
> current source of truth is **`infra/HANDOVER.md`** and **`infra/aws-setup.md`**,
> not §2/§4/§6/§7/§8/§9/§10 below, which are kept only as a historical record
> of the pre-migration Supabase architecture.

---

## 1. What this app does

A single-page portal for GyfTR's Legal team (and Finance/Business/Compliance stakeholders) to track legal agreements with clients end-to-end:

- Agreement lifecycle: pending → review → final → closed (or reopen).
- Per-team (Legal/Finance/Compliance/Business) review status on each agreement.
- Draft version history (sent/received), with document viewing/editing via Google Docs.
- Clause-by-clause negotiation tracking, with AI-assisted risk analysis (OpenAI).
- Remarks/comments, reminders ("nudges"), status-change history/audit log.
- E-signature workflow (Adobe Sign — partially wired, see §7).

Four demo roles exist: **Legal** (nitin@gyftr.net — full permissions, only role that can create agreements / change overall status), **Finance** (neha@gyftr.net), **Business** (pankaj.mehta@gyftr.net), **Compliance** (nikhil@gyftr.net). Demo password: `gyftr@1234`.

---

## 2. Tech stack at a glance (pre-migration — see `infra/HANDOVER.md` for current)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | **Vanilla JS (ES modules) + Vite 5** | No framework (no React/Vue). Multi-page app: `index.html` (login) + `app.html` (portal), both built by Vite. |
| Styling | Plain CSS | Single file: `src/css/style.css` (~740 lines). No Tailwind/CSS-in-JS. |
| Backend / DB | **Supabase** (Postgres + Auth + Storage + Edge Functions) | Project: `gyftr-legal`, ref `aiaeruajrbrxkoaqzdpp`, region `ap-south-1`. |
| Serverless AI endpoint | **Vercel Function** — `api/ai-analyze.js` | Node function, calls OpenAI. This is the one actually wired into the UI. |
| Supabase Edge Functions (Deno) | `analyse-drafts`, `sign-document`, `ai-analyze` | See §7 — one of these three is currently dead code. |
| AI providers | **OpenAI** `gpt-4o-mini` (live path) · **Anthropic Claude** `claude-sonnet-4-6` (wired in an edge function, but not called by the UI today) | |
| Document integration | **Google Drive / Docs / Picker APIs** + Google Identity Services (OAuth) | Client-side only, via `src/ui/google-api.js`. |
| E-signature | **Adobe Sign API** | Via `supabase/functions/sign-document`. |
| Hosting | **Vercel** | Project `gyftr-legal`, project ID `prj_cmJr3gjjUz6PoFj2pTrU9pVshEjV`. Static build (`dist/`) + the one Vercel Function. |
| CI | **GitHub Actions** (`.github/workflows/ci.yml`) | Installs deps + `npm run build` on push/PR to `main`. No test suite exists. |
| Package manager | npm (`package-lock.json`) | Only real dependency: `@supabase/supabase-js`. Dev dependency: `vite`. |

There is no test framework, no linter config, and no TypeScript on the frontend (the Supabase Edge Functions are TypeScript/Deno).

---

## 3. Repository map (pre-migration snapshot — `backend/`, `scripts/`, and `infra/` did not exist yet; `api/ai-analyze.js` has since been removed and ported into `backend/routes/ai-analyze.js`)

```
gyftr-legal/
├── index.html                # Login page entry (Vite input)
├── app.html                  # Main portal shell (Vite input) — contains a large legacy
│                              #   inline <script> block, see §6.5 "Known issues"
├── legal_portal_v9 (9).html   # Original single-file prototype this app was extracted from
│                              #   (kept for reference — not built/deployed)
├── vite.config.js             # Two build entries: index.html + app.html, target esnext
├── package.json
├── api/
│   └── ai-analyze.js          # Vercel serverless function — OpenAI clause-risk analysis (LIVE)
├── src/
│   ├── login.js               # Entry point for index.html — role picker + demo/real auth
│   ├── main.js                # Entry point for app.html — auth gate + orchestration
│   ├── lib/
│   │   └── supabase.js        # Supabase client singleton (with offline stub fallback)
│   ├── auth/
│   │   ├── login.js           # signIn/signOut/getProfile helpers — NOT currently used
│   │   └── guard.js           # requireAuth() route guard — NOT currently used
│   ├── data/                  # Supabase CRUD wrapper modules — MOSTLY NOT used by the live
│   │   ├── agreements.js      #   app; app-logic.js reimplements this logic inline instead.
│   │   ├── drafts.js          #   Kept as a cleaner reference / future refactor target.
│   │   ├── remarks.js
│   │   ├── reminders.js       # Reminders/nudges here are NOT wired to the live UI (see §6.5)
│   │   ├── team-status.js
│   │   ├── clauses.js         # analyseWithClaude() → calls the unused analyse-drafts function
│   │   └── sample.js          # Demo dataset — ALSO duplicated inline in app-logic.js (live copy)
│   ├── ui/
│   │   ├── utils.js           # fd/ns/td/parseTs/diffLabel/showToast/wordDiff/promiseDaysLeft
│   │   ├── app-logic.js       # THE APP — ~2600 lines, all screens/modals/state (see §5)
│   │   ├── google-api.js      # Google Picker/Drive/Docs integration (~820 lines, see §5.3)
│   │   └── ai-analyze.js      # AI-analysis UI, calls /api/ai-analyze (~230 lines)
│   └── css/style.css
├── supabase/
│   ├── schema.sql              # Tables, RLS policies, storage bucket — run once in SQL editor
│   ├── seed.sql                 # Idempotent seed: profiles + 6 demo agreements + related rows
│   └── functions/
│       ├── analyse-drafts/     # Claude-based clause diff — NOT called by current UI
│       ├── sign-document/      # Adobe Sign integration — wired to signature UI (partially)
│       └── ai-analyze/         # OpenAI clause analysis — DUPLICATE of api/ai-analyze.js, NOT called
├── .github/workflows/ci.yml
├── .env.example
└── dist/                       # Last production build output (checked in — see note below)
```

> **Note:** `dist/` is present in the working tree in this snapshot. Normally build output shouldn't be committed — check whether it's actually tracked in git (`.gitignore` does list `dist/`) or just a local leftover build before deciding whether to delete it.

---

## 4. Architecture (pre-migration — see `infra/HANDOVER.md` "Architecture, plain language" for the current AWS diagram)

```mermaid
flowchart TB
    subgraph Browser
        A[index.html\nlogin.js] -->|demo role or\nSupabase auth| B[app.html\nmain.js]
        B --> C[app-logic.js\nall screens/state]
        C --> D[google-api.js\nDrive/Docs/Picker]
        C --> E[ai-analyze.js]
    end
    E -->|POST /api/ai-analyze| F[Vercel Function\napi/ai-analyze.js]
    F -->|chat/completions| G[OpenAI gpt-4o-mini]
    C -->|db.from(...).select/insert/update| H[(Supabase Postgres\n+ RLS)]
    C -->|auth.signInWithPassword| I[Supabase Auth]
    C -->|storage signed URLs| J[Supabase Storage\nlegal-drafts bucket]
    D -->|OAuth token| K[Google Identity Services]
    D -->|fetch| L[Google Drive/Docs REST API]
    H -.->|edge functions, not called by UI| M[analyse-drafts fn\nClaude]
    H -.-> N[ai-analyze fn\nOpenAI - duplicate, unused]
    O[sign-document fn] -->|createSignedUrl + adobe API| P[Adobe Sign API]
    C -->|invoke, partially wired| O
```

Key point for a new maintainer: **this is not a clean client → API → DB architecture.** The frontend (`app-logic.js`) talks to Supabase directly from the browser using the anon key + Row Level Security for authorization — there is no dedicated backend API layer for CRUD. The only genuine server-side compute is the one Vercel Function for AI analysis (to keep the OpenAI key off the client) and the Supabase Edge Functions (Adobe Sign needs a client secret; the other two AI edge functions exist but aren't called).

---

## 5. Frontend deep dive

### 5.1 Entry points

- **`index.html` → `src/login.js`**: role-pill UI. Clicking a role pill autofills a demo email + password. `handleLogin()` checks if the typed/selected email matches one of the 4 demo emails — if so it **bypasses auth entirely** (`sessionStorage.demo_role` + redirect to `/app.html`). Otherwise it calls `signIn()` from `src/lib/auth-cognito.js` (Cognito — this was `db.auth.signInWithPassword` pre-migration).
- **`app.html` → `src/main.js`**: on load, checks `sessionStorage.demo_role` first (demo mode, no auth check), otherwise requires a real Cognito session via `restoreSession()` (redirects to `/index.html` if absent — this was `db.auth.getSession()` pre-migration). Then dynamically imports (in order) `google-api.js`, `ai-analyze.js`, and finally `app-logic.js`. Once `app-logic.js` resolves, `main.js` wires up the topbar, shows the app shell, and — **if not in demo mode** — calls `window._loadFromApi()` to hydrate live data from the backend (was `window._loadFromSupabase()` pre-migration), replacing the sample rows.

### 5.2 `src/ui/app-logic.js` — the core (~2600 lines)

No framework, no templating engine: screens are built as big HTML template-literal strings assigned to `.innerHTML`, wired back up via inline `onclick="fnName(...)"` attributes that call functions attached to `window` (because ES module scope doesn't leak to `window`, the bottom of the file does `Object.assign(window, {...~50 functions...})`).

Screens/features implemented here:
- Main dashboard table + stat cards + filters (status/type/team/search, Cmd/Ctrl+K global search)
- Status history modal (audit trail, with computed turnaround durations)
- Remarks/comments modal
- Drafts timeline modal (upload, sent/received direction, turnaround flagging >7 days as slow)
- Document viewer/editor screen (Google Doc iframe, or a generated "simulated" document if none linked)
- E-signature modal (Legal/Business roles only)
- Create-agreement modal (Legal only)
- Client detail screen (dates, client-facing status)
- Dashboard screen (KPI cards, bottleneck list, nudge/reminder list, turnaround chart)
- Clause Analysis screen — 3 modes: Matrix (all drafts × all clauses), Compare (word-diff between any two drafts), AI (delegates to `ai-analyze.js`)
- Export screen (generates downloadable static HTML reports)

Role/permission gating is done ad-hoc throughout via `role === "legal"` (or similar) checks scattered across functions — there's no centralized permission utility.

### 5.3 `src/ui/google-api.js` (~820 lines)

Handles picking a document from Google Drive (Picker API), viewing/editing it (Docs iframe or a `contenteditable` div for Word docs converted via `mammoth.js`, loaded from CDN), autosaving (every 30s, to `localStorage` always and to Drive if authenticated), a custom inline-commenting layer (not Google's native comments — a homegrown `<mark>`-based system), and "save a copy to my Drive." Auth uses Google Identity Services' implicit token flow — the access token lives in memory only, so users must re-consent each session.

### 5.4 `src/ui/ai-analyze.js` (~230 lines)

Calls `POST {VITE_API_URL}/api/ai-analyze` (the Express backend's `ai-analyze` route — this was the Vercel Function `api/ai-analyze.js` pre-migration; same OpenAI logic, unauthenticated by design in both) with the agreement's clause/draft history + optional current doc text. Renders a summary risk-score ring, deal-health badge, and a table with one row per clause (client's ask vs. what GyfTR got, risk, AI observation, recommendation). The OpenAI key can come from a user-pasted value stored in `localStorage` (`gyftr_openai_key`) or fall back to the server-side env var — the client-storage path is worth reconsidering for production hardening.

### 5.5 `src/ui/utils.js`

Small formatting/diff helpers: `fd` (date format), `ns`/`td` (now/today strings — **inconsistent timezone handling**, `ns()` is local time, `td()` uses `toISOString()` i.e. UTC — a latent source of off-by-one-day bugs near midnight IST), `diffLabel`/`parseTs` (duration formatting), `wordDiff` (naive word-set diff, not sequence-aware), `showToast`, `renderPromiseBadge`, `promiseDaysLeft`.

---

## 6. Backend — Supabase (pre-migration; replaced by an Express API on RDS — see `infra/HANDOVER.md` "Authorization model" and `backend/schema.sql`)

### 6.1 Schema (`supabase/schema.sql`)

Tables: `profiles` (extends `auth.users`; role ∈ legal/finance/business/compliance; team_code ∈ L/F/C/B), `agreements`, `drafts`, `team_statuses`, `remarks`, `history_log`, `clauses`, `clause_changes`, `reminders`, `signatures`. Plus a private Storage bucket `legal-drafts`.

### 6.2 Row Level Security

RLS is enabled on every table. General pattern: any authenticated user can `SELECT` everything; only `role = 'legal'` can insert/update `agreements` or upload `drafts`; each team can only update its own `team_statuses` row (Legal can update all); everyone can insert `remarks`/`history_log`/`reminders`. Storage policies restrict the `legal-drafts` bucket to authenticated users only.

### 6.3 Seeding (`supabase/seed.sql`)

Idempotent (safe to re-run): patches a couple of RLS policies that were missing from `schema.sql` originally, upserts the 4 demo `profiles` rows by joining on `auth.users.email` (so no hardcoded UUIDs are needed — create the 4 users in the Auth dashboard first, using emails `nitin@gyftr.net`, `neha@gyftr.net`, `pankaj.mehta@gyftr.net`, `nikhil@gyftr.net`), then seeds 6 demo agreements with realistic drafts/clauses/history.

### 6.4 Setup order for a fresh environment

1. Create Supabase project → get URL + anon key → `.env.local`.
2. Run `schema.sql` in SQL editor.
3. Create the 4 auth users in Dashboard → Authentication → Users (same emails as above).
4. Run `seed.sql`.
5. `npm install && npm run dev`.

### 6.5 Known issues / tech debt (important — read before making changes)

1. **Sample data is duplicated three times, and the "obvious" place to edit isn't the live one.** `src/data/sample.js` exports `ROLES`/`AGs`, but `src/ui/app-logic.js` has its own inline copy of the exact same data at the top of the file, and that inline copy is what the running app actually uses (module-scope shadowing). **Editing `sample.js` alone does nothing visible.** To change demo data, edit inside `app-logic.js`.
2. **`buildDocSimulation`** (fake document renderer) is defined in both `app-logic.js` and `google-api.js` — whichever loads last wins at runtime (currently `google-api.js`'s version, since it's imported before `app-logic.js` resolves... but check load order if this ever misbehaves).
3. **The formatting helpers in `utils.js`** (`fd`, `ns`, `td`, etc.) are also duplicated inline in `app-logic.js`.
4. ~~`src/data/*.js` ... are dead code~~ **RESOLVED by the AWS migration**: these files (and `src/auth/login.js`/`guard.js`) were confirmed unused and deleted. All live data access now goes through `src/lib/api.js`, which talks to the new `backend/` Express API.
5. **Reminders/"nudges" are not persisted.** Still true post-migration. The UI's `sendNudge` only writes to an in-memory object (`reminderLog`); a DB-backed `reminders` route now exists on the backend (`backend/routes/reminders.js`) but the frontend still never calls it. Nudges disappear on page refresh.
6. ~~Two unused AI/analysis paths exist server-side~~ **PARTIALLY RESOLVED**: the live OpenAI path (`api/ai-analyze.js`) was ported to `backend/routes/ai-analyze.js`. The unused Supabase Edge Functions (`supabase/functions/ai-analyze` duplicate, and the Claude-based `supabase/functions/analyse-drafts`) were **not** ported — their source is kept under `supabase/functions/` for reference only. See `infra/HANDOVER.md` if reviving the Claude path is wanted.
7. **`app.html` contains a ~1000-line legacy inline `<script>`** (an older, non-module copy of the whole app with different sample data) that still runs on page load, but gets fully overwritten once the ES module bundle (`main.js` → `app-logic.js`) finishes loading, because both define the same `window`-scoped function/variable names. It's functionally harmless but dead weight — safe to delete once you've verified nothing depends on it executing first.
8. E-signature flow (`sign-document` edge function + `signBar`/sign modal in the UI) exists but hasn't been described here as fully verified end-to-end with real Adobe Sign credentials — treat as "built, likely needs a real Adobe Sign sandbox test" rather than "battle-tested."

---

## 7. Third-party integrations & environment variables (pre-migration — see `infra/aws-setup.md` §10 for current env vars)

| Variable | Where used | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Client (build-time) | Supabase client config |
| `VITE_OPENAI_API_KEY` | Client (build-time, fallback) + Vercel function | AI clause analysis (OpenAI) |
| `VITE_GOOGLE_DOCS_API_KEY`, `VITE_GOOGLE_DRIVE_API_KEY`, `VITE_GOOGLE_PICKER_API_KEY`, `VITE_GOOGLE_OAUTH_CLIENT_ID` | Client (build-time) | Google Picker/Drive/Docs integration — **must be HTTP-referrer restricted in Google Cloud Console** |
| `OPENAI_API_KEY` | Vercel function (`api/ai-analyze.js`) server-side env | Preferred server-side key so it's never in the client bundle |
| `CLAUDE_API_KEY` | Supabase secret (`supabase secrets set`) | Used by the (currently unused) `analyse-drafts` edge function |
| `ADOBE_CLIENT_ID`, `ADOBE_CLIENT_SECRET` | Supabase secret | `sign-document` edge function → Adobe Sign API |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Supabase edge functions (auto-provided) | Service-role DB access inside edge functions |

All client-side (`VITE_*`) values are baked into the built JS bundle at build time and are visible to anyone — this is expected/fine for anon keys and Google keys restricted by referrer, but never put a secret needing confidentiality behind a `VITE_` prefix.

---

## 8. Deployment (pre-migration — see `infra/aws-setup.md` §9 for current deploy steps)

**Frontend + AI Vercel Function:**
- Vercel project: `gyftr-legal` (project ID `prj_cmJr3gjjUz6PoFj2pTrU9pVshEjV`).
- Standard Vercel Git integration — push to `main` deploys to production; PRs get preview deployments.
- Build command: `npm run build` (Vite outputs to `dist/`, two HTML entry points).
- Set the `VITE_*` and `OPENAI_API_KEY` env vars in the Vercel project settings (Production + Preview).

**Supabase Edge Functions** (manual deploy, not part of CI):
```bash
npm install -g supabase
supabase login
supabase link --project-ref aiaeruajrbrxkoaqzdpp
supabase functions deploy analyse-drafts
supabase functions deploy sign-document
supabase functions deploy ai-analyze   # currently unused by the UI, deploy only if reviving it
supabase secrets set CLAUDE_API_KEY=...
supabase secrets set ADOBE_CLIENT_ID=...
supabase secrets set ADOBE_CLIENT_SECRET=...
```

**CI (`.github/workflows/ci.yml`):** GitHub Actions runs on push/PR to `main` — installs deps and runs `npm run build` with placeholder Supabase env vars, purely to catch build breakage. It does not run tests (none exist) and does not deploy anything.

---

## 9. Local development setup (pre-migration — see `README.md` "Setup — Step by Step" for current)

```bash
git clone <repo>
cd gyftr-legal
npm install
cp .env.example .env.local   # fill in Supabase + Google + OpenAI keys
npm run dev                  # http://localhost:7979
```

To exercise the full stack locally you also need: the 4 demo users created in your Supabase project's Auth dashboard, `schema.sql` and `seed.sql` run against it, and (optionally) the edge functions deployed if you want AI analysis / e-signature to work against your own Supabase project rather than production.

`npm run build` / `npm run preview` build and serve the production bundle locally.

---

## 10. Where things live (pre-migration — see `infra/HANDOVER.md` "Support" and `infra/aws-setup.md` for current AWS resource names)

- **GitHub:** `github.com/yashtahlyani/gyftr-legal`
- ~~Vercel project: `gyftr-legal` (org `team_Mx4mOXDA81DCUtFiCC2Wo78V`)~~ — decommissioned; frontend now serves from S3 + CloudFront.
- ~~Supabase project: `gyftr-legal`, ref `aiaeruajrbrxkoaqzdpp`, region `ap-south-1`~~ — decommissioned after `scripts/migrate-db.js` ran; database is now RDS. The Supabase project reference is still useful if you ever need to re-run the migration script against the old data.
- **Google Cloud Console project:** wherever the `VITE_GOOGLE_*` keys were provisioned — unrelated to this migration, unchanged. Not identifiable from the repo, check with whoever set up the OAuth consent screen / API keys.
- **Adobe Sign / Adobe Developer Console:** wherever `ADOBE_CLIENT_ID`/`SECRET` were provisioned — unrelated to this migration, unchanged.

---

## 11. Suggested priority order for a new maintainer

1. Read this doc + `infra/HANDOVER.md` + `CLAUDE.md` + `CONTRIBUTING.md` in repo root. `infra/HANDOVER.md` is the current source of truth for backend/deployment; treat §2/§4/§6–§10 above as historical context only.
2. Get a local dev environment running (demo-mode login works with zero AWS setup; real accounts need the backend running and Cognito configured — see README §Setup).
3. Decide what to do with the remaining known duplication (§6.5 items 1, 2, 3, 7 below — items 4 and 6 were resolved during the AWS migration, see `infra/HANDOVER.md` "Decisions made during the migration"): the sample data/formatting-helper duplication between `sample.js`/`utils.js` and their inline copies in `app-logic.js` is still there and untouched by the migration.
4. Verify the Adobe Sign e-signature flow end-to-end with real sandbox credentials before relying on it in production — this didn't change in the migration, still unverified.
5. Decide whether reminders/nudges and the Drafts modal should be made persistent — both now have a working backend (`backend/routes/reminders.js`, `backend/routes/drafts.js` + S3) but the frontend still doesn't call them, matching pre-migration behavior. See `infra/HANDOVER.md` "Common changes cookbook" for how to wire them up.
