// ── GyfTR Legal Portal — Main Entry Point ────────────────────────────────────

import { db } from './lib/supabase.js'
import { ROLES, AGs } from './data/sample.js'
import {
  fd, ns, td, parseTs, diffLabel,
  showToast, renderPromiseBadge, wordDiff, promiseDaysLeft
} from './ui/utils.js'

// ── 0. Require a real Supabase session before showing anything ──────────────
const { data: { session } } = await db.auth.getSession()
if (!session) {
  window.location.href = '/index.html'
  throw new Error('Not authenticated')
}

// ── Load the real profile (re-fetch if missing from sessionStorage, e.g. refresh) ──
const profileRaw = sessionStorage.getItem('profile')
let profile = profileRaw ? JSON.parse(profileRaw) : null

if (!profile) {
  const { data: p, error: pErr } = await db
    .from('profiles').select('*').eq('id', session.user.id).single()
  if (pErr || !p) {
    window.location.href = '/index.html'
    throw new Error('No profile found')
  }
  profile = p
  sessionStorage.setItem('profile', JSON.stringify(profile))
}

const savedRole = profile.role

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

// ── 2. Load Google API module ─────────────────────────────────────────────────
import('./ui/google-api.js').catch(err => console.error('google-api load failed:', err))
import('./ui/ai-analyze.js').catch(err => console.error('ai-analyze load failed:', err))

// ── 3. Load app-logic (all screens, modals, render) ──────────────────────────
import('./ui/app-logic.js').then(() => {

  window.role    = savedRole
  window.selRole = savedRole

  // ── 3. Update topbar with correct name / role / avatar ──────────────────
  const R = ROLES[savedRole]
  if (R) {
    const set = (id, val) => {
      const el = document.getElementById(id)
      if (el) el.textContent = val
    }
    set('uName', profile?.name || R.name)
    set('uRole', profile?.role || R.role)
    set('uAv',   profile?.avatar || R.av)

    const nw = document.getElementById('newWrap')
    if (nw) nw.style.display = R.canCreate ? 'block' : 'none'

    const rb = document.getElementById('restrictBar')
    if (rb) rb.style.display = R.canCreate ? 'none' : 'block'

    const rr = document.getElementById('restrictRole')
    if (rr) rr.textContent = R.role
  }

  // ── 4. Show the portal, hide login ──────────────────────────────────────
  const shell = document.getElementById('appShell')
  if (shell) shell.style.display = 'flex'

  const login = document.getElementById('loginScreen')
  if (login) login.style.display = 'none'

  // ── 5. Set login timestamp on avatar tooltip ─────────────────────────────
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  })
  const tt = document.getElementById('avTooltip')
  if (tt) tt.textContent = `Signed in today at ${timeStr}`

  // ── 6. Render table + stats ──────────────────────────────────────────────
  if (typeof window.updateStats === 'function') window.updateStats()
  if (typeof window.render === 'function' && typeof window.gf === 'function') {
    window.render(window.gf())
  }

  // ── 7. Check for pending reminders (shows red banner for non-legal) ──────
  if (typeof window.checkReminderNotifications === 'function') {
    window.checkReminderNotifications()
  }

  // ── 8. Load live agreements from Supabase and re-render ─────────────────
 // ── 8. Load live agreements from Supabase and re-render ─────────────────
if (typeof window._loadFromSupabase === 'function') {
  AGs.length = 0  // clear local dummy data so Supabase rows don't stack on top
  window._loadFromSupabase().then(loaded => {
      if (loaded) {
        if (typeof window.updateStats === 'function') window.updateStats()
        if (typeof window.render === 'function' && typeof window.gf === 'function') {
          window.render(window.gf())
        }
        if (typeof window.checkReminderNotifications === 'function') {
          window.checkReminderNotifications()
        }
        showToast('Live data loaded from Supabase', 'green')
      }
    }).catch(() => {})
  }

}).catch(err => {
  console.error('Failed to load app-logic:', err)
})