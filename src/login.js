import { db } from './lib/supabase.js'

const ROLE_EMAILS = {
  legal:      'alex.carter@example.com',
  finance:    'jordan.lee@example.com',
  business:   'sam.rivera@example.com',
  compliance: 'riley.quinn@example.com'
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
  if (emailEl) emailEl.value = ROLE_EMAILS[k] || ''
  if (passEl)  passEl.value  = 'ChangeMe123!'
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

window.handleLogin = async function () {
  const btn   = document.getElementById('loginBtn') || document.querySelector('.login-cta')
  const email = document.getElementById('loginEmail')?.value?.trim()
  const pass  = document.getElementById('loginPass')?.value?.trim()

  clearError()

  if (!email || !pass) {
    showError('Please enter your email and password.')
    return
  }

  if (btn) { btn.textContent = 'Signing in…'; btn.disabled = true }

  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password: pass })

    if (error) {
      if (btn) { btn.textContent = 'Sign in →'; btn.disabled = false }
      if (error.message?.toLowerCase().includes('invalid')) {
        showError('Incorrect email or password.')
      } else {
        showError(error.message || 'Sign-in failed. Please try again.')
      }
      return
    }

    // Determine role from email
    const matchedRole = Object.entries(ROLE_EMAILS).find(([, e]) => e === email)?.[0] || selectedRole
    sessionStorage.setItem('role', matchedRole)
    window.location.href = '/app.html'

  } catch (err) {
    if (btn) { btn.textContent = 'Sign in →'; btn.disabled = false }
    showError('Could not connect to server. Check your internet connection.')
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') window.handleLogin()
})

// Pre-select Legal on load — pill is already .sel from HTML
// Pre-fill email and password to match
;(function init() {
  const emailEl = document.getElementById('loginEmail')
  const passEl  = document.getElementById('loginPass')
  if (emailEl && !emailEl.value) emailEl.value = ROLE_EMAILS.legal
  if (passEl  && !passEl.value)  passEl.value  = 'ChangeMe123!'
})()
