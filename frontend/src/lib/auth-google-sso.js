// src/lib/auth-google-sso.js — "Sign in with Google" via Cognito Hosted UI
// (Authorization Code + PKCE, no client secret needed for a public SPA client).
//
// Kept separate from auth-cognito.js because the two are fundamentally
// different token flows (SRP session objects from amazon-cognito-identity-js
// vs. a plain OAuth redirect + code exchange) — the only thing they share is
// the public surface (setAuthToken/setAuthTokenProvider/getMyProfile) and,
// ultimately, the same backend JWT verification (middleware/auth.js checks
// only that the token was issued by the pool + client — it doesn't care
// which identity provider signed someone in).
//
// Backend account linking: the first time anyone signs in via Google,
// Cognito mints a brand-new federated `sub` that has never been seen before.
// backend/middleware/loadProfile.js links it to the matching `profiles` row
// by verified email automatically on that first request — no separate
// "create their Cognito account" step is needed for Google-only users,
// unlike scripts/create-cognito-users.js's native-password path.

import { setAuthToken, setAuthTokenProvider, getMyProfile } from './api.js'

const REFRESH_KEY  = 'google_sso_refresh_token'
const VERIFIER_KEY = 'google_sso_verifier'

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomVerifier() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

async function challengeFromVerifier(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

// Both are required together — VITE_COGNITO_CLIENT_ID already exists for the
// native login path; VITE_COGNITO_DOMAIN is the Hosted UI domain, new for
// this feature (see frontend/.env.example and the SSO runbook).
function ssoConfig() {
  const domain   = import.meta.env.VITE_COGNITO_DOMAIN
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
  if (!domain || !clientId) return null
  return { domain, clientId }
}

// Redirect back into the login page itself (not a separate callback page) —
// one less HTML file to keep in sync with Cognito's allowed callback URLs.
function redirectUri() {
  return `${window.location.origin}/index.html`
}

export function googleSignInAvailable() {
  return !!ssoConfig()
}

// Sends the browser to Cognito's Hosted UI with identity_provider=Google.
// Never resolves under normal use — the navigation happens first.
export async function redirectToGoogleSignIn() {
  const cfg = ssoConfig()
  if (!cfg) throw new Error('Google sign-in is not configured on this build.')
  const verifier = randomVerifier()
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  const challenge = await challengeFromVerifier(verifier)
  const params = new URLSearchParams({
    identity_provider: 'Google',
    response_type: 'code',
    client_id: cfg.clientId,
    redirect_uri: redirectUri(),
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })
  window.location.href = `https://${cfg.domain}/oauth2/authorize?${params}`
}

async function exchangeToken(body) {
  const cfg = ssoConfig()
  const res = await fetch(`https://${cfg.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google sign-in failed (${res.status}). ${text}`.trim())
  }
  return res.json()
}

// Mints a fresh ID token from the stored refresh token — the Google-SSO
// equivalent of auth-cognito.js's freshIdToken(), passed to
// setAuthTokenProvider() so every API call keeps working past the ID
// token's 1-hour expiry without forcing a re-login.
function freshIdTokenViaRefresh() {
  return async () => {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY)
    const cfg = ssoConfig()
    if (!refreshToken || !cfg) return null
    try {
      const tokens = await exchangeToken(new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: cfg.clientId,
        refresh_token: refreshToken,
      }))
      setAuthToken(tokens.id_token)
      return tokens.id_token
    } catch {
      // A dead/expired refresh token — clear it so restoreGoogleSession()
      // on the next page load doesn't keep retrying a session that's gone.
      sessionStorage.removeItem(REFRESH_KEY)
      return null
    }
  }
}

// Call once on every page load, before anything else, to complete a redirect
// back from Google/Cognito. Returns the signed-in profile, or null if this
// page load isn't a callback at all (the ordinary case for every other visit).
export async function completeGoogleSignInFromUrl() {
  const url  = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return null

  // Strip ?code=&state= from the visible URL immediately — a page refresh
  // must not try to redeem an already-used (and by then invalid) code.
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  window.history.replaceState({}, '', url.pathname + url.search)

  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  if (!verifier) throw new Error('Your sign-in session expired. Please try again.')

  const cfg = ssoConfig()
  const tokens = await exchangeToken(new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cfg.clientId,
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  }))

  if (tokens.refresh_token) sessionStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  setAuthToken(tokens.id_token)
  setAuthTokenProvider(freshIdTokenViaRefresh())
  return getMyProfile()
}

// Restores a Google SSO session on a later page load (app.html), mirroring
// auth-cognito.js's restoreSession() for the native email/password path.
// Session lifetime is tab-scoped (sessionStorage) by design for this
// release — matches the existing Cognito session's page-reload behavior
// without adding a second, differently-shaped persistence mechanism.
export async function restoreGoogleSession() {
  if (!sessionStorage.getItem(REFRESH_KEY)) return null
  setAuthTokenProvider(freshIdTokenViaRefresh())
  const token = await freshIdTokenViaRefresh()()
  if (!token) return null
  try {
    return await getMyProfile()
  } catch {
    return null
  }
}

export function googleSignOut() {
  sessionStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  setAuthToken(null)
  setAuthTokenProvider(null)
}
