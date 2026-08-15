/**
 * check-login.js — find out what Cognito ACTUALLY says about a login.
 *
 * The portal shows "Incorrect email or password" for several different causes,
 * because Cognito's "prevent user existence errors" setting (on by default)
 * deliberately collapses them into one message. So that error does NOT mean
 * the password is wrong — it can equally mean the account does not exist in
 * the pool the frontend is pointing at.
 *
 * This prints the real exception name, which tells them apart:
 *
 *   NotAuthorizedException        → wrong password (or user missing, see above)
 *   UserNotFoundException         → no such user in THIS pool
 *   PasswordResetRequiredException→ an admin reset it; must go through reset
 *   NEW_PASSWORD_REQUIRED         → account is on a temporary password (this is
 *                                   the good case — the portal will prompt)
 *   ResourceNotFoundException     → the pool or client id itself is wrong
 *
 * Needs NO AWS credentials — it authenticates exactly like a browser does.
 *
 * Usage:
 *   cd scripts && npm install
 *   node check-login.js --email someone@gyftr.net --password 'Default@123' \
 *        --pool ap-south-1_XXXX --client XXXXXXXX
 *
 * The pool and client default to COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID from
 * the environment. To be certain you are testing what users actually get, read
 * them out of the deployed bundle instead:
 *
 *   grep -o 'ap-south-1_[A-Za-z0-9]*' ../frontend/dist/assets/*.js | head
 */

import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

const EMAIL    = arg('email');
const PASSWORD = arg('password');
const POOL     = arg('pool',   process.env.COGNITO_USER_POOL_ID);
const CLIENT   = arg('client', process.env.COGNITO_CLIENT_ID);

if (!EMAIL || !PASSWORD || !POOL || !CLIENT) {
  console.error('Usage: node check-login.js --email <e> --password <p> --pool <id> --client <id>');
  console.error('(pool/client fall back to COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID)');
  process.exit(1);
}

console.log(`\n=== Cognito login check ===`);
console.log(`pool   : ${POOL}`);
console.log(`client : ${CLIENT}`);
console.log(`email  : ${EMAIL}`);
console.log(`password: ${'*'.repeat(PASSWORD.length)} (${PASSWORD.length} chars)\n`);

const userPool = new CognitoUserPool({ UserPoolId: POOL, ClientId: CLIENT });
const user     = new CognitoUser({ Username: EMAIL, Pool: userPool });
const details  = new AuthenticationDetails({ Username: EMAIL, Password: PASSWORD });

user.authenticateUser(details, {
  onSuccess() {
    console.log('RESULT: SUCCESS — these credentials work.');
    console.log('        The account is confirmed and the password is correct.');
    console.log('        If the portal still fails, the problem is the API, not the login.');
    process.exit(0);
  },

  newPasswordRequired() {
    console.log('RESULT: NEW_PASSWORD_REQUIRED');
    console.log('        The password is CORRECT and the account is on a temporary one.');
    console.log('        The portal should show "Set a new password" here.');
    console.log('        If users see "Incorrect email or password" instead, they are');
    console.log('        running an old bundle — redeploy the frontend.');
    process.exit(0);
  },

  onFailure(err) {
    const name = err.code || err.name || 'UnknownError';
    console.log(`RESULT: ${name}`);
    console.log(`        ${err.message}\n`);

    if (name === 'NotAuthorizedException') {
      console.log('This means ONE of:');
      console.log('  a) the password is wrong, OR');
      console.log('  b) the user does not exist in THIS pool — Cognito hides the');
      console.log('     difference when "prevent user existence errors" is on (default).');
      console.log('');
      console.log('To tell them apart, with AWS access:');
      console.log(`  aws cognito-idp admin-get-user --user-pool-id ${POOL} --username ${EMAIL}`);
      console.log('');
      console.log('If that says the user does not exist, the frontend is pointing at the');
      console.log('wrong pool, or the users were created somewhere else. Compare this pool');
      console.log('id against the one baked into the deployed bundle.');
      console.log('');
      console.log('If the user DOES exist, reset them:');
      console.log(`  aws cognito-idp admin-set-user-password --user-pool-id ${POOL} \\`);
      console.log(`    --username ${EMAIL} --password 'Default@123'   # note: no --permanent,`);
      console.log('    so the portal prompts them to choose their own.');
    } else if (name === 'UserNotFoundException') {
      console.log('The user does not exist in this pool. Either the frontend is built');
      console.log('against the wrong pool, or create-cognito-users.js was never run here.');
    } else if (name === 'PasswordResetRequiredException') {
      console.log('An admin reset this account. It must go through the forgot-password');
      console.log('flow, or be given a new temporary password with admin-set-user-password.');
    } else if (name === 'ResourceNotFoundException') {
      console.log('The pool id or client id is wrong — that is the bug, not the password.');
      console.log('Check VITE_COGNITO_USER_POOL_ID / VITE_COGNITO_CLIENT_ID in the build.');
    } else if (name === 'UserNotConfirmedException') {
      console.log('The account was never confirmed. Confirm it in the Cognito console.');
    }
    process.exit(1);
  },
});
