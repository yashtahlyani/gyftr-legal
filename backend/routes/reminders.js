// routes/reminders.js — replaces db.from('reminders').
// RLS was: "Add reminders" insert with check (authenticated); "Update reminders" update
// using (authenticated) — no extra per-row check for either.
//
// NOTE: the live frontend today does NOT actually call this table — the
// "nudge" feature in app-logic.js only writes to an in-memory object, so
// reminders vanish on refresh (see docs/KT.md §6.5 item 5). This route is
// ported for parity with the RLS grant and is wired up in the new
// src/lib/api.js so nudges can be made to persist going forward — see
// infra/HANDOVER.md "common changes" for how to flip that on.

import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// POST /api/reminders
router.post('/reminders', async (req, res) => {
  const { agreementId, fromRole, toTeams, clientName } = req.body;
  try {
    const { rows } = await query(
      `insert into reminders (agreement_id, from_role, from_name, to_teams, client_name)
       values ($1,$2,$3,$4,$5) returning *`,
      [agreementId, fromRole, req.profile.name, toTeams, clientName]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /reminders]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reminders — reminders addressed to the caller's own team.
// Team comes from the verified profile, not a client-supplied query param —
// a client could otherwise pass ?team=L and read another team's reminders.
router.get('/reminders', async (req, res) => {
  try {
    const { rows } = await query(
      `select * from reminders where $1 = any(to_teams) order by sent_at desc`,
      [req.profile.team_code]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /reminders]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reminders/:id/dismiss
router.patch('/reminders/:id/dismiss', async (req, res) => {
  const { teamCode } = req.body;
  try {
    await query(
      `update reminders set dismissed_by = array_append(dismissed_by, $1) where id = $2`,
      [teamCode, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /reminders/:id/dismiss]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
