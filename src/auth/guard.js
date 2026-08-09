import { db } from '../lib/supabase.js'

export async function requireAuth() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) { window.location.href = '/index.html'; return null }
  return session
}
