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

// signIn(email, password) -> resolves with the caller's profile row
// (role, team_code, name, avatar, …) fetched from GET /api/profile/me.
export function signIn(email, password) {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
    const authDetails  = new AuthenticationDetails({ Username: email, Password: password })
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: async (session) => {
        setAuthToken(session.getIdToken().getJwtToken())
        try {
          resolve(await getMyProfile())
        } catch (err) {
          reject(err)
        }
      },
      onFailure: reject,
      newPasswordRequired: () => reject(new Error('Password reset required — contact an admin')),
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
