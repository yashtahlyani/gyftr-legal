// routes/drafts.js — replaces supabase.storage.from('legal-drafts') + db.from('drafts').
// RLS was: "Upload drafts" insert with check (role = 'legal'); reads open to any authenticated user.

import { Router } from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { uploadDraftFile, getDraftSignedUrl } from '../s3.js';
import { requireDraftUploadPermission } from '../authz.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// POST /api/agreements/:agreementId/drafts — upload a draft file + create its row.
router.post('/agreements/:agreementId/drafts', requireDraftUploadPermission, upload.single('file'), async (req, res) => {
  const { agreementId } = req.params;
  const { draftNo, direction, note } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'file is required' });

  try {
    const ext = file.originalname.includes('.') ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '';
    const filePath = `${agreementId}/${draftNo}${ext}`;
    await uploadDraftFile(filePath, file.buffer, file.mimetype);

    const { rows } = await query(
      `insert into drafts (agreement_id, draft_no, direction, note, file_path, file_name, date, created_by)
       values ($1,$2,$3,$4,$5,$6,current_date,$7)
       returning *`,
      [agreementId, draftNo, direction || 'sent', note || null, filePath, file.originalname, req.profile.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /agreements/:agreementId/drafts]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/drafts/:id/url — presigned view URL (any authenticated user).
// Word docs are wrapped in the Google Docs viewer, same as before.
router.get('/drafts/:id/url', async (req, res) => {
  try {
    const { rows } = await query('select file_path from drafts where id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Draft not found' });

    const signedUrl = await getDraftSignedUrl(rows[0].file_path);
    const isWord = /\.(docx?|doc)$/i.test(rows[0].file_path);
    const url = isWord
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`
      : signedUrl;
    res.json({ url });
  } catch (err) {
    console.error('[GET /drafts/:id/url]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/drafts/:id/direction — sent/received toggle (Legal only, matches
// the UI restriction; the blanket "Upload drafts" RLS policy was the closest
// existing policy for any drafts write, so it's reused here).
router.patch('/drafts/:id/direction', requireDraftUploadPermission, async (req, res) => {
  try {
    await query('update drafts set direction = $1 where id = $2', [req.body.direction, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /drafts/:id/direction]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
