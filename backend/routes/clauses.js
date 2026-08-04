// routes/clauses.js — replaces db.from('clauses').
//
// NOTE — discovered gap in the original Supabase RLS, flagged here rather
// than silently ported: supabase/schema.sql defines a "Read <table>" SELECT
// policy for `clauses`, but there was NO UPDATE policy on `clauses` at all.
// With RLS default-deny, the browser's direct
// `db.from('clauses').update({outcome}).eq('id', clauseId)` call (used by
// the Legal-only outcome dropdown) would have been silently rejected by
// Postgres in the real deployment — the UI only ever showed this control to
// Legal, but the DB write itself had no authorized path. We're not
// replicating that gap: this route gates on role='legal', which matches the
// UI's own restriction and the general pattern used for every other
// Legal-only agreement-content edit. See infra/HANDOVER.md for the full note.

import { Router } from 'express';
import { query } from '../db.js';
import { requireLegal } from '../authz.js';

const router = Router();

// PATCH /api/clauses/:id/outcome
router.patch('/clauses/:id/outcome', requireLegal, async (req, res) => {
  try {
    await query('update clauses set outcome = $1 where id = $2', [req.body.outcome, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /clauses/:id/outcome]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
