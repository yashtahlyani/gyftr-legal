// AI-powered agreement analysis — OpenAI GPT-4o mini

const STORAGE_KEY = 'gyftr_openai_key'

export function getStoredKey() {
  const savedKey = (localStorage.getItem(STORAGE_KEY) || '').trim()
  if (savedKey) return savedKey
  return import.meta.env.VITE_OPENAI_API_KEY || ''
}
export function saveKey(k) { localStorage.setItem(STORAGE_KEY, (k || '').trim()) }

function buildBrief(a) {
  const clauses = (a.clauses || []).filter(c => c.changes && c.changes.some(ch => ch && ch !== 'NA' && ch.trim()))
  const drafts  = a.drafts || []
  const draftLines = drafts.map(d =>
    `  ${d.n} (${d.date}, ${d.dir === 'sent' ? 'GyfTR→Client' : 'Client→GyfTR'}): ${d.note}`
  ).join('\n')
  const clauseLines = clauses.map(c => {
    const changes = drafts.map((d, i) => {
      const txt = (c.changes[i] || '').trim()
      return txt && txt !== 'NA' ? `    ${d.n}: ${txt}` : null
    }).filter(Boolean).join('\n')
    return `  Cl.${c.no} — ${c.name} [outcome: ${c.outcome || 'pending'}]\n${changes}`
  }).join('\n\n')
  return `AGREEMENT: ${a.type} | CLIENT: ${a.client} | DRAFTS: ${drafts.length}\n\nDRAFT HISTORY:\n${draftLines || '  none'}\n\nCLAUSE NEGOTIATIONS:\n${clauseLines || '  none'}`
}

const SYSTEM_PROMPT = `You are a senior legal risk analyst for GyfTR, a B2B fintech rewards platform.
Analyse each clause in detail — what the client pushed for, what GyfTR ended up with, the real risk, and a concrete recommendation.
Be specific to the actual clause positions. Do not give generic advice.
Respond ONLY with valid JSON — no markdown fences, no text outside JSON.`

function buildUserPrompt(a, docText) {
  const docSection = docText ? `\nLATEST DRAFT TEXT:\n${docText.slice(0, 2000)}\n` : ''
  return `Analyse this agreement negotiation clause by clause in detail.\n\n${buildBrief(a)}\n${docSection}
Return this exact JSON:
{
  "riskScore": <0-100>,
  "riskLevel": "<low|medium|high>",
  "dealHealth": "<good|caution|critical>",
  "summary": "<2-3 sentences on overall deal status and key risk areas>",
  "clauses": [
    {
      "no": "<clause number>",
      "name": "<clause name>",
      "clientPush": "<what the client pushed for and why — 2 sentences>",
      "gyftrGot": "<what GyfTR ended up with — 2 sentences>",
      "outcome": "<accepted|partial|held|pending>",
      "risk": "<low|medium|high>",
      "observation": "<detailed risk analysis — 2-3 sentences: what this means for GyfTR, what could go wrong or why it is a win>",
      "recommendation": "<specific concrete action GyfTR legal team should take — 1-2 sentences>"
    }
  ]
}`
}

export async function analyzeWithAI(agreement, apiKey, docText) {
  const key = apiKey || getStoredKey()
  if (!key) throw new Error('no_key')

  const res = await fetch('/api/ai-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agreement, apiKey: key, docText })
  })

  const data = await res.json().catch(() => ({}))
  if (res.status === 401 || data.error === 'invalid_key') throw new Error('invalid_key')
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`)

  return data.result
}

// ── Config ───────────────────────────────────────────────────────────────────
const RISK = {
  low:    { color:'#15803D', bg:'#F0FDF4', border:'#86EFAC', label:'Low'    },
  medium: { color:'#B45309', bg:'#FFFBEB', border:'#FCD34D', label:'Medium' },
  high:   { color:'#B91C1C', bg:'#FEF2F2', border:'#FECACA', label:'High'   }
}
const HEALTH = {
  good:     { color:'#15803D', bg:'#F0FDF4', border:'#86EFAC', label:'Good'     },
  caution:  { color:'#B45309', bg:'#FFFBEB', border:'#FCD34D', label:'Caution'  },
  critical: { color:'#B91C1C', bg:'#FEF2F2', border:'#FECACA', label:'Critical' }
}
const OUTCOME = {
  accepted: { color:'#15803D', bg:'#F0FDF4', label:'Accepted' },
  held:     { color:'#1D4ED8', bg:'#EFF6FF', label:'Held Firm' },
  partial:  { color:'#B45309', bg:'#FFFBEB', label:'Partial'  },
  pending:  { color:'#6B21A8', bg:'#F5F3FF', label:'Pending'  }
}

export function renderAIResult(result, container) {
  const clauses = result.clauses || []
  const score   = Math.min(100, Math.max(0, result.riskScore || 0))
  const rl      = RISK[result.riskLevel]   || RISK.medium
  const hl      = HEALTH[result.dealHealth] || HEALTH.caution

  // ── Summary header bar ───────────────────────────────────────────────────
  const summaryBar = `
    <div class="an-summary" style="gap:14px;flex-wrap:wrap;padding:14px 20px">
      <div style="display:flex;align-items:center;gap:12px">
        <!-- Score ring -->
        <div style="position:relative;width:58px;height:58px;flex-shrink:0">
          <svg width="58" height="58" viewBox="0 0 58 58">
            <circle cx="29" cy="29" r="24" fill="none" stroke="#e5e7eb" stroke-width="5"/>
            <circle cx="29" cy="29" r="24" fill="none" stroke="${rl.color}" stroke-width="5"
              stroke-dasharray="${Math.round(2*Math.PI*24*score/100)} ${Math.round(2*Math.PI*24)}"
              stroke-dashoffset="${Math.round(2*Math.PI*24*0.25)}" stroke-linecap="round"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0">
            <span style="font-size:15px;font-weight:800;color:${rl.color};line-height:1;font-family:var(--font-d)">${score}</span>
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:800;color:var(--ink)">AI Risk Analysis</span>
            <span style="font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:8px;background:${rl.bg};color:${rl.color};border:1px solid ${rl.border}">${rl.label} Risk</span>
            <span style="font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:8px;background:${hl.bg};color:${hl.color};border:1px solid ${hl.border}">Deal Health: ${hl.label}</span>
            <span style="font-size:10px;color:#94a59b;margin-left:4px">GPT-4o mini · ${new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
          </div>
          <div style="font-size:12.5px;color:var(--ink-soft);line-height:1.55;max-width:700px">${result.summary || ''}</div>
        </div>
      </div>
    </div>`

  // ── Per-clause rows ───────────────────────────────────────────────────────
  const rows = clauses.map(c => {
    const rk  = RISK[c.risk]       || RISK.medium
    const oc  = OUTCOME[c.outcome] || OUTCOME.pending
    const rowBorderColor = rk.color + '40'

    return `<tr style="border-left:3px solid ${rk.color}30">
      <!-- Clause name col -->
      <td class="an-td" style="background:#FAFCFA;position:sticky;left:0;z-index:1;min-width:155px;border-right:2px solid var(--line);vertical-align:top;padding:14px 14px">
        <span class="an-clause-no">Cl. ${c.no}</span>
        <div style="font-size:12.5px;font-weight:700;color:var(--ink);margin-top:4px;line-height:1.3">${c.name}</div>
        <span style="display:inline-block;margin-top:6px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:${oc.bg};color:${oc.color}">${oc.label}</span>
      </td>

      <!-- Client pushed for -->
      <td class="an-td" style="vertical-align:top;min-width:200px;padding:14px 16px;background:#FEFEFE">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 3l5 5-5 5M3 8h10" stroke="#94a59b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span style="font-size:9.5px;font-weight:700;color:#94a59b;text-transform:uppercase;letter-spacing:.06em">Client Push</span>
        </div>
        <div style="font-size:12px;color:#374151;line-height:1.6">${c.clientPush || '—'}</div>
      </td>

      <!-- GyfTR got -->
      <td class="an-td" style="vertical-align:top;min-width:200px;padding:14px 16px;background:#F9FCF9">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--pop-deep)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span style="font-size:9.5px;font-weight:700;color:var(--pop-deep);text-transform:uppercase;letter-spacing:.06em">GyfTR Got</span>
        </div>
        <div style="font-size:12px;color:#374151;line-height:1.6">${c.gyftrGot || '—'}</div>
      </td>

      <!-- Risk badge -->
      <td class="an-td" style="vertical-align:top;min-width:80px;text-align:center;padding:14px 10px">
        <span style="display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:${rk.bg};color:${rk.color};border:1.5px solid ${rk.border};padding:4px 12px;border-radius:10px;white-space:nowrap">${rk.label}</span>
        <div style="margin-top:8px;width:100%;height:3px;background:#f0f0f0;border-radius:3px;overflow:hidden">
          <div style="height:100%;background:${rk.color};border-radius:3px;width:${c.risk==='high'?'100':c.risk==='medium'?'55':'25'}%"></div>
        </div>
      </td>

      <!-- AI Observation -->
      <td class="an-td" style="vertical-align:top;min-width:220px;padding:0">
        <div style="height:100%;background:${rk.bg}80;border-left:3px solid ${rk.border};padding:14px 14px">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="${rk.color}" stroke-width="1.5"/><path d="M8 5v3M8 10v.5" stroke="${rk.color}" stroke-width="1.4" stroke-linecap="round"/></svg>
            <span style="font-size:9.5px;font-weight:700;color:${rk.color};text-transform:uppercase;letter-spacing:.06em">Observation</span>
          </div>
          <div style="font-size:12px;color:#374151;line-height:1.6">${c.observation || '—'}</div>
        </div>
      </td>

      <!-- Recommendation -->
      <td class="an-td" style="vertical-align:top;min-width:220px;padding:0">
        <div style="height:100%;background:#F5F3FF;border-left:3px solid #C4B5FD;padding:14px 14px">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5z" stroke="#7C3AED" stroke-width="1.3" stroke-linejoin="round"/></svg>
            <span style="font-size:9.5px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.06em">Recommendation</span>
          </div>
          <div style="font-size:12px;color:#3B1A6B;line-height:1.6;font-weight:500">${c.recommendation || '—'}</div>
        </div>
      </td>
    </tr>`
  }).join('')

  container.innerHTML = summaryBar + `
    <div class="an-matrix-wrap" style="padding:0 0 32px">
      <table class="an-table" style="border-collapse:separate;border-spacing:0">
        <thead><tr>
          <th class="an-th" style="position:sticky;left:0;z-index:4;min-width:155px;background:#EEF4EF;border-right:2px solid var(--line)">Clause</th>
          <th class="an-th" style="min-width:200px;background:#FAFAFA">
            <div style="display:flex;align-items:center;gap:5px">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 3l5 5-5 5M3 8h10" stroke="#94a59b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Client Pushed For
            </div>
          </th>
          <th class="an-th" style="min-width:200px;background:#F4FAF4">
            <div style="display:flex;align-items:center;gap:5px">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="var(--pop-deep)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              GyfTR Got
            </div>
          </th>
          <th class="an-th" style="min-width:80px;text-align:center">Risk</th>
          <th class="an-th" style="min-width:220px;background:#FFF8F0">
            <div style="display:flex;align-items:center;gap:5px">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#B45309" stroke-width="1.5"/></svg>
              AI Observation
            </div>
          </th>
          <th class="an-th" style="min-width:220px;background:#F5F3FF">
            <div style="display:flex;align-items:center;gap:5px">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5z" stroke="#7C3AED" stroke-width="1.3" stroke-linejoin="round"/></svg>
              Recommendation
            </div>
          </th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

window.gAIGetKey  = getStoredKey
window.gAISaveKey = saveKey
window.gAIAnalyze = analyzeWithAI
window.gAIRender  = renderAIResult
