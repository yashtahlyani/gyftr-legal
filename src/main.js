// ── GyfTR Legal Portal — Main Entry Point ────────────────────────────────────

import { db } from './lib/supabase.js'
import { ROLES, AGs } from './data/sample.js'
import {
  fd, ns, td, parseTs, diffLabel,
  showToast, renderPromiseBadge, wordDiff, promiseDaysLeft
} from './ui/utils.js'

// ── 0. Auth check — supports both Supabase session and demo mode ─────────────
const demoRole = sessionStorage.getItem('demo_role')
let savedRole  = demoRole
let profile    = null

if (!demoRole) {
  // Try real Supabase session
  const { data: { session } } = await db.auth.getSession()
  if (!session) {
    window.location.href = '/index.html'
    throw new Error('Not authenticated')
  }

  const profileRaw = sessionStorage.getItem('profile')
  profile = profileRaw ? JSON.parse(profileRaw) : null

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

  window.role    = savedRole
  window.selRole = savedRole

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

  // ── Load live data from Supabase if authenticated (not demo mode) ─────────
  if (!demoRole && typeof window._loadFromSupabase === 'function') {
    AGs.length = 0
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
