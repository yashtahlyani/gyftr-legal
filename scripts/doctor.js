/**
 * doctor.js — find out WHY the portal is broken, from the outside.
 *
 * Needs no AWS credentials, no VPN and no database access. Anyone can run it
 * from any machine. It walks the stack from DNS upwards and stops at the first
 * layer that is actually broken, then tells you what to change.
 *
 * The point: "it's still not working" is not actionable. The output of this is.
 *
 * Usage:
 *   cd scripts && npm install
 *   node doctor.js --frontend https://legal.gyftr.net \
 *                  --api      https://legal-api.gyftr.net
 *
 * Defaults to those two URLs, so plain `node doctor.js` usually does.
 */

import { lookup } from 'node:dns/promises';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const FRONTEND = arg('frontend', 'https://legal.gyftr.net').replace(/\/$/, '');
const API      = arg('api',      'https://legal-api.gyftr.net').replace(/\/$/, '');
const TIMEOUT  = 15000;

const problems = [];
const ok   = (m, d = '') => console.log(`  \x1b[32mOK\x1b[0m    ${m}${d ? ' — ' + d : ''}`);
const bad  = (m, d, fix) => { problems.push({ m, d, fix }); console.log(`  \x1b[31mFAIL\x1b[0m  ${m}${d ? ' — ' + d : ''}`); };
const info = (m, d = '') => console.log(`  ...   ${m}${d ? ' — ' + d : ''}`);

async function get(url, options = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { ...options, signal: c.signal, redirect: 'manual' });
    const text = await res.text().catch(() => '');
    return { res, text };
  } finally {
    clearTimeout(t);
  }
}

async function checkDns(label, url) {
  const host = new URL(url).hostname;
  try {
    const { address } = await lookup(host);
    ok(`${label} DNS resolves`, `${host} → ${address}`);
    return true;
  } catch (err) {
    bad(`${label} DNS resolves`, `${host}: ${err.code || err.message}`,
      `The hostname does not resolve. Check the Route53 record for ${host}.`);
    return false;
  }
}

async function main() {
  console.log(`\n=== Legal portal doctor ===`);
  console.log(`frontend : ${FRONTEND}`);
  console.log(`api      : ${API}\n`);

  // ── 1. DNS ────────────────────────────────────────────────────────────────
  console.log('DNS');
  const feDns = await checkDns('frontend', FRONTEND);
  const apiDns = await checkDns('api', API);

  // ── 2. Frontend ───────────────────────────────────────────────────────────
  console.log('\nFrontend');
  if (feDns) {
    try {
      const { res, text } = await get(FRONTEND + '/');
      if (res.status === 503) {
        bad('Frontend responds', '503 Service Temporarily Unavailable',
          'The load balancer has no healthy targets for the FRONTEND. The container is not running, ' +
          'or its health check is failing. Check the ECS service (running vs desired count), the ' +
          'target group health, and that the container listens on the port the target group polls.');
      } else if (res.status >= 500) {
        bad('Frontend responds', `HTTP ${res.status}`, 'The frontend container is erroring. Check its logs.');
      } else if (res.ok && /<div id="root"|<!doctype html/i.test(text)) {
        ok('Frontend responds', `HTTP ${res.status}, HTML served`);
      } else {
        ok('Frontend responds', `HTTP ${res.status}`);
      }
    } catch (err) {
      bad('Frontend responds', err.name === 'AbortError' ? 'no response in 15s' : err.message,
        'Nothing answered. Check the load balancer listener and its security group.');
    }
  }

  // ── 3. API liveness ───────────────────────────────────────────────────────
  console.log('\nAPI');
  let apiUp = false;
  if (apiDns) {
    try {
      const { res, text } = await get(API + '/health');
      if (res.status === 503) {
        bad('API is up (/health)', '503 Service Temporarily Unavailable',
          'The load balancer has no healthy targets for the API. Usually the container is crash-looping. ' +
          'Check the ECS task logs — if it exits on start-up, the build predates the fix that lets the ' +
          'API run without a database. Redeploy the backend from this branch.');
      } else if (res.ok) {
        apiUp = true;
        ok('API is up (/health)', text.slice(0, 80));
      } else {
        bad('API is up (/health)', `HTTP ${res.status}`, 'Check the API container logs.');
      }
    } catch (err) {
      bad('API is up (/health)', err.name === 'AbortError' ? 'no response in 15s' : err.message,
        'Nothing answered on the API host. Check the listener and security group.');
    }
  }

  // ── 4. API readiness — the database ──────────────────────────────────────
  if (apiUp) {
    try {
      const { res, text } = await get(API + '/health/deep');
      let body = {};
      try { body = JSON.parse(text); } catch { /* not JSON */ }

      if (res.ok && body.database === 'reachable') {
        ok('API can reach the database', `${body.latencyMs}ms`);
      } else if (res.status === 404) {
        info('API can reach the database', 'no /health/deep — the API predates it, redeploy the backend');
      } else {
        bad('API can reach the database', body.error || `HTTP ${res.status}`,
          body.hint ||
          'The API is running but cannot reach RDS. Check DB_HOST / AWS_SECRET_NAME in the task ' +
          'definition, and that the RDS security group allows the API security group on 5432.');
      }
    } catch (err) {
      bad('API can reach the database', err.message, 'Could not read /health/deep.');
    }

    // ── 5. Auth is enforced ────────────────────────────────────────────────
    try {
      const { res } = await get(API + '/api/agreements');
      if (res.status === 401)       ok('Protected routes reject anonymous callers', '401');
      else if (res.status === 503)  info('Protected routes', '503 — database not ready, see above');
      else                          bad('Protected routes reject anonymous callers', `expected 401, got ${res.status}`,
                                        'Routes may be unprotected. Check requireAuth is mounted.');
    } catch (err) {
      bad('Protected routes reject anonymous callers', err.message, '');
    }

    // ── 6. CORS — the one curl cannot tell you ─────────────────────────────
    try {
      const { res } = await get(API + '/api/agreements', {
        method: 'OPTIONS',
        headers: {
          Origin: FRONTEND,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization,content-type',
        },
      });
      const allow = res.headers.get('access-control-allow-origin');
      if (allow && (allow === FRONTEND || allow === '*')) {
        ok('CORS allows the frontend origin', allow);
      } else {
        bad('CORS allows the frontend origin', `no match for ${FRONTEND}`,
          `Set FRONTEND_URL in the API environment to exactly "${FRONTEND}" — no trailing slash — and restart it. ` +
          'Until then the browser blocks every API call even though curl works.');
      }
    } catch (err) {
      bad('CORS allows the frontend origin', err.message, '');
    }
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(64));
  if (!problems.length) {
    console.log('Everything the outside world can check is healthy.');
    console.log('If users still report problems, get a screenshot of the browser');
    console.log('console (F12) — the remaining causes are client-side.');
    process.exit(0);
  }

  console.log(`${problems.length} problem(s) found. Fix them top-down — the first usually causes the rest.\n`);
  problems.forEach((p, i) => {
    console.log(`${i + 1}. ${p.m}${p.d ? ' — ' + p.d : ''}`);
    if (p.fix) console.log(`   → ${p.fix}\n`);
  });
  process.exit(1);
}

main().catch(err => { console.error('doctor crashed:', err); process.exit(1); });
