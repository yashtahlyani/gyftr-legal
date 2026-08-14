// ── GyfTR Legal Portal — Main Entry Point ────────────────────────────────────

import { restoreSession } from './lib/auth-cognito.js'
import { ROLES, AGs } from './data/sample.js'
import {
  fd, ns, td, parseTs, diffLabel,
  showToast, renderPromiseBadge, wordDiff, promiseDaysLeft
} from './ui/utils.js'

// ── 0. Auth check — Cognito session, plus demo mode in development only ──────
// The demo_role branch skips authentication entirely, so it is compiled out of
// production builds: otherwise anyone could set sessionStorage.demo_role in
// devtools and load the app shell without signing in.
const demoRole = import.meta.env.DEV ? sessionStorage.getItem('demo_role') : null

// Clear any stale demo flag whenever this is not a demo session. app-logic.js
// reads sessionStorage.demo_role directly, and when it is set, creating an
// agreement shows a success toast but deliberately never writes to the server.
// A leftover flag from an earlier demo login therefore made a real user's work
// silently vanish — one of the reported "data is not being stored" cases.
if (!demoRole) sessionStorage.removeItem('demo_role')
let savedRole  = demoRole
let profile    = null

if (!demoRole) {
  // Restore the Cognito session (this also sets the auth token every
  // src/lib/api.js call sends as a Bearer header) and fetch the linked profile.
  profile = await restoreSession()
  if (!profile) {
    window.location.href = '/index.html'
    throw new Error('Not authenticated')
  }
  sessionStorage.setItem('profile', JSON.stringify(profile))
  savedRole = profile.role || 'legal'
}

// Validate role — fall back to legal
if (!ROLES[savedRole]) savedRole = 'legal'
const R = ROLES[savedRole]

// ── 1. Expose all globals BEFORE app-logic loads ──────────────────────────────
window.ROLES  = ROLES
window.AGs    = AGs
window.fd     = fd
window.ns     = ns
window.td     = td
window.parseTs       = parseTs
window.diffLabel     = diffLabel
window.showToast     = showToast
window.renderPromiseBadge = renderPromiseBadge
window.wordDiff      = wordDiff
window.promiseDaysLeft = promiseDaysLeft

// ── 2. Load Google API and AI modules ────────────────────────────────────────
import('./ui/google-api.js').catch(err => console.error('google-api load failed:', err))
import('./ui/ai-analyze.js').catch(err => console.error('ai-analyze load failed:', err))

// ── 3. Load app-logic (all screens, modals, render) ──────────────────────────
import('./ui/app-logic.js').then(() => {

  // Actually sets app-logic.js's internal role/profile state — the old
  // `window.role = savedRole` here did nothing, since app-logic.js declares
  // its own module-scoped `role` and never reads window.role. Every real
  // login was silently treated internally as role="legal" regardless of
  // the person's actual role. See _setSession in app-logic.js.
  if (typeof window._setSession === 'function') {
    window._setSession(savedRole, demoRole ? null : profile)
  }

  // ── Update topbar with name / role / avatar ───────────────────────────────
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val }
  set('uName', profile?.name || R.name)
  set('uRole', profile?.role_label || R.role)
  set('uAv',   profile?.avatar || R.av)

  const nw = document.getElementById('newWrap')
  if (nw) nw.style.display = R.canCreate ? 'block' : 'none'

  const rb = document.getElementById('restrictBar')
  if (rb) rb.style.display = R.canCreate ? 'none' : 'block'

  const rr = document.getElementById('restrictRole')
  if (rr) rr.textContent = R.role

  // ── Show the portal ───────────────────────────────────────────────────────
  const shell = document.getElementById('appShell')
  if (shell) shell.style.display = 'flex'

  const login = document.getElementById('loginScreen')
  if (login) login.style.display = 'none'

  // ── Set login timestamp ───────────────────────────────────────────────────
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const tt = document.getElementById('avTooltip')
  if (tt) tt.textContent = `Signed in today at ${timeStr}`

  // ── Render table + stats ──────────────────────────────────────────────────
  if (typeof window.updateStats === 'function') window.updateStats()
  if (typeof window.render === 'function' && typeof window.gf === 'function') {
    window.render(window.gf())
  }

  // ── Check reminder notifications ──────────────────────────────────────────
  if (typeof window.checkReminderNotifications === 'function') {
    window.checkReminderNotifications()
  }

  // ── Load live data from the API if authenticated (not demo mode) ──────────
  // _loadFromApi replaces AGs entirely with real data (never merges with the
  // sample rows — see the comment on _loadFromApi itself) and returns
  // {ok, count} or {ok:false, error}. A failed load must be visible, not
  // silently left showing whatever was on screen before (which, for a real
  // account, would otherwise be nothing but the hardcoded demo fixtures).
  if (!demoRole && typeof window._loadFromApi === 'function') {
    window._loadFromApi().then(result => {
      if (typeof window.updateStats === 'function') window.updateStats()
      if (typeof window.render === 'function' && typeof window.gf === 'function') {
        window.render(window.gf())
      }
      if (typeof window.checkReminderNotifications === 'function') {
        window.checkReminderNotifications()
      }
      if (result.ok) {
        showToast(result.count === 0 ? 'No agreements yet' : 'Live data loaded', 'green')
      } else {
        showToast('Could not load your agreements — check your connection and refresh', 'red')
      }
    }).catch(() => {
      showToast('Could not load your agreements — check your connection and refresh', 'red')
    })
  }

}).catch(err => {
  console.error('Failed to load app-logic:', err)
})
