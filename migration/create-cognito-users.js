/**
 * create-cognito-users.js — create a Cognito account for every real person
 * in the RDS `profiles` table, and link it back to their row via cognito_sub.
 *
 * Unlike a fresh-seed demo app, these are real GyfTR employees with real
 * legal-agreement access, so each user gets a random temporary password and
 * must set their own on first login (Cognito's standard
 * NEW_PASSWORD_REQUIRED challenge) — nobody is assigned a shared default
 * password.
 *
 * Usage:
 *   cd migration && npm install
 *   node create-cognito-users.js
 *
 * Required env vars:
 *   COGNITO_USER_POOL_ID  — e.g. ap-south-1_AbcXYZ
 *   AWS_REGION            — e.g. ap-south-1
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  — IAM user/role with Cognito admin permissions
 *   RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB   — same as migrate-db.js
 *
 * IAM permission needed: cognito-idp:AdminCreateUser
 * (AdminSetUserPassword is NOT used — Cognito auto-generates and emails/
 *  returns the temporary password when MessageAction is not SUPPRESS'd, or
 *  set SEND_INVITE_EMAIL=false below to print it instead of emailing it.)
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import pg from 'pg';

// ── Config ────────────────────────────────────────────────────────────────

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const REGION        = process.env.AWS_REGION || 'ap-south-1';
// If true, Cognito emails the temp password to the user (requires the pool's
// email settings to be configured). If false, MessageAction is SUPPRESSed
// and this script prints each temp password instead — hand those out
// yourself. Default false so this works before SES/email is set up.
const SEND_INVITE_EMAIL = process.env.SEND_INVITE_EMAIL === 'true';

const RDS = {
  host:     process.env.RDS_HOST,
  user:     process.env.RDS_USER     || 'gyftr_admin',
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB       || 'gyftr_legal',
  port:     parseInt(process.env.RDS_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
};

function randomTempPassword() {
  // Meets Cognito's default policy (8+ chars, upper, lower, number, symbol)
  const rand = Math.random().toString(36).slice(2, 10);
  return `Gy!${rand}T1`;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  if (!USER_POOL_ID) {
    console.error('COGNITO_USER_POOL_ID env var is required');
    process.exit(1);
  }
  if (!RDS.host || !RDS.password) {
    console.error('RDS_HOST and RDS_PASSWORD env vars are required');
    process.exit(1);
  }

  const cognito = new CognitoIdentityProviderClient({ region: REGION });
  const pool    = new pg.Pool(RDS);

  const { rows: profiles } = await pool.query(
    `select id, email, name from profiles where cognito_sub is null`
  );

  if (!profiles.length) {
    console.log('All profiles already have a linked Cognito account. Nothing to do.');
    await pool.end();
    return;
  }

  console.log(`=== Creating ${profiles.length} Cognito user(s) in pool ${USER_POOL_ID} ===\n`);

  let created = 0, skipped = 0, failed = 0;
  const tempPasswords = [];

  for (const p of profiles) {
    process.stdout.write(`  ${p.email.padEnd(32)}`);
    try {
      const tempPassword = randomTempPassword();
      const result = await cognito.send(new AdminCreateUserCommand({
        UserPoolId:    USER_POOL_ID,
        Username:      p.email,
        MessageAction: SEND_INVITE_EMAIL ? undefined : 'SUPPRESS',
        TemporaryPassword: tempPassword,
        UserAttributes: [
          { Name: 'email',          Value: p.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name',           Value: p.name },
        ],
      }));

      const sub = result.User.Attributes.find(a => a.Name === 'sub')?.Value;
      await pool.query('update profiles set cognito_sub = $1 where id = $2', [sub, p.id]);

      if (!SEND_INVITE_EMAIL) tempPasswords.push({ email: p.email, tempPassword });
      console.log('created');
      created++;
    } catch (err) {
      if (err.name === 'UsernameExistsException') {
        console.log('already exists in Cognito (linking by lookup skipped — link manually if cognito_sub is still null)');
        skipped++;
      } else {
        console.log(`FAILED — ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\nDone. Created: ${created}  Skipped: ${skipped}  Failed: ${failed}`);
  if (tempPasswords.length) {
    console.log('\nTemporary passwords (share securely — each must be changed on first login):');
    for (const t of tempPasswords) console.log(`  ${t.email}  →  ${t.tempPassword}`);
  }
  if (failed > 0) {
    console.log('\nRe-run the script to retry failed users (already-linked profiles are skipped automatically).');
  }

  await pool.end();
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('create-cognito-users failed:', err.message);
  process.exit(1);
});
