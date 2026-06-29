import { db } from '../lib/supabase.js'

export async function signIn(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password })
  if (error) throw error
  const { data: profile, error: pErr } = await db
    .from('profiles').select('*').eq('id', data.user.id).single()
  if (pErr) throw pErr
  sessionStorage.setItem('profile', JSON.stringify(profile))
  return profile
}

export async function signOut() {
  sessionStorage.removeItem('profile')
  await db.auth.signOut()
  window.location.href = '/index.html'
}

export function getProfile() {
  const raw = sessionStorage.getItem('profile')
  return raw ? JSON.parse(raw) : null
}
