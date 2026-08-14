# Deploying the Legal Portal

Operational runbook for shipping a new release to AWS. For first-time
provisioning of the AWS resources themselves, see
[`infra/aws-setup.md`](infra/aws-setup.md).

Everything below is run on the EC2 instance unless stated otherwise.

---

## Before you start

**`OPENAI_API_KEY` must be set in `backend/.env`.** This changed in the current
release. The OpenAI key used to come from the browser, which meant it was
compiled into the public JavaScript bundle where any user could read it. It is
now server-side only. Without it, AI clause analysis returns a clear
`503 AI analysis is not configured` instead of silently prompting users for a
key.

Use a **rotated** key — the previous one was exposed in the bundle and should
be treated as compromised.

---

## 1. Backend

```bash
cd /app/gyftr-legal && git pull
npm --prefix backend install
pm2 restart gyftr-legal-api
```

`backend/schema.sql` applies itself on start-up. Every statement is
`IF NOT EXISTS`, so restarting is safe and there is no manual migration step.

## 2. Frontend

```bash
cd /app/gyftr-legal
npm --prefix frontend install

# frontend/.env.local is gitignored — create it on a fresh checkout.
# Without it the build succeeds but every login fails.
cp frontend/.env.example frontend/.env.local     # fill VITE_API_URL + VITE_COGNITO_*

npm run build                                     # outputs to frontend/dist
aws s3 sync frontend/dist/ s3://<legal-bucket>/ --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

Never put a secret in `frontend/.env.local`. Anything prefixed `VITE_` is compiled into
the public bundle.

## 3. Require every user to set their own password

```bash
cd /app/gyftr-legal/scripts && npm install

export COGNITO_USER_POOL_ID=<pool-id>
export AWS_REGION=ap-south-1
export AWS_ACCESS_KEY_ID=<key>
export AWS_SECRET_ACCESS_KEY=<secret>

npm run force-password-reset -- --dry-run    # preview, changes nothing
npm run force-password-reset                 # prompt at next login
npm run force-password-reset -- --signout    # ...or end live sessions now
```

Accounts created by `create-cognito-users.js` are already forced to reset on
first login. This script is for accounts that are already `CONFIRMED` — people
who completed a login on the old shared password.

Add `--only=a@gyftr.net,b@gyftr.net` to target specific accounts.

## 4. Review who has access

```bash
export RDS_HOST=<endpoint> RDS_USER=<user> RDS_PASSWORD=<pass> RDS_DB=gyftr_legal
npm run audit-access                      # readable report + warnings
npm run audit-access -- --csv > access-review.csv   # for sign-off
```

Lists every profile with its role, team and Cognito status, and flags the
things that silently break a login: a profile with no `cognito_sub`, a Cognito
account with no profile, or a `sub` that no longer matches.

## 5. Verify the deploy actually works

```bash
export SMOKE_API_URL=https://api.<your-domain>
export SMOKE_TOKEN=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id <pool-id> --client-id <client-id> \
  --auth-flow ADMIN_USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=<test-user>,PASSWORD=<their-password> \
  --query 'AuthenticationResult.IdToken' --output text)

npm run smoke-test
```

Confirms the API is reachable, authenticated and actually reading RDS — rather
than `pm2 status` merely saying "online". Exits non-zero on failure, so it is
safe to wire into a deploy script.

---

## Do not run

**`migrate-email-domain.js`** — both `@gyftr.net` and `@gyftr.com` are accepted.
Interns are on `.net` and there is no need to move anyone. The script is kept
only in case a whole domain genuinely has to be retired later; it creates new
Cognito accounts and repoints `profiles.cognito_sub`, which is disruptive.

---

## Tell users after deploying

**Close the portal tab and open it again.** `sessionStorage` survives for the
life of a tab, and a stale `demo_role` left over from before this release makes
agreement creation show a success message without saving anything. Demo mode is
now compiled out of production builds, but an already-open tab can still be
carrying the old flag.

---

## If something looks wrong

| Symptom | Likely cause |
|---|---|
| `No profile linked to this account` | The Cognito user has no row in `profiles`. Add one — the portal does not auto-create profiles, by design. |
| AI analysis returns 503 | `OPENAI_API_KEY` is not set in `backend/.env`. |
| Every API call returns 401 | Frontend built without `VITE_COGNITO_*`, or the token expired — sign out and back in. |
| Browser blocks API calls (CORS) | `FRONTEND_URL` in `backend/.env` does not exactly match the CloudFront origin. |
| New entries do not persist | Check the browser console for a failed write; failed writes are queued in `frontend/src/lib/writeQueue.js` and replayed on the next successful load. |

Rollback is `git checkout <previous-sha> && npm install && pm2 restart` for the
backend, plus re-syncing the previous `dist/` to S3 for the frontend. The
schema changes are additive, so an older build runs fine against the newer
database.
