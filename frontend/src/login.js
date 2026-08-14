import { signIn, completeNewPasswordChallenge } from './lib/auth-cognito.js'

const DEMO_EMAILS = {
  legal:      'nitin@gyftr.net',
  finance:    'neha@gyftr.net',
  business:   'pankaj.mehta@gyftr.net',
  compliance: 'nikhil@gyftr.net'
}

const ROLE_LABELS = {
  legal:      'Legal Team',
  finance:    'Finance Team',
  business:   'Business Team',
  compliance: 'Compliance Team'
}

let selectedRole = 'legal'

window.pickRole = function (el, k) {
  document.querySelectorAll('.role-pill').forEach(b => b.classList.remove('sel'))
  el.classList.add('sel')
  selectedRole = k
  const emailEl = document.getElementById('loginEmail')
  const passEl  = document.getElementById('loginPass')
  if (emailEl) emailEl.value = DEMO_EMAILS[k] || ''
  if (passEl)  passEl.value  = 'gyftr@1234'
  clearError()
}

function showError(msg) {
  let el = document.getElementById('loginError')
  if (!el) {
    el = document.createElement('div')
    el.id = 'loginError'
    el.style.cssText = 'color:#DC2626;font-size:13px;font-weight:600;margin-bottom:14px;padding:10px 14px;background:#FEF2F2;border:1px solid #FECACA;border-radius:9px;text-align:center'
    const btn = document.getElementById('loginBtn') || document.querySelector('.login-cta')
    btn?.parentNode.insertBefore(el, btn)
  }
  el.textContent = msg
  el.style.display = 'block'
}

function clearError() {
  const el = document.getElementById('loginError')
  if (el) el.style.display = 'none'
}

// Demo mode is a DEVELOPMENT-ONLY affordance. import.meta.env.DEV is true
// under `vite dev` and compiled to false by `vite build`, so none of this
// reaches production. It previously shipped: entering one of DEMO_EMAILS with
// ANY password bypassed Cognito completely and logged you into the portal.
const DEMO_MODE_ALLOWED = import.meta.env.DEV

function enterDemoMode(role) {
  sessionStorage.setItem('demo_role', role)
  sessionStorage.removeItem('profile')
  window.location.href = '/app.html'
}

window.handleLogin = async function () {
  const btn   = document.getElementById('loginBtn') || document.querySelector('.login-cta')
  const email = document.getElementById('loginEmail')?.value?.trim()
  const pass  = document.getElementById('loginPass')?.value?.trim()

  clearError()

  if (!email || !pass) {
    showError('Please enter your email and password.')
    return
  }

  // Demo role pill selected → bypass Cognito (development builds only)
  const demoRole = !DEMO_MODE_ALLOWED ? null
    : DEMO_EMAILS[selectedRole]
      ? selectedRole
      : Object.entries(DEMO_EMAILS).find(([, e]) => e === email)?.[0]
  if (demoRole) {
    enterDemoMode(demoRole)
    return
  }

  // Real email → try Cognito auth
  if (btn) { btn.textContent = 'Signing in…'; btn.disabled = true }

  try {
    // Real @gyftr.net account → Cognito. Returns the linked profiles row
    // (role, team_code, name, avatar) via GET /api/profile/me — or, for an
    // account still in FORCE_CHANGE_PASSWORD status, { mustChangePassword: true }.
    const result = await signIn(email, pass)

    if (result && result.mustChangePassword) {
      if (btn) { btn.textContent = 'Sign in →'; btn.disabled = false }
      showNewPasswordStep()
      return
    }

    sessionStorage.setItem('profile', JSON.stringify(result))
    window.location.href = '/app.html'

  } catch (err) {
    if (btn) { btn.textContent = 'Sign in →'; btn.disabled = false }
    const msg = (err.message || '').toLowerCase()
    if (msg.includes('incorrect') || msg.includes('not authorized') || msg.includes('invalid')) {
      showError('Incorrect email or password.')
    } else if (msg.includes('no profile linked')) {
      showError('This account has no linked profile. Contact an admin.')
    } else {
      showError('Could not connect to server. Check your internet connection.')
    }
  }
}

// ── First-login / forced password reset ─────────────────────────────────

function showNewPasswordStep() {
  const loginCard = document.querySelector('.login-card:not(#newPasswordCard)')
  const newCard   = document.getElementById('newPasswordCard')
  if (loginCard) loginCard.style.display = 'none'
  if (newCard)   newCard.style.display   = 'block'
  document.getElementById('newPass1')?.focus()
}

const PW_RULES = [
  { id: 'rule-len',   label: 'At least 8 characters',            test: v => v.length >= 8 },
  { id: 'rule-upper', label: 'One uppercase letter',              test: v => /[A-Z]/.test(v) },
  { id: 'rule-lower', label: 'One lowercase letter',              test: v => /[a-z]/.test(v) },
  { id: 'rule-num',   label: 'One number',                        test: v => /[0-9]/.test(v) },
  { id: 'rule-sym',   label: 'One symbol (!@#$%^&* etc.)',        test: v => /[^A-Za-z0-9]/.test(v) },
]

function updatePasswordRules() {
  const v1 = document.getElementById('newPass1')?.value || ''
  const v2 = document.getElementById('newPass2')?.value || ''
  let allMet = true
  for (const rule of PW_RULES) {
    const met = rule.test(v1)
    if (!met) allMet = false
    const el = document.getElementById(rule.id)
    if (el) {
      el.style.color = met ? '#15803D' : '#94a59b'
      el.innerHTML = (met ? '&#10003; ' : '&#9675; ') + rule.label
    }
  }
  const matchEl = document.getElementById('rule-match')
  const matches = v1.length > 0 && v1 === v2
  if (!matches) allMet = false
  if (matchEl) {
    matchEl.style.color = matches ? '#15803D' : '#94a59b'
    matchEl.innerHTML = (matches ? '&#10003; ' : '&#9675; ') + 'Passwords match'
  }
  return allMet
}

document.getElementById('newPass1')?.addEventListener('input', updatePasswordRules)
document.getElementById('newPass2')?.addEventListener('input', updatePasswordRules)

function showNewPasswordError(msg) {
  const el = document.getElementById('newPasswordError')
  if (!el) return
  el.textContent = msg
  el.style.display = 'block'
}
function clearNewPasswordError() {
  const el = document.getElementById('newPasswordError')
  if (el) el.style.display = 'none'
}

window.handleSetNewPassword = async function () {
  clearNewPasswordError()
  const v1 = document.getElementById('newPass1')?.value || ''

  if (!updatePasswordRules()) {
    showNewPasswordError('Password does not meet the requirements above.')
    return
  }

  const btn = document.getElementById('newPasswordBtn')
  if (btn) { btn.textContent = 'Setting password…'; btn.disabled = true }

  try {
    const profile = await completeNewPasswordChallenge(v1)
    sessionStorage.setItem('profile', JSON.stringify(profile))
    window.location.href = '/app.html'
  } catch (err) {
    if (btn) { btn.textContent = 'Set password & continue →'; btn.disabled = false }
    showNewPasswordError(err.message || 'Could not set password. Try again.')
  }
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return
  const newCardVisible = document.getElementById('newPasswordCard')?.style.display === 'block'
  if (newCardVisible) window.handleSetNewPassword()
  else window.handleLogin()
})

// Pre-select Legal on load
;(function init() {
  const emailEl = document.getElementById('loginEmail')
  const passEl  = document.getElementById('loginPass')
  if (emailEl && !emailEl.value) emailEl.value = DEMO_EMAILS.legal
  if (passEl  && !passEl.value)  passEl.value  = 'gyftr@1234'
})()
