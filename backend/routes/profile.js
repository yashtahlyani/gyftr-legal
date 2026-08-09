// routes/profile.js — replaces db.from('profiles').select('*').eq('id', session.user.id).single()
// used by the frontend right after login to populate the topbar + role.

import { Router } from 'express';

const router = Router();

// GET /api/profile/me — the requireAuth + loadProfile middleware (wired in
// server.js) already resolved req.profile from the Cognito sub; this just
// returns it. RLS was: "Read profiles" for select using (authenticated).
router.get('/profile/me', (req, res) => {
  res.json(req.profile);
});

export default router;
