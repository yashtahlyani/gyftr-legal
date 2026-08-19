# Google SSO Runbook — GyfTR Legal Portal

All the code for "Sign in with Google" is already built and merged
(`frontend/src/lib/auth-google-sso.js`, the button on the login page,
`backend/middleware/loadProfile.js`'s auto-linking). What's below is the
~15-minute AWS Console + Google Cloud Console setup needed to make it live —
this can't be done from this environment, since it needs a Workspace admin
login for Google and AWS Console/CLI access for Cognito, neither of which
are available here.

**Split, matching the existing AWS split**: the Google Cloud OAuth client
(step A) needs whoever administers the `gyftr.com` Google Workspace.
Cognito + env vars (steps B–C) are Chandan's side (same as every other
Cognito config change).

---

## A. Google Cloud Console — create the OAuth client

1. Go to [console.cloud.google.com](https://console.cloud.google.com), select
   (or create) the project tied to the `gyftr.com` Workspace.
2. **APIs & Services → OAuth consent screen**:
   - User type: **Internal** — restricts sign-in to `gyftr.com` accounts
     only, which is almost certainly what's wanted for an internal legal
     tool. (If external contractors ever need access, this needs to be
     **External** instead + those users added explicitly — flag that
     tradeoff back rather than assuming.)
   - App name: `GyFTR Legal Portal`, support email: any real one.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `gyftr-legal-cognito`
   - Authorized redirect URIs: `https://<cognito-domain>/oauth2/idpresponse`
     — `<cognito-domain>` is decided in step B.4 below; come back and fill
     this in once that's known (or add it after B.4, then re-save here).
4. Save the **Client ID** and **Client secret** — needed in step B.2.

## B. AWS Cognito Console — add Google as an identity provider

1. **Cognito → User pools → `gyftr-legal-users`** (the pool from
   `infra/aws-setup.md` §3).
2. **Sign-in experience → Federated identity provider sign-in → Add identity
   provider → Google**. Paste the Client ID / Client secret from A.4.
   Scopes: `openid email profile`. Attribute mapping: Google `email` →
   Cognito `email`, Google `name` → Cognito `name`.
3. **App integration → Domain**: set up a Cognito Hosted UI domain if one
   doesn't already exist (e.g. prefix `gyftr-legal` →
   `gyftr-legal.auth.ap-south-1.amazoncognito.com`). This is `<cognito-domain>`
   from A.3 — go back and confirm that redirect URI is saved.
4. **App integration → App client (`gyftr-legal-web`) → Hosted UI**:
   - Identity providers: enable both **Google** and **Cognito user pool**
     (native email/password must keep working).
   - Allowed callback URLs — add one line per environment, **exact match
     required** (no trailing slash):
     - `https://<prod-frontend-domain>/index.html`
     - `http://localhost:5555/index.html` (or whatever port `npm run dev`
       actually uses locally)
   - Allowed sign-out URLs: same list (Cognito requires at least one; the
     app doesn't currently use Cognito's hosted sign-out, but the field is
     mandatory).
   - OAuth grant type: **Authorization code grant**.
   - OpenID scopes: `openid`, `email`, `profile`.
5. Save.

## C. Set the one new env var and redeploy the frontend

Add to `frontend/.env.local` (or wherever the build pipeline injects
frontend env vars — see `frontend/buildspec.yml`), alongside the existing
`VITE_COGNITO_USER_POOL_ID` / `VITE_COGNITO_CLIENT_ID`:

```
VITE_COGNITO_DOMAIN=gyftr-legal.auth.ap-south-1.amazoncognito.com
```

(No `https://`, no trailing slash — just the host.) No backend env changes
needed: `backend/middleware/auth.js` verifies any ID token issued by the
same user pool + app client, regardless of which identity provider signed
the person in.

Rebuild and redeploy the frontend the normal way (`DEPLOY.md`). Until
`VITE_COGNITO_DOMAIN` is set, the "Continue with Google" button on the login
page stays hidden and nothing else changes — this is safe to deploy at any
point, not just once every step above is done.

## D. Verify

1. Load the login page — the "Continue with Google" button should now be
   visible under the email/password form.
2. Sign in with a real `@gyftr.com` account that has a matching row in
   `profiles` (the 22 people seeded in `backend/seed.sql`'s "Real SPOC
   directory" block — Bhuwaneshwar isn't seeded yet, so his sign-in will
   fail with "No profile linked to this account" until he is).
3. First-ever Google login for that person links their `profiles` row
   automatically (matched by verified email) — no need to also run
   `scripts/create-cognito-users.js` for them.

## Gotchas worth knowing before debugging one live

- **Redirect URI must match exactly** in three places at once: Google's
  OAuth client (A.3), Cognito's app client callback URLs (B.4), and what the
  frontend actually sends (`auth-google-sso.js` always sends
  `${window.location.origin}/index.html`). Any mismatch — including a
  trailing slash — fails with a `redirect_uri_mismatch` page from Google or
  Cognito, before the app ever sees an error.
- **Internal consent screen** (A.2) means only `gyftr.com` Workspace
  accounts can complete Google sign-in at all — Google rejects everyone else
  before Cognito is even involved. Confirm that's actually the intent.
- **Pick one login method per person for now.** If someone already has a
  native Cognito account (via `create-cognito-users.js`) and later tries
  Google SSO with the same email, `loadProfile.js` deliberately does **not**
  silently re-link them to the new Google identity — it 403s instead, to
  avoid two different Cognito identities racing to claim one profile. Mixing
  methods per person isn't supported by this first cut.
- **Domain assumption**: everything above assumes `gyftr.com` is the correct
  Workspace domain — that's what the actual SPOC roster spreadsheet used.
  Don't proceed if that's wrong.
