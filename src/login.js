import { db } from './lib/supabase.js'

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

// Enter demo mode — no Supabase needed, matches v9 behaviour
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

  // Demo role pill selected → bypass Supabase (trust selectedRole over autofilled email)
  const demoRole = DEMO_EMAILS[selectedRole]
    ? selectedRole
    : Object.entries(DEMO_EMAILS).find(([, e]) => e === email)?.[0]
  if (demoRole) {
    enterDemoMode(demoRole)
    return
  }

  // Real email → try Supabase auth
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

    // Determine role from profiles table
    const { data: profile } = await db
      .from('profiles').select('*').eq('id', data.user.id).single()
    const matchedRole = profile?.role
      || Object.entries(DEMO_EMAILS).find(([, e]) => e === email)?.[0]
      || selectedRole

    sessionStorage.setItem('profile', JSON.stringify(profile || { role: matchedRole }))
    window.location.href = '/app.html'

  } catch (err) {
    if (btn) { btn.textContent = 'Sign in →'; btn.disabled = false }
    showError('Could not connect to server. Check your internet connection.')
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') window.handleLogin()
})

// Pre-select Legal on load
;(function init() {
  const emailEl = document.getElementById('loginEmail')
  const passEl  = document.getElementById('loginPass')
  if (emailEl && !emailEl.value) emailEl.value = DEMO_EMAILS.legal
  if (passEl  && !passEl.value)  passEl.value  = 'gyftr@1234'
})()
