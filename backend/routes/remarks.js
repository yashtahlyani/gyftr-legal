// routes/remarks.js — replaces db.from('remarks'). RLS was: any authenticated user may insert.

import { Router } from 'express';
import { query, withTransaction } from '../db.js';

const router = Router();

// POST /api/agreements/:agreementId/remarks
router.post('/agreements/:agreementId/remarks', async (req, res) => {
  const { agreementId } = req.params;
  const { text } = req.body;
  try {
    const remark = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `insert into remarks (agreement_id, author_id, author_name, author_role, text)
         values ($1,$2,$3,$4,$5) returning *`,
        [agreementId, req.profile.id, req.profile.name, req.profile.role, text]
      );
      await client.query('update agreements set updated_at = now() where id = $1', [agreementId]);
      return rows[0];
    });
    res.status(201).json(remark);
  } catch (err) {
    console.error('[POST /agreements/:agreementId/remarks]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
