# Deploying the Legal Portal

Operational runbook for shipping a new release to AWS. For first-time
provisioning of the AWS resources themselves, see
[`infra/aws-setup.md`](infra/aws-setup.md).

Both the backend and frontend run as Docker containers on ECS (built via
`backend/buildspec.yml` / `frontend/buildspec.yml`, pushed to ECR) — **not**
on an EC2 instance you SSH into, and the frontend is **not** synced to S3.
`docker-compose.yml` mirrors the same two-container shape for local testing.
Steps 1–2 below assume CodeBuild/CodePipeline (or an equivalent manual
`docker build && docker push`) already exists for this branch — if you're
setting that up for the first time, the cluster name, service names, and
whether a push here auto-triggers a deploy are decisions made outside this
repo (task definitions aren't checked in). Confirm with whoever provisioned
the ECS side before assuming either of those.

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

Merging/pushing to this branch should trigger `backend/buildspec.yml` in
CodeBuild (if CodePipeline is watching this branch — confirm that, don't
assume it). That builds `backend/Dockerfile`, pushes to ECR, and writes
`imagedefinitions.json`, which an ECS deploy stage uses to roll the API
service. If there's no pipeline wired up yet, the equivalent by hand is:

```bash
docker build --platform linux/arm64 -t <backend-ecr-repo>:<tag> ./backend
docker push <backend-ecr-repo>:<tag>
aws ecs update-service --cluster <cluster> --service <backend-service> --force-new-deployment
```

`backend/schema.sql` applies itself on start-up, and `backend/seed.sql`
(the 4 real profiles) runs right after it — both idempotent, so a fresh
task starting up is safe with no manual migration step.

Check it came up — and that it can actually reach the database:

```bash
curl -s https://<api-host>/health        # {"ok":true} — process is alive
curl -s https://<api-host>/health/deep   # {"ok":true,"database":"reachable"}
```

`/health` only proves the process is running; it is what the ALB polls and it
deliberately does not touch the database. **`/health/deep` is the one that
matters when something is wrong** — it returns 503 if the database is
unreachable. "ECS says the task is running and healthy while the portal is
dead" is exactly the gap it closes.

## 2. Frontend

Same pipeline shape as the backend — `frontend/buildspec.yml` builds
`frontend/Dockerfile` (a Vite build served by `serve` on port 7979, not a
static S3 bundle) and pushes to ECR for its own ECS service. By hand:

```bash
docker build --platform linux/arm64 \
  --build-arg VITE_API_URL=https://<api-host> \
  --build-arg VITE_COGNITO_USER_POOL_ID=<pool-id> \
  --build-arg VITE_COGNITO_CLIENT_ID=<client-id> \
  -t <frontend-ecr-repo>:<tag> ./frontend
docker push <frontend-ecr-repo>:<tag>
aws ecs update-service --cluster <cluster> --service <frontend-service> --force-new-deployment
```

All `VITE_*` values are baked in at **build** time via `--build-arg` — there
is no `frontend/.env.local` step in this flow (that file is for local
`npm run dev` only, see `frontend/.env.example`). Get the build wrong and
the container serves fine but every login fails silently — this is the exact
failure `.github/workflows/ci.yml`'s frontend build step guards against
before it ever reaches a container.

Never put a secret in a `VITE_*` build arg. Anything prefixed `VITE_` is
compiled into the public bundle.

## 3. Require every user to set their own password

Run from your own machine (or anywhere with these AWS credentials
configured) — these ops scripts talk to Cognito/RDS directly over the
network, they don't run inside either container:

```bash
cd scripts && npm install

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
than the ECS task merely showing as "running". Exits non-zero on failure, so
it is safe to wire into a deploy script.

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
| Browser blocks API calls (CORS) | `FRONTEND_URL` in the API's environment does not exactly match the origin the browser actually loads the frontend from. |
| New entries do not persist | Check the browser console for a failed write; failed writes are queued in `frontend/src/lib/writeQueue.js` and replayed on the next successful load. |

Rollback is redeploying the previous image tag for each ECS service
(`aws ecs update-service --cluster <cluster> --service <service> --task-definition <family>:<previous-revision>`,
or re-running the pipeline against the previous commit) — there is no `dist/`
to re-sync and no process to `pm2 restart`, since neither container is
managed that way. Schema changes are additive, so an older image runs fine
against the newer database.

---

## Something is broken and you do not know why — start here

```bash
cd scripts && npm install
npm run doctor
```

Needs no AWS credentials and no VPN — run it from anywhere. It walks DNS →
load balancer → API → database → CORS and stops at the first layer that is
actually broken, then prints what to change.

Paste its output when reporting a problem. "It is still not working" cannot be
acted on; this can.

```bash
# non-default URLs
npm run doctor -- --frontend https://legal.gyftr.net --api https://legal-api.gyftr.net
```

Common verdicts:

| It says | It means |
|---|---|
| Frontend 503 | The load balancer has no healthy target for the frontend container. Check the ECS running vs desired count and the target group. |
| API 503 | Same for the API — usually the container is crash-looping. Check the task logs. |
| API up, database not ready | The API is fine; it cannot reach RDS. It now says exactly why and keeps retrying. Check `DB_HOST` / `AWS_SECRET_NAME` and the RDS security group. |
| CORS does not allow the frontend | `FRONTEND_URL` in the API environment must match the site origin exactly, no trailing slash. curl works, the browser does not. |
