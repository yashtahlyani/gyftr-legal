// routes/stage.js — the Stage engine (Legal Panel Tool functional spec v4).
//
// Stage is a 4-value state machine (review_pending -> final_approval_pending
// -> signing_required -> signing_done), deliberately independent of the
// existing `status` column — the spec is explicit that there's no
// auto-mirroring between the two, so this file never touches `status`.
//
// Every transition is restricted to "the specific person who uploaded the
// agreement at task creation" — not role='legal' in general. That's
// authz.isOriginalUploader(), checked against agreements.created_by. There
// is deliberately no delegate/fallback if that person is unavailable — out
// of scope per the spec (Section 9).

import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { isOriginalUploader } from '../authz.js';

const router = Router();

const STAGE_LABEL = {
  review_pending:          'Review pending',
  final_approval_pending:  'Final approval pending',
  signing_required:        'Signing required',
  signing_done:            'Signing done',
};

async function loadAgreement(id) {
  const { rows } = await query('select * from agreements where id = $1', [id]);
  return rows[0] || null;
}

async function loadTeamStatuses(agreementId) {
  const { rows } = await query('select team_code, status from team_statuses where agreement_id = $1', [agreementId]);
  const byTeam = {};
  rows.forEach(r => { byTeam[r.team_code] = r.status; });
  return byTeam;
}

async function resetAllTeamStatuses(client, agreementId, changedBy) {
  for (const team of ['L', 'F', 'C', 'B']) {
    await client.query(
      `update team_statuses set status = 'Pending', updated_at = now(), updated_by = $1
       where agreement_id = $2 and team_code = $3`,
      [changedBy, agreementId, team]
    );
  }
}

async function nextDraftNo(client, agreementId) {
  const { rows } = await client.query('select count(*)::int as n from drafts where agreement_id = $1', [agreementId]);
  return `D-stage2-${rows[0].n + 1}`;
}

// PATCH /api/agreements/:id/stage/advance
// Body: { docLink } — required only for the review_pending ->
// final_approval_pending transition (the new document for final approval).
// The other two transitions take no body.
router.patch('/agreements/:id/stage/advance', async (req, res) => {
  const { id } = req.params;
  try {
    const agreement = await loadAgreement(id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (!isOriginalUploader(req.profile, agreement)) {
      return res.status(403).json({ error: 'Only the person who originally uploaded this agreement can advance its stage' });
    }

    const statuses = await loadTeamStatuses(id);
    const allApproved = (codes) => codes.every(c => statuses[c] === 'Approved');

    // ── Stage 1 -> 2 ──────────────────────────────────────────────────────
    if (agreement.stage === 'review_pending') {
      const docLink = (req.body.docLink || '').trim();
      if (!docLink) return res.status(400).json({ error: 'A document link for final approval is required' });
      if (!allApproved(['L', 'F', 'C', 'B'])) {
        return res.status(400).json({ error: 'All 4 teams must have My status = Approved before moving to final approval' });
      }

      await withTransaction(async (client) => {
        await client.query(
          `update agreements set stage = 'final_approval_pending', stage2_doc_link = $1, updated_at = now() where id = $2`,
          [docLink, id]
        );
        await resetAllTeamStatuses(client, id, req.profile.name);
        const draftNo = await nextDraftNo(client, id);
        await client.query(
          `insert into drafts (agreement_id, draft_no, direction, note, doc_link, created_by)
           values ($1,$2,'sent','Final approval draft',$3,$4)`,
          [id, draftNo, docLink, req.profile.id]
        );
        await client.query(
          `insert into history_log (agreement_id, team, changed_by, from_status, to_status)
           values ($1, null, $2, $3, $4)`,
          [id, req.profile.name, STAGE_LABEL.review_pending, STAGE_LABEL.final_approval_pending]
        );
      });
      return res.json({ ok: true, stage: 'final_approval_pending' });
    }

    // ── Stage 2 -> 3 ──────────────────────────────────────────────────────
    if (agreement.stage === 'final_approval_pending') {
      if (!allApproved(['L', 'F', 'C', 'B'])) {
        return res.status(400).json({
          error: 'All 4 teams must have My status = Approved (no one Pending, Under Review, or Rejected) before moving to sign-in stage',
        });
      }
      await withTransaction(async (client) => {
        await client.query(`update agreements set stage = 'signing_required', updated_at = now() where id = $1`, [id]);
        // My status resets; from here only Legal's is meaningful going
        // forward (the frontend hides the control for the other 3).
        await resetAllTeamStatuses(client, id, req.profile.name);
        await client.query(
          `insert into history_log (agreement_id, team, changed_by, from_status, to_status)
           values ($1, null, $2, $3, $4)`,
          [id, req.profile.name, STAGE_LABEL.final_approval_pending, STAGE_LABEL.signing_required]
        );
      });
      return res.json({ ok: true, stage: 'signing_required' });
    }

    // ── Stage 3 -> Closed ────────────────────────────────────────────────
    if (agreement.stage === 'signing_required') {
      if (statuses.L !== 'Approved') {
        return res.status(400).json({ error: "Legal's My status must be Approved before closing" });
      }
      await withTransaction(async (client) => {
        await client.query(`update agreements set stage = 'signing_done', updated_at = now() where id = $1`, [id]);
        await client.query(
          `insert into history_log (agreement_id, team, changed_by, from_status, to_status)
           values ($1, null, $2, $3, $4)`,
          [id, req.profile.name, STAGE_LABEL.signing_required, STAGE_LABEL.signing_done]
        );
      });
      return res.json({ ok: true, stage: 'signing_done' });
    }

    return res.status(400).json({ error: 'This agreement has already completed the signing stage' });
  } catch (err) {
    console.error('[PATCH /agreements/:id/stage/advance]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agreements/:id/stage/revise-doc — Stage-2-only same-stage
// document correction ("this is a same-stage correction, not a backward
// transition to Stage 1"). Never changes `stage`; resets all 4 My statuses.
router.post('/agreements/:id/stage/revise-doc', async (req, res) => {
  const { id } = req.params;
  const docLink = (req.body.docLink || '').trim();
  const reason  = (req.body.reason || '').trim();
  try {
    const agreement = await loadAgreement(id);
    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (!isOriginalUploader(req.profile, agreement)) {
      return res.status(403).json({ error: 'Only the person who originally uploaded this agreement can upload a revised draft' });
    }
    if (agreement.stage !== 'final_approval_pending') {
      return res.status(400).json({ error: 'A revised draft can only be uploaded while in the final approval stage' });
    }
    if (!docLink) return res.status(400).json({ error: 'A document link is required' });
    if (!reason)  return res.status(400).json({ error: 'A reason for the revision is required' });

    await withTransaction(async (client) => {
      await client.query(`update agreements set stage2_doc_link = $1, updated_at = now() where id = $2`, [docLink, id]);
      await resetAllTeamStatuses(client, id, req.profile.name);
      const draftNo = await nextDraftNo(client, id);
      await client.query(
        `insert into drafts (agreement_id, draft_no, direction, note, doc_link, created_by)
         values ($1,$2,'sent',$3,$4,$5)`,
        [id, draftNo, `Revised draft — ${reason}`, docLink, req.profile.id]
      );
      await client.query(
        `insert into history_log (agreement_id, team, changed_by, from_status, to_status)
         values ($1, null, $2, $3, $4)`,
        [id, req.profile.name, STAGE_LABEL.final_approval_pending, STAGE_LABEL.final_approval_pending + ' (revised draft)']
      );
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[POST /agreements/:id/stage/revise-doc]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
