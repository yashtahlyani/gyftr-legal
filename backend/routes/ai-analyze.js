// routes/ai-analyze.js — ports api/ai-analyze.js (the Vercel Function).
// OpenAI itself is a third-party service unrelated to Supabase/Vercel, so it
// stays as-is per the migration scope — only the hosting moves, from a
// Vercel Function to this Express route.
//
// NOTE: supabase/functions/ai-analyze (a Deno duplicate of this same OpenAI
// call) and supabase/functions/analyse-drafts (a separate Claude-based
// clause-diff function) both existed in the old stack but were never called
// by any UI code path (confirmed in docs/KT.md §6.5 item 6) — neither is
// ported here. If the Claude-based path is wanted later, its prompt is
// preserved in supabase/functions/analyse-drafts/index.ts for reference.

import { Router } from 'express';

const router = Router();

router.post('/ai-analyze', async (req, res) => {
  try {
    const { agreement, apiKey, docText } = req.body || {};
    const key = (apiKey || process.env.OPENAI_API_KEY || '').trim();

    if (!key) {
      return res.status(400).json({ error: 'no_key' });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.25,
        max_tokens: 1800,
        messages: [
          {
            role: 'system',
            content: 'You are a senior legal risk analyst for GyfTR, a B2B fintech rewards platform. Analyse each clause in detail — what the client pushed for, what GyfTR ended up with, the real risk, and a concrete recommendation. Be specific to the actual clause positions. Do not give generic advice. Respond ONLY with valid JSON — no markdown fences, no text outside JSON.',
          },
          { role: 'user', content: buildPrompt(agreement, docText || '') },
        ],
      }),
    });

    if (openaiRes.status === 401) {
      return res.status(401).json({ error: 'invalid_key' });
    }

    const payload = await openaiRes.json().catch(() => ({}));
    if (!openaiRes.ok) {
      return res.status(openaiRes.status).json({ error: payload.error?.message || `API error ${openaiRes.status}` });
    }

    const content = payload.choices?.[0]?.message?.content || '';
    const cleaned = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    try {
      res.json({ result: JSON.parse(cleaned) });
    } catch {
      res.status(500).json({ error: 'AI returned invalid JSON — try again.' });
    }
  } catch (err) {
    console.error('[POST /ai-analyze]', err.message);
    res.status(500).json({ error: err.message });
  }
});

function buildPrompt(agreement, docText) {
  const clauses = (agreement?.clauses || []).filter((c) => c.changes && c.changes.some((ch) => ch && ch !== 'NA' && ch.trim()));
  const drafts = agreement?.drafts || [];
  const draftLines = drafts.map((d) => `  ${d.n} (${d.date}, ${d.dir === 'sent' ? 'GyfTR→Client' : 'Client→GyfTR'}): ${d.note}`).join('\n');
  const clauseLines = clauses.map((c) => {
    const changes = drafts.map((d, i) => {
      const txt = (c.changes[i] || '').trim();
      return txt && txt !== 'NA' ? `    ${d.n}: ${txt}` : null;
    }).filter(Boolean).join('\n');
    return `  Cl.${c.no} — ${c.name} [outcome: ${c.outcome || 'pending'}]\n${changes}`;
  }).join('\n\n');

  const docSection = docText ? `\nLATEST DRAFT TEXT:\n${docText.slice(0, 2000)}\n` : '';

  return `Analyse this agreement negotiation clause by clause in detail.\n\nAGREEMENT: ${agreement?.type || ''} | CLIENT: ${agreement?.client || ''} | DRAFTS: ${drafts.length}\n\nDRAFT HISTORY:\n${draftLines || '  none'}\n\nCLAUSE NEGOTIATIONS:\n${clauseLines || '  none'}\n${docSection}Return this exact JSON:\n{\n  "riskScore": <0-100>,\n  "riskLevel": "<low|medium|high>",\n  "dealHealth": "<good|caution|critical>",\n  "summary": "<2-3 sentences on overall deal status and key risk areas>",\n  "clauses": [\n    {\n      "no": "<clause number>",\n      "name": "<clause name>",\n      "clientPush": "<what the client pushed for and why — 2 sentences>",\n      "gyftrGot": "<what GyfTR ended up with — 2 sentences>",\n      "outcome": "<accepted|partial|held|pending>",\n      "risk": "<low|medium|high>",\n      "observation": "<detailed risk analysis — 2-3 sentences: what this means for GyfTR, what could go wrong or why it is a win>",\n      "recommendation": "<specific concrete action GyfTR legal team should take — 1-2 sentences>"\n    }\n  ]\n}`;
}

export default router;
