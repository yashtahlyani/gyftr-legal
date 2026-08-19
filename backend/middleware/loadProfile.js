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
    if (rows[0]) {
      req.profile = rows[0];
      return next();
    }

    // No profile is linked to this exact Cognito identity yet — the normal
    // shape of a first-ever Google SSO login: Cognito mints a brand-new
    // federated `sub` per person the first time they sign in via Google,
    // which never matches whatever scripts/create-cognito-users.js wrote
    // (if anything). Fall back to matching by email, but only when Cognito
    // has actually verified it — never trust an unverified email claim to
    // attach a session to someone else's profile. If a match exists and
    // isn't already linked to a different identity, link it now so every
    // later request for this person hits the fast path above.
    if (req.user.email && req.user.email_verified) {
      const byEmail = await query(
        'select id, cognito_sub, email, name, role, team_code, avatar from profiles where email = $1',
        [req.user.email]
      );
      const candidate = byEmail.rows[0];
      if (candidate && !candidate.cognito_sub) {
        await query('update profiles set cognito_sub = $1 where id = $2', [req.user.sub, candidate.id]);
        req.profile = { ...candidate, cognito_sub: req.user.sub };
        return next();
      }
    }

    return res.status(403).json({ error: 'No profile linked to this account. Contact an admin.' });
  } catch (err) {
    console.error('[loadProfile]', err.message);
    res.status(500).json({ error: 'Failed to load profile' });
  }
}
