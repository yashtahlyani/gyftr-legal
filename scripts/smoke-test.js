/**
 * smoke-test.js — run this right after deploying (or redeploying) the
 * backend, to confirm the API is actually reachable, authenticated, and
 * talking to the real database — not just that `pm2 status` says "online".
 *
 * Usage:
 *   cd migration && npm install
 *   export SMOKE_API_URL=https://legal-api.gyftr.net
 *   export SMOKE_TOKEN=<a real Cognito ID token>   # see below for how to get one
 *   node smoke-test.js
 *
 * Getting a token to test with:
 *   aws cognito-idp admin-initiate-auth \
 *     --user-pool-id <pool-id> --client-id <client-id> \
 *     --auth-flow ADMIN_USER_PASSWORD_AUTH \
 *     --auth-parameters USERNAME=<test-user-email>,PASSWORD=<their-password> \
 *     --query 'AuthenticationResult.IdToken' --output text
 *
 * Exits non-zero if anything fails, so it's safe to wire into a deploy script.
 */

const API_URL = process.env.SMOKE_API_URL;
const TOKEN   = process.env.SMOKE_TOKEN;

if (!API_URL) {
  console.error('SMOKE_API_URL env var is required (e.g. https://legal-api.gyftr.net)');
  process.exit(1);
}

const results = [];

async function check(name, fn) {
  process.stdout.write(`  ${name.padEnd(48)}`);
  try {
    await fn();
    console.log('PASS');
    results.push({ name, ok: true });
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    results.push({ name, ok: false, error: err.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log(`=== GyfTR Legal Portal — smoke test against ${API_URL} ===\n`);

  await check('GET /health returns ok', async () => {
    const res = await fetch(`${API_URL}/health`);
    assert(res.ok, `status ${res.status}`);
    const body = await res.json();
    assert(body.ok === true, 'unexpected body: ' + JSON.stringify(body));
  });

  await check('GET /api/agreements without a token is rejected (auth is actually enforced)', async () => {
    const res = await fetch(`${API_URL}/api/agreements`);
    assert(res.status === 401, `expected 401, got ${res.status} — the API may not be enforcing auth`);
  });

  await check('POST /api/ai-analyze is reachable without a token (public by design)', async () => {
    const res = await fetch(`${API_URL}/api/ai-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agreement: {}, apiKey: '', docText: '' }),
    });
    // Expect 400 "no_key" (reachable, correctly rejecting a missing key) —
    // NOT a network error / 404 / 502, which would mean the route isn't wired.
    assert(res.status === 400, `expected 400 (no_key), got ${res.status}`);
  });

  if (!TOKEN) {
    console.log('\nSMOKE_TOKEN not set — skipping authenticated checks (profile, agreements, DB data).');
  } else {
    const authHeaders = { Authorization: `Bearer ${TOKEN}` };

    await check('GET /api/profile/me returns a linked profile', async () => {
      const res = await fetch(`${API_URL}/api/profile/me`, { headers: authHeaders });
      assert(res.ok, `status ${res.status}`);
      const profile = await res.json();
      assert(profile.role && profile.team_code, 'profile missing role/team_code: ' + JSON.stringify(profile));
    });

    await check('GET /api/agreements returns migrated data', async () => {
      const res = await fetch(`${API_URL}/api/agreements`, { headers: authHeaders });
      assert(res.ok, `status ${res.status}`);
      const rows = await res.json();
      assert(Array.isArray(rows), 'response is not an array');
      assert(rows.length > 0, 'zero agreements returned — did migrate-db.js run successfully?');
      const sample = rows[0];
      assert('drafts' in sample && 'team_statuses' in sample && 'clauses' in sample,
        'agreement rows are missing nested relations — check the JOIN queries in routes/agreements.js');
    });
  }

  console.log('');
  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.log(`${failed.length} of ${results.length} checks FAILED.`);
    process.exit(1);
  }
  console.log(`All ${results.length} checks passed.`);
}

main();
