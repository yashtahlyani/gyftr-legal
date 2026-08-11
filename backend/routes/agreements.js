// routes/agreements.js — replaces supabase.from('agreements')... calls.
//
// GET / mirrors the old nested select:
//   .from('agreements').select('*, drafts(*), team_statuses(*), remarks(*),
//     history_log(*), clauses(*, clause_changes(*))')
// Postgres has no PostgREST-style embedding, so each relation is built with
// a `jsonb_agg` subquery instead — same shape, same ordering.

import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireLegal } from '../authz.js';

const router = Router();

const NESTED_SELECT = `
  select
    a.*,
    coalesce((
      select jsonb_agg(to_jsonb(d) order by d.date asc)
      from drafts d where d.agreement_id = a.id
    ), '[]') as drafts,
    coalesce((
      select jsonb_agg(to_jsonb(ts))
      from team_statuses ts where ts.agreement_id = a.id
    ), '[]') as team_statuses,
    coalesce((
      select jsonb_agg(to_jsonb(r) order by r.created_at asc)
      from remarks r where r.agreement_id = a.id
    ), '[]') as remarks,
    coalesce((
      select jsonb_agg(to_jsonb(h) order by h.created_at asc)
      from history_log h where h.agreement_id = a.id
    ), '[]') as history_log,
    coalesce((
      select jsonb_agg(clause_row)
      from (
        select c.*, coalesce((
          select jsonb_agg(to_jsonb(cc) order by cc.draft_no asc)
          from clause_changes cc where cc.clause_id = c.id
        ), '[]') as clause_changes
        from clauses c where c.agreement_id = a.id
      ) clause_row
    ), '[]') as clauses
  from agreements a
  order by a.created_at desc
`;

// GET /api/agreements — full nested list (any authenticated user)
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(NESTED_SELECT);
    res.json(rows);
  } catch (err) {
    console.error('[GET /agreements]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agreements — create agreement + 4 default team_statuses rows.
// RLS was: "Legal creates agreements" insert with check (role = 'legal').
router.post('/', requireLegal, async (req, res) => {
  const f = req.body;
  try {
    const result = await withTransaction(async (client) => {
      const tag = f.tag || (f.client || '').slice(0, 4).toUpperCase();
      const { rows } = await client.query(
        `insert into agreements
           (client, tag, type, status, client_status, promise_date,
            spoc_legal, spoc_finance, spoc_business, spoc_compliance,
            doc_link, start_date, created_by)
         values ($1,$2,$3,'pending','awaiting',$4,$5,$6,$7,$8,$9,current_date,$10)
         returning *`,
        [f.client, tag, f.type, f.promiseDate || null, f.spocLegal || null,
         f.spocFinance || null, f.spocBusiness || null, f.spocCompliance || null,
         f.docLink || null, req.profile.id]
      );
      const agreement = rows[0];

      for (const team of ['L', 'F', 'C', 'B']) {
        await client.query(
          `insert into team_statuses (agreement_id, team_code, status) values ($1,$2,'Pending')`,
          [agreement.id, team]
        );
      }

      await client.query(
        `insert into history_log (agreement_id, team, changed_by, from_status, to_status)
         values ($1, 'Legal', $2, '—', 'Pending')`,
        [agreement.id, req.profile.name]
      );

      await client.query(
        `insert into remarks (agreement_id, author_id, author_name, author_role, text)
         values ($1,$2,$3,$4,'Agreement created.')`,
        [agreement.id, req.profile.id, req.profile.name, req.profile.role]
      );

      return agreement;
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('[POST /agreements]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/agreements/:id/status — overall status change (Legal only).
// RLS was: "Legal updates agreements" using (role = 'legal').
router.patch('/:id/status', requireLegal, async (req, res) => {
  const { id } = req.params;
  const { status, fromStatusLabel, toStatusLabel } = req.body;
  try {
    await withTransaction(async (client) => {
      await client.query(
        `update agreements set status = $1, updated_at = now() where id = $2`,
        [status, id]
      );
      await client.query(
        `insert into history_log (agreement_id, team, changed_by, from_status, to_status)
         values ($1, 'Legal', $2, $3, $4)`,
        [id, req.profile.name, fromStatusLabel || null, toStatusLabel || status]
      );
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /agreements/:id/status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/agreements/:id/client-status — client-facing status (Legal only,
// same "Legal updates agreements" RLS policy — it was a blanket per-row
// UPDATE policy, not scoped to specific columns).
router.patch('/:id/client-status', requireLegal, async (req, res) => {
  const { id } = req.params;
  const { clientStatus } = req.body;
  try {
    await query(
      `update agreements set client_status = $1, updated_at = now() where id = $2`,
      [clientStatus, id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /agreements/:id/client-status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/agreements/:id/client-dates — client detail screen (Legal only,
// same blanket agreements UPDATE policy as above).
router.patch('/:id/client-dates', requireLegal, async (req, res) => {
  const { id } = req.params;
  const { clientDates } = req.body;
  try {
    await query(
      `update agreements set client_dates = $1, updated_at = now() where id = $2`,
      [JSON.stringify(clientDates || {}), id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /agreements/:id/client-dates]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agreements/:id — Legal only.
// RLS was: "Legal deletes agreements" (added in seed.sql), not currently
// wired to any UI button, but ported here for parity since RLS granted it.
router.delete('/:id', requireLegal, async (req, res) => {
  try {
    await query('delete from agreements where id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /agreements/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
