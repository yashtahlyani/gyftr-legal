// src/lib/auth-cognito.js — Cognito auth for the real (non-demo) login path.
// Replaces src/auth/login.js's supabase.auth.signInWithPassword usage.
// Demo-mode login (role pills, sample data, no password check) is untouched
// and lives entirely in src/login.js / src/main.js — this file is only used
// when a real @gyftr.net email is entered.

import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js'
import { setAuthToken, getMyProfile } from './api.js'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId:   import.meta.env.VITE_COGNITO_CLIENT_ID,
})

// Holds the in-progress Cognito challenge between signIn() returning
// { mustChangePassword: true } and the caller submitting a new password via
// completeNewPasswordChallenge(). Cleared on success/failure/new signIn.
let _pendingChallenge = null

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
        try {
          resolve(await getMyProfile())
        } catch (err) {
          reject(err)
        }
      },
      onFailure: reject,
      newPasswordRequired: (userAttributes) => {
        // Cognito hands these back on the challenge but rejects them if you
        // try to resubmit them — they're not user-writable at this step.
        delete userAttributes.email_verified
        delete userAttributes.email_address
        delete userAttributes.phone_number_verified
        _pendingChallenge = { cognitoUser, userAttributes }
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
        try {
          resolve(await getMyProfile())
        } catch (err) {
          reject(err)
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
      try {
        resolve(await getMyProfile())
      } catch {
        resolve(null)
      }
    })
  })
}
