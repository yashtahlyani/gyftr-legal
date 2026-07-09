import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Graceful stub when env vars are absent (e.g. opening dist without a build)
const noop  = () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
const stub  = { from: () => ({ select: noop, insert: noop, update: noop, upsert: noop, delete: noop, eq: () => ({ select: noop }) }), auth: { signInWithPassword: noop, signOut: noop, getSession: noop } }

export const db = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : stub
