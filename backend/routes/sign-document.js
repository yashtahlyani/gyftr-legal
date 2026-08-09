// routes/sign-document.js — ports supabase/functions/sign-document/index.ts.
// Adobe Sign is a third-party service unrelated to Supabase/Vercel and stays
// as-is; only the hosting moves from a Supabase Edge Function to this route,
// and the source file now comes from S3 instead of Supabase Storage.
//
// Gated to Legal/Business, matching the UI (the sign bar in app-logic.js is
// only shown for role === 'legal' || role === 'business').

import { Router } from 'express';
import { query } from '../db.js';
import { getDraftSignedUrl } from '../s3.js';

const router = Router();

const ADOBE_CLIENT_ID     = process.env.ADOBE_CLIENT_ID;
const ADOBE_CLIENT_SECRET = process.env.ADOBE_CLIENT_SECRET;

async function getAdobeToken() {
  const res = await fetch('https://api.adobe.io/ims/exchange/jwt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     ADOBE_CLIENT_ID,
      client_secret: ADOBE_CLIENT_SECRET,
      grant_type:    'client_credentials',
      scope:         'openid,AdobeID,sign_widget',
    }),
  });
  const data = await res.json();
  return data.access_token;
}

router.post('/sign-document', async (req, res) => {
  if (req.profile.role !== 'legal' && req.profile.role !== 'business') {
    return res.status(403).json({ error: 'Only Legal or Business can send documents for signature' });
  }

  const { agreementId, signerEmail, signerName, role, filePath } = req.body;

  try {
    const signedUrl = await getDraftSignedUrl(filePath);
    const token = await getAdobeToken();

    const adobeRes = await fetch('https://api.na4.adobesign.com/api/rest/v6/agreements', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileInfos: [{ url: signedUrl }],
        name: `GyfTR Legal Agreement — ${agreementId}`,
        participantSetsInfo: [{
          memberInfos: [{ email: signerEmail, name: signerName }],
          order: 1,
          role: 'SIGNER',
        }],
        signatureType: 'ESIGN',
        state: 'IN_PROCESS',
      }),
    });

    const adobeData = await adobeRes.json();
    if (!adobeData.id) throw new Error('Adobe Sign did not return an agreement ID: ' + JSON.stringify(adobeData));

    await query(
      `insert into signatures (agreement_id, signer_name, signer_role, signer_email, adobe_envelope_id, status)
       values ($1,$2,$3,$4,$5,'pending')`,
      [agreementId, signerName, role, signerEmail, adobeData.id]
    );

    res.json({ success: true, envelope_id: adobeData.id });
  } catch (err) {
    console.error('[POST /sign-document]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
