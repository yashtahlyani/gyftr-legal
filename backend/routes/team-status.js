// routes/team-status.js — replaces db.from('team_statuses')/db.from('history_log').
// RLS was: "Update own team status" using (team_code = own OR role = 'legal').

import { Router } from 'express';
import { withTransaction } from '../db.js';
import { canUpdateTeamStatus } from '../authz.js';

const router = Router();

// PATCH /api/agreements/:agreementId/team-status
router.patch('/agreements/:agreementId/team-status', async (req, res) => {
  const { agreementId } = req.params;
  const { teamCode, status, fromStatus, teamName } = req.body;

  if (!canUpdateTeamStatus(req.profile, teamCode)) {
    return res.status(403).json({ error: 'You can only update your own team’s status' });
  }

  try {
    await withTransaction(async (client) => {
      await client.query(
        `insert into team_statuses (agreement_id, team_code, status, updated_at, updated_by)
         values ($1,$2,$3, now(), $4)
         on conflict (agreement_id, team_code)
         do update set status = excluded.status, updated_at = now(), updated_by = excluded.updated_by`,
        [agreementId, teamCode, status, req.profile.name]
      );
      // Only log a transition when the status actually changed — matches the
      // old frontend logic (`if (prev !== v) { insert history_log }`).
      if (fromStatus && fromStatus !== status) {
        await client.query(
          `insert into history_log (agreement_id, team, changed_by, from_status, to_status)
           values ($1,$2,$3,$4,$5)`,
          [agreementId, teamName || teamCode, req.profile.name, fromStatus, status]
        );
      }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /agreements/:agreementId/team-status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
