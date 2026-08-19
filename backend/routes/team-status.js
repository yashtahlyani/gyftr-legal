// routes/team-status.js — replaces db.from('team_statuses')/db.from('history_log').
// RLS was: "Update own team status" using (team_code = own OR role = 'legal').

import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { canUpdateTeamStatus } from '../authz.js';

const router = Router();

// PATCH /api/agreements/:agreementId/team-status
//
// `status` accepts 'Rejected' ("Reject with Remarks" in the stage-engine
// spec) — but that's only a valid My-status value at Stage 2
// (final_approval_pending); Stage 1 and Stage 3 have no reject option. That
// restriction is enforced here, not just hidden in the UI, and a remark is
// mandatory and inserted atomically with the status change (`remarkText` in
// the body) rather than trusted to arrive via a second, separate call.
router.patch('/agreements/:agreementId/team-status', async (req, res) => {
  const { agreementId } = req.params;
  const { teamCode, status, fromStatus, teamName, remarkText } = req.body;

  if (!canUpdateTeamStatus(req.profile, teamCode)) {
    return res.status(403).json({ error: 'You can only update your own team’s status' });
  }

  try {
    if (status === 'Rejected') {
      const { rows } = await query('select stage from agreements where id = $1', [agreementId]);
      if (!rows[0]) return res.status(404).json({ error: 'Agreement not found' });
      if (rows[0].stage !== 'final_approval_pending') {
        return res.status(400).json({ error: 'Reject with Remarks is only available at the final approval stage' });
      }
      if (!remarkText || !remarkText.trim()) {
        return res.status(400).json({ error: 'A remark explaining the rejection is required' });
      }
    }

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
      if (status === 'Rejected' && remarkText && remarkText.trim()) {
        await client.query(
          `insert into remarks (agreement_id, author_id, author_name, author_role, text)
           values ($1,$2,$3,$4,$5)`,
          [agreementId, req.profile.id, req.profile.name, req.profile.role, remarkText.trim()]
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
