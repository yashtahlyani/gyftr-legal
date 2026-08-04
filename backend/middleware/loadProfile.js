// middleware/loadProfile.js — attaches req.profile (role, team_code, name, …)
// by looking up the authenticated Cognito user's `sub` in the profiles table.
//
// Every RLS policy in the old Supabase schema keyed off
// `(select role from profiles where id = auth.uid())` — this is the
// server-side equivalent of that lookup, run once per request and reused
// by backend/authz.js instead of re-querying per check.

import { query } from '../db.js';

export async function loadProfile(req, res, next) {
  try {
    const { rows } = await query(
      'select id, cognito_sub, email, name, role, team_code, avatar from profiles where cognito_sub = $1',
      [req.user.sub]
    );
    if (!rows[0]) {
      return res.status(403).json({ error: 'No profile linked to this account. Contact an admin.' });
    }
    req.profile = rows[0];
    next();
  } catch (err) {
    console.error('[loadProfile]', err.message);
    res.status(500).json({ error: 'Failed to load profile' });
  }
}
