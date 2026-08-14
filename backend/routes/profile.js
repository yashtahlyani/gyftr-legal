// routes/profile.js — replaces db.from('profiles').select('*').eq('id', session.user.id).single()
// used by the frontend right after login to populate the topbar + role.

import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/profile/me — the requireAuth + loadProfile middleware (wired in
// server.js) already resolved req.profile from the Cognito sub; this just
// returns it. RLS was: "Read profiles" for select using (authenticated).
router.get('/profile/me', (req, res) => {
  res.json(req.profile);
});

// GET /api/users — the real directory (email, name, role, team_code,
// avatar), for building dropdowns/avatars from actual data instead of a
// hardcoded list. Any authenticated user may read it, matching the same
// "any authenticated user may read" pattern used everywhere else in this
// app (RLS never distinguished readers by role either).
router.get('/users', async (req, res) => {
  try {
    const { rows } = await query(
      `select id, email, name, role, team_code, avatar
       from profiles
       order by name asc`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /users]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
