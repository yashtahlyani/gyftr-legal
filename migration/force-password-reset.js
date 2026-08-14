/**
 * force-password-reset.js — force existing Cognito accounts back into
 * FORCE_CHANGE_PASSWORD, so every real user is prompted to set their own
 * password at next login. Mirrors the same script in the sibling
 * gyftr-portal migration (scripts/force-password-reset.js).
 *
 * Use this for accounts that are already CONFIRMED (i.e. someone already
 * completed a first login on a shared/default password before this was
 * fixed) — new accounts created via create-cognito-users.js are already
 * forced to reset on first login and don't need this.
 *
 * Usage:
 *   cd migration && npm install
 *   node force-password-reset.js --dry-run                # preview only, no changes
 *   node force-password-reset.js                           # reset every enabled user in the pool
 *   node force-password-reset.js --only=a@gyftr.net,b@gyftr.net   # reset specific accounts only
 *   node force-password-reset.js --signout                 # also invalidate any active sessions
 *
 * Required env vars:
 *   COGNITO_USER_POOL_ID  — e.g. ap-south-1_AbcXYZ
 *   AWS_REGION            — e.g. ap-south-1
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  — IAM user/role with Cognito admin permissions
 *
 * Optional:
 *   TEMP_PASSWORD — the temporary password every reset account gets, default 'default@123'
 *                   (each account is forced to change it before they can do anything else,
 *                   so this being the same for everyone briefly is expected, not a repeat
 *                   of the original bug — the original bug was Permanent: true, not this.)
 *
 * IAM permissions needed: cognito-idp:ListUsers, cognito-idp:AdminSetUserPassword,
 *                          cognito-idp:AdminUserGlobalSignOut (only if --signout is used)
 */

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminSetUserPasswordCommand,
  AdminUserGlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const USER_POOL_ID    = process.env.COGNITO_USER_POOL_ID;
const REGION          = process.env.AWS_REGION || 'ap-south-1';
const TEMP_PASSWORD   = process.env.TEMP_PASSWORD || 'default@123';

const args      = process.argv.slice(2);
const DRY_RUN   = args.includes('--dry-run');
const SIGN_OUT  = args.includes('--signout');
const onlyArg   = args.find(a => a.startsWith('--only='));
const ONLY_EMAILS = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map(e => e.trim().toLowerCase())) : null;

async function listAllUsers(client) {
  const users = [];
  let paginationToken;
  do {
    const res = await client.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      PaginationToken: paginationToken,
    }));
    users.push(...(res.Users || []));
    paginationToken = res.PaginationToken;
  } while (paginationToken);
  return users;
}

async function main() {
  if (!USER_POOL_ID) {
    console.error('COGNITO_USER_POOL_ID env var is required');
    process.exit(1);
  }

  const client = new CognitoIdentityProviderClient({ region: REGION });

  console.log(`=== force-password-reset — pool ${USER_POOL_ID} ===`);
  console.log(DRY_RUN ? 'Mode: DRY RUN (no changes will be made)\n' : 'Mode: LIVE — accounts will be reset\n');

  const allUsers = await listAllUsers(client);

  const targets = allUsers.filter(u => {
    const email = u.Attributes?.find(a => a.Name === 'email')?.Value?.toLowerCase();
    if (!email) return false;
    if (ONLY_EMAILS && !ONLY_EMAILS.has(email)) return false;
    if (u.UserStatus === 'FORCE_CHANGE_PASSWORD') return false; // already forced, skip
    if (u.Enabled === false) return false; // disabled accounts left alone
    return true;
  });

  if (!targets.length) {
    console.log('No accounts need resetting (everyone is already FORCE_CHANGE_PASSWORD, disabled, or excluded by --only).');
    return;
  }

  console.log(`${targets.length} account(s) will be reset:`);
  for (const u of targets) {
    const email = u.Attributes?.find(a => a.Name === 'email')?.Value;
    console.log(`  ${email}  (currently ${u.UserStatus})`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('Dry run — no changes made. Re-run without --dry-run to apply.');
    return;
  }

  let reset = 0, signedOut = 0, failed = 0;

  for (const u of targets) {
    const email = u.Attributes?.find(a => a.Name === 'email')?.Value;
    process.stdout.write(`  ${email.padEnd(32)}`);
    try {
      await client.send(new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username:   email,
        Password:   TEMP_PASSWORD,
        Permanent:  false, // forces FORCE_CHANGE_PASSWORD — never true
      }));
      reset++;

      if (SIGN_OUT) {
        await client.send(new AdminUserGlobalSignOutCommand({
          UserPoolId: USER_POOL_ID,
          Username:   email,
        }));
        signedOut++;
      }

      console.log(SIGN_OUT ? 'reset + signed out' : 'reset');
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Reset: ${reset}  Signed out: ${signedOut}  Failed: ${failed}`);
  console.log(`Every reset account's temporary password is: ${TEMP_PASSWORD}`);
  console.log('Share it securely — each account is forced to change it before doing anything else.');
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('force-password-reset failed:', err.message);
  process.exit(1);
});
