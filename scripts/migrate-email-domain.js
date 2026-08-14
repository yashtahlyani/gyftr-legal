/**
 * migrate-email-domain.js — move every real user from @gyftr.net to
 * @gyftr.com login emails. Mirrors the same script in the sibling
 * gyftr-portal migration (scripts/migrate-email-domain.js), adapted to this
 * app's schema.
 *
 * Cognito usernames can't be renamed, so "migrating" an account means:
 *   1. create a NEW Cognito account on the new email (temp password,
 *      Permanent: false — same forced-reset rule as everywhere else)
 *   2. disable the OLD Cognito account (or delete it, with --delete-old)
 *   3. update profiles.email + profiles.cognito_sub to the new account, in
 *      a transaction for that user
 *
 * IMPORTANT — infrastructure hostnames are NOT touched by this script and
 * must not be: api.*.gyftr.net / legal.gyftr.net (or whatever your actual
 * DNS/ACM/CloudFront aliases are) stay on .net. This is a LOGIN EMAIL
 * change only.
 *
 * IMPORTANT — historical `signatures.signer_email` rows are deliberately
 * NOT rewritten. Those are a record of who signed what, with which email,
 * at the time — retroactively editing them would be rewriting history on a
 * legal audit trail. Only `profiles.email` (the login identity going
 * forward) is updated.
 *
 * Also worth knowing before you run this live: the Cognito operations
 * (steps 1–2) and the database update (step 3) are NOT one atomic
 * transaction across both systems — only step 3 by itself is
 * (BEGIN/COMMIT/ROLLBACK). If the process dies between steps 2 and 3 for a
 * given user, that user ends up with a working new Cognito account but a
 * profiles row still pointing at the old email/cognito_sub — the script
 * detects and reports this state on a re-run (see "already has a Cognito
 * account, DB not yet updated" below) rather than silently redoing step 1.
 *
 * Usage:
 *   cd migration && npm install
 *   node migrate-email-domain.js --dry-run                 # always run this first
 *   node migrate-email-domain.js                            # live: disables old accounts
 *   node migrate-email-domain.js --delete-old                # live: deletes old accounts instead
 *   node migrate-email-domain.js --from=gyftr.net --to=gyftr.com   # defaults shown
 *
 * Required env vars:
 *   COGNITO_USER_POOL_ID  — e.g. ap-south-1_AbcXYZ
 *   AWS_REGION            — e.g. ap-south-1
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  — IAM user/role with Cognito admin permissions
 *   RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB   — same as migrate-db.js
 *
 * IAM permissions needed: cognito-idp:AdminCreateUser, cognito-idp:AdminSetUserPassword,
 *   cognito-idp:AdminDisableUser, cognito-idp:AdminDeleteUser (only if --delete-old),
 *   cognito-idp:AdminGetUser
 */

import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminDisableUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import pg from 'pg';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const REGION        = process.env.AWS_REGION || 'ap-south-1';

const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const DELETE_OLD = args.includes('--delete-old');
const fromArg    = args.find(a => a.startsWith('--from='));
const toArg      = args.find(a => a.startsWith('--to='));
const FROM_DOMAIN = (fromArg ? fromArg.slice('--from='.length) : 'gyftr.net').toLowerCase();
const TO_DOMAIN    = (toArg ? toArg.slice('--to='.length) : 'gyftr.com').toLowerCase();

const RDS = {
  host:     process.env.RDS_HOST,
  user:     process.env.RDS_USER     || 'gyftr_admin',
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB       || 'gyftr_legal',
  port:     parseInt(process.env.RDS_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
};

function randomTempPassword() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `Gy!${rand}T1`;
}

function newEmailFor(oldEmail) {
  const [local] = oldEmail.split('@');
  return `${local}@${TO_DOMAIN}`;
}

async function main() {
  if (!USER_POOL_ID) { console.error('COGNITO_USER_POOL_ID env var is required'); process.exit(1); }
  if (!RDS.host || !RDS.password) { console.error('RDS_HOST and RDS_PASSWORD env vars are required'); process.exit(1); }

  const cognito = new CognitoIdentityProviderClient({ region: REGION });
  const pool    = new pg.Pool(RDS);

  console.log(`=== migrate-email-domain: @${FROM_DOMAIN} → @${TO_DOMAIN} ===`);
  console.log(DRY_RUN ? 'Mode: DRY RUN (no changes will be made)\n' : `Mode: LIVE — old accounts will be ${DELETE_OLD ? 'DELETED' : 'disabled'}\n`);

  const { rows: profiles } = await pool.query(
    `select id, email, name, cognito_sub from profiles where email ilike $1`,
    [`%@${FROM_DOMAIN}`]
  );

  if (!profiles.length) {
    console.log(`No profiles found with a @${FROM_DOMAIN} email. Nothing to do.`);
    await pool.end();
    return;
  }

  // Pre-flight: refuse to touch anything if any target email already exists
  // as a DISTINCT profile — merging two people silently is exactly the kind
  // of mistake this check exists to prevent.
  const collisions = [];
  for (const p of profiles) {
    const target = newEmailFor(p.email);
    const { rows } = await pool.query(`select id from profiles where email = $1`, [target]);
    if (rows.length && rows[0].id !== p.id) collisions.push({ from: p.email, to: target });
  }
  if (collisions.length) {
    console.error('Aborting — target email(s) already exist as a different profile:');
    for (const c of collisions) console.error(`  ${c.from} → ${c.to} (already taken)`);
    console.error('Resolve these manually before re-running.');
    await pool.end();
    process.exit(1);
  }

  console.log(`${profiles.length} account(s) to migrate:`);
  for (const p of profiles) console.log(`  ${p.email}  →  ${newEmailFor(p.email)}`);
  console.log('');

  if (DRY_RUN) {
    console.log('Dry run — no changes made. Re-run without --dry-run to apply.');
    await pool.end();
    return;
  }

  let migrated = 0, failed = 0;
  const tempPasswords = [];

  for (const p of profiles) {
    const newEmail = newEmailFor(p.email);
    process.stdout.write(`  ${p.email} → ${newEmail}  `);

    try {
      // Detect a half-applied prior run: new Cognito account already exists
      // but the DB still points at the old one.
      let newSub;
      let alreadyCreated = false;
      try {
        const existing = await cognito.send(new AdminGetUserCommand({ UserPoolId: USER_POOL_ID, Username: newEmail }));
        newSub = existing.UserAttributes.find(a => a.Name === 'sub')?.Value;
        alreadyCreated = true;
      } catch { /* doesn't exist yet — normal case, proceed to create it */ }

      const tempPassword = randomTempPassword();

      if (!alreadyCreated) {
        const created = await cognito.send(new AdminCreateUserCommand({
          UserPoolId:    USER_POOL_ID,
          Username:      newEmail,
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email',          Value: newEmail },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name',           Value: p.name },
          ],
        }));
        newSub = created.User.Attributes.find(a => a.Name === 'sub')?.Value;

        await cognito.send(new AdminSetUserPasswordCommand({
          UserPoolId: USER_POOL_ID,
          Username:   newEmail,
          Password:   tempPassword,
          Permanent:  false, // forces FORCE_CHANGE_PASSWORD — never true
        }));
        tempPasswords.push({ email: newEmail, tempPassword });
      }

      // Disable (or delete) the old account.
      try {
        if (DELETE_OLD) {
          await cognito.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: p.email }));
        } else {
          await cognito.send(new AdminDisableUserCommand({ UserPoolId: USER_POOL_ID, Username: p.email }));
        }
      } catch (err) {
        if (err.name !== 'UserNotFoundException') throw err; // already gone — fine
      }

      // DB update — transactional for this one user.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`update profiles set email = $1, cognito_sub = $2 where id = $3`, [newEmail, newSub, p.id]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      console.log(alreadyCreated ? 'DB updated (Cognito account already existed from a prior run)' : 'migrated');
      migrated++;
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Migrated: ${migrated}  Failed: ${failed}`);
  if (tempPasswords.length) {
    console.log('\nTemporary passwords for new accounts (share securely):');
    for (const t of tempPasswords) console.log(`  ${t.email}  →  ${t.tempPassword}`);
  }
  console.log('\nInfrastructure hostnames (api.*, portal/legal.* DNS, ACM certs, CloudFront) were not touched — login email only.');

  await pool.end();
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('migrate-email-domain failed:', err.message);
  process.exit(1);
});
