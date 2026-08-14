// src/lib/auth-cognito.js — Cognito auth for the real (non-demo) login path.
// Replaces src/auth/login.js's supabase.auth.signInWithPassword usage.
// Demo-mode login (role pills, sample data, no password check) is untouched
// and lives entirely in src/login.js / src/main.js — this file is only used
// when a real @gyftr.net email is entered.

import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'
import { setAuthToken, setAuthTokenProvider, getMyProfile } from './api.js'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId:   import.meta.env.VITE_COGNITO_CLIENT_ID,
})

// Holds the in-progress Cognito challenge between signIn() returning
// { mustChangePassword: true } and the caller submitting a new password via
// completeNewPasswordChallenge(). Cleared on success/failure/new signIn.
let _pendingChallenge = null

// Returns a currently-valid ID token, or null if the session cannot be
// renewed. getSession() mints a new ID token from the refresh token when the
// current one has expired — this is what stops the portal breaking after an
// hour of use.
function freshIdToken() {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) return resolve(null)
    cognitoUser.getSession((err, session) => {
      if (err || !session?.isValid()) return resolve(null)
      resolve(session.getIdToken().getJwtToken())
    })
  })
}

// signIn(email, password) -> resolves with the caller's profile row
// (role, team_code, name, avatar, …) fetched from GET /api/profile/me — OR,
// if the account is in Cognito's FORCE_CHANGE_PASSWORD state (fresh account,
// or one that went through force-password-reset.js), resolves with
// { mustChangePassword: true } instead. Callers must check for that shape
// before treating the result as a profile — see src/login.js.
export function signIn(email, password) {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
    const authDetails  = new AuthenticationDetails({ Username: email, Password: password })
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: async (session) => {
        _pendingChallenge = null
        setAuthToken(session.getIdToken().getJwtToken())
        setAuthTokenProvider(freshIdToken)
        try {
          resolve(await getMyProfile())
        } catch (err) {
          // Cognito accepted the credentials; the API behind it did not
          // answer. Flagged so the UI does not blame the password.
          const e = new Error(err.message)
          e.authSucceeded = true
          e.cause = err
          reject(e)
        }
      },
      onFailure: reject,
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        // Send back ONLY attributes Cognito says are still required, and never
        // a standard attribute that is already set. `userAttributes` is the
        // account's current values, not a to-do list — echoing `email` back
        // makes Cognito fail the challenge with "Cannot modify an already
        // provided email", which blocks every first login.
        const NEVER_SEND = new Set([
          'email', 'email_verified',
          'phone_number', 'phone_number_verified',
          'sub',
        ])
        const payload = {}
        for (const name of requiredAttributes || []) {
          if (!NEVER_SEND.has(name) && userAttributes?.[name] !== undefined) {
            payload[name] = userAttributes[name]
          }
        }
        _pendingChallenge = { cognitoUser, userAttributes: payload }
        resolve({ mustChangePassword: true })
      },
    })
  })
}

// completeNewPasswordChallenge(newPassword) -> resolves with the caller's
// profile, same as a normal signIn(), once the new password is accepted.
export function completeNewPasswordChallenge(newPassword) {
  return new Promise((resolve, reject) => {
    if (!_pendingChallenge) {
      reject(new Error('No password challenge in progress — sign in again.'))
      return
    }
    const { cognitoUser, userAttributes } = _pendingChallenge
    cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, {
      onSuccess: async (session) => {
        _pendingChallenge = null
        setAuthToken(session.getIdToken().getJwtToken())
        setAuthTokenProvider(freshIdToken)
        try {
          resolve(await getMyProfile())
        } catch (err) {
          // The password HAS been changed in Cognito at this point — only the
          // profile fetch that follows it failed. Reporting this as a plain
          // error made users think the change did not happen, so they went
          // back and tried the old password, which no longer worked.
          const e = new Error(err.message)
          e.passwordWasSet = true
          e.cause = err
          reject(e)
        }
      },
      onFailure: reject,
    })
  })
}

export function signOut() {
  const cognitoUser = userPool.getCurrentUser()
  if (cognitoUser) cognitoUser.signOut()
  setAuthToken(null)
  setAuthTokenProvider(null)
}

// Restores a Cognito session (from local storage) without a fresh login —
// used by main.js on page load so users don't have to log in every visit.
export function restoreSession() {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) return resolve(null)
    cognitoUser.getSession(async (err, session) => {
      if (err || !session?.isValid()) return resolve(null)
      setAuthToken(session.getIdToken().getJwtToken())
      setAuthTokenProvider(freshIdToken)
      try {
        resolve(await getMyProfile())
      } catch (err) {
        // The Cognito session is fine; the API behind it did not answer.
        // Returning a bare null made main.js bounce the user to the login
        // page with no explanation, where signing in failed for the same
        // reason — so it looked like their password had stopped working.
        // Leave a note for the login page to show.
        try {
          sessionStorage.setItem('auth_notice',
            'You are still signed in, but the portal could not reach the server: ' +
            (err.message || 'no response') )
        } catch { /* storage unavailable — the redirect still happens */ }
        resolve(null)
      }
    })
  })
}
