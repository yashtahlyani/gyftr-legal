/**
 * audit-access.js — print the current user access list for review.
 *
 * Answers "who can log in, what can they do, and does it look right?" in one
 * page, so the access list can actually be reviewed rather than guessed at.
 * Read-only: this script never changes anything.
 *
 * Mirrors scripts/audit-access.js in the sibling gyftr-portal repo.
 *
 * Usage:
 *   cd scripts && npm install
 *   node audit-access.js
 *   node audit-access.js --csv > access-review.csv
 *
 * Required env vars: RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB
 * Optional (adds Cognito account status): COGNITO_USER_POOL_ID, AWS_REGION,
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 */

import pg from 'pg';

const CSV = process.argv.includes('--csv');

// Access rules as enforced by backend/authz.js. Keep in step with that file.
const CAN_DO = {
  legal:      'full control — create/edit/delete agreements, upload drafts, set clause outcomes, update any team status',
  finance:    'read everything; update only the Finance team status; add remarks/reminders',
  business:   'read everything; update only the Business team status; add remarks/reminders',
  compliance: 'read everything; update only the Compliance team status; add remarks/reminders',
};
const TEAM_NAME = { L: 'Legal', F: 'Finance', C: 'Compliance', B: 'Business' };

const pool = new pg.Pool({
  host:     process.env.RDS_HOST,
  user:     process.env.RDS_USER     || 'gyftr_admin',
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB       || 'gyftr_legal',
  port:     parseInt(process.env.RDS_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
});

async function cognitoStatuses() {
  if (!process.env.COGNITO_USER_POOL_ID) return null;
  const { CognitoIdentityProviderClient, ListUsersCommand } =
    await import('@aws-sdk/client-cognito-identity-provider');
  const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'ap-south-1' });
  const map = new Map();
  let token;
  do {
    const res = await client.send(new ListUsersCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: 60, PaginationToken: token,
    }));
    for (const u of res.Users || []) {
      const attr = Object.fromEntries((u.Attributes || []).map(a => [a.Name, a.Value]));
      const email = (attr.email || u.Username || '').toLowerCase();
      if (email) map.set(email, { status: u.Enabled === false ? 'DISABLED' : u.UserStatus, sub: attr.sub });
    }
    token = res.PaginationToken;
  } while (token);
  return map;
}

async function main() {
  if (!process.env.RDS_HOST) { console.error('RDS_HOST is required'); process.exit(1); }

  const cognito = await cognitoStatuses().catch(err => {
    console.error(`(could not read Cognito: ${err.message})\n`);
    return null;
  });

  const { rows } = await pool.query(`
    SELECT p.email, p.name, p.role, p.team_code, p.cognito_sub
      FROM profiles p
     ORDER BY CASE p.role WHEN 'legal' THEN 0 ELSE 1 END, p.name
  `);

  if (CSV) {
    console.log('Name,Email,Role,Team,Cognito status,Linked,Can do');
    rows.forEach(r => {
      const c = cognito?.get(r.email.toLowerCase());
      console.log([
        r.name, r.email, r.role, TEAM_NAME[r.team_code] || r.team_code,
        c?.status || '', r.cognito_sub ? 'yes' : 'NO', CAN_DO[r.role] || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    });
    await pool.end();
    return;
  }

  console.log('=== GyFTR Legal Portal — user access review ===\n');

  for (const role of ['legal', 'finance', 'business', 'compliance']) {
    const group = rows.filter(r => r.role === role);
    if (!group.length) continue;
    console.log(`${role.toUpperCase()} (${group.length}) — ${CAN_DO[role]}`);
    for (const r of group) {
      const c = cognito?.get(r.email.toLowerCase());
      const flags = [
        r.cognito_sub ? null : 'NOT LINKED TO COGNITO',
        cognito ? (c ? c.status : 'NO COGNITO ACCOUNT') : null,
      ].filter(Boolean).join(' · ');
      console.log(`  ${r.name.padEnd(16)} ${r.email.padEnd(30)} ${(TEAM_NAME[r.team_code] || '').padEnd(11)} ${flags}`);
    }
    console.log('');
  }

  // ── Things worth a second look ──────────────────────────────────────────
  const warn = [];

  if (!rows.some(r => r.role === 'legal')) {
    warn.push('No user has the legal role — nobody can create or edit agreements.');
  }

  rows.filter(r => !r.cognito_sub).forEach(r => warn.push(
    `${r.name} (${r.email}) has a profile but no cognito_sub — they will get ` +
    `"No profile linked to this account" on login. Re-run create-cognito-users.js.`
  ));

  // Same person on more than one company domain = two profiles, two histories.
  const byLocal = {};
  rows.forEach(r => {
    const lp = r.email.toLowerCase().split('@')[0];
    (byLocal[lp] = byLocal[lp] || []).push(r.email);
  });
  Object.entries(byLocal).filter(([, e]) => e.length > 1).forEach(([lp, e]) =>
    warn.push(`"${lp}" has profiles on more than one domain (${e.join(', ')}) — same person, two records.`)
  );

  if (cognito) {
    const subs = new Set(rows.map(r => r.cognito_sub).filter(Boolean));
    for (const [email, c] of cognito) {
      if (!rows.some(r => r.email.toLowerCase() === email)) {
        warn.push(`${email} can authenticate with Cognito but has no profile row — they will be refused at login.`);
      } else if (c.sub && !subs.has(c.sub)) {
        warn.push(`${email}: the Cognito account's sub does not match the profile's cognito_sub — login will be refused.`);
      }
    }
    const pending = [...cognito.values()].filter(c => c.status === 'FORCE_CHANGE_PASSWORD').length;
    if (pending) console.log(`${pending} account(s) still owe a password change on next login.\n`);
  }

  if (warn.length) {
    console.log('REVIEW THESE:');
    warn.forEach(w => console.log(`  ! ${w}`));
  } else {
    console.log('No anomalies found.');
  }

  await pool.end();
}

main().catch(err => { console.error('audit-access failed:', err); process.exit(1); });
