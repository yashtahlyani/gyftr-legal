// src/lib/api.js — replaces src/lib/supabase.js.
// All data access now goes through the Express backend (EC2 behind an ALB).
// Auth token is set by src/lib/auth-cognito.js after a Cognito login.

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7978'

// A Cognito ID token expires after an hour. Holding one captured at login
// meant that after 60 minutes every request went out with a dead token, the
// API answered 401, and the portal looked broken until the page was reloaded.
// Hold a provider that returns a currently-valid token instead — Cognito
// refreshes it transparently.
let _token = null
let _tokenProvider = null

export const setAuthToken = (t) => { _token = t }
export const getAuthToken = () => _token
export const setAuthTokenProvider = (fn) => { _tokenProvider = fn }

let _onSessionExpired = null
export const setOnSessionExpired = (fn) => { _onSessionExpired = fn }

async function currentToken() {
  if (_tokenProvider) {
    try {
      const fresh = await _tokenProvider()
      if (fresh) { _token = fresh; return fresh }
      if (_onSessionExpired) _onSessionExpired()
      return null
    } catch {
      return _token
    }
  }
  return _token
}

// If the API host accepts the connection but never answers — a security group
// dropping traffic, an ALB with no healthy target — fetch waits forever. That
// showed up as a login button stuck on "Signing in…" with no error anywhere.
// Fail loudly instead, so the real problem is visible.
const REQUEST_TIMEOUT_MS = 15000

async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const headers = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) }
  const token = await currentToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`The server did not respond within ${REQUEST_TIMEOUT_MS / 1000}s (${API_URL}). It may be down or unreachable.`, { cause: err })
    }
    // A network-level failure here is usually a blocked CORS preflight or a
    // wrong VITE_API_URL, neither of which fetch reports in any detail.
    throw new Error(`Could not reach the server at ${API_URL}. Check the API is running and its CORS origin matches this site.`, { cause: err })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API error ${res.status}`)
  }
  return res.json()
}

// ── Profile ─────────────────────────────────────────────────────────────
export function getMyProfile() {
  return apiFetch('/api/profile/me')
}

// The real directory — email/name/role/team_code/avatar for every profile.
// Not yet wired into any dropdown/avatar list in the UI (those are still
// the hardcoded ROLES map) — available for that migration when it's wanted.
export function getUsers() {
  return apiFetch('/api/users')
}

// ── Agreements ──────────────────────────────────────────────────────────
export async function loadAllAgreements() {
  const rows = await apiFetch('/api/agreements')
  return rows.map(mapToPortalFormat)
}

export function createAgreement(form) {
  return apiFetch('/api/agreements', {
    method: 'POST',
    body: JSON.stringify({
      client:         form.client,
      tag:            form.tag,
      type:           form.type,
      promiseDate:    form.pd || null,
      spocLegal:      form.spocL === '—' ? null : form.spocL,
      spocFinance:    form.spocF === '—' ? null : form.spocF,
      spocBusiness:   form.spocB === '—' ? null : form.spocB,
      spocCompliance: form.spocC === '—' ? null : form.spocC,
      docLink:        form.doc || null,
    }),
  })
}

// fromStatusLabel/toStatusLabel are the human-readable labels shown in the
// History modal (history_log.from_status/to_status) — kept separate from
// `status`, the raw status key stored on the agreement itself.
export function updateAgreementStatus(id, status, fromStatusLabel, toStatusLabel) {
  return apiFetch(`/api/agreements/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, fromStatusLabel, toStatusLabel }),
  })
}

export function updateClientStatus(id, clientStatus) {
  return apiFetch(`/api/agreements/${id}/client-status`, {
    method: 'PATCH',
    body: JSON.stringify({ clientStatus }),
  })
}

export function updateClientDates(id, clientDates) {
  return apiFetch(`/api/agreements/${id}/client-dates`, {
    method: 'PATCH',
    body: JSON.stringify({ clientDates }),
  })
}

// ── Team status ─────────────────────────────────────────────────────────
// remarkText is required by the backend when status === 'Rejected' ("Reject
// with Remarks", Stage 2 only) — inserted atomically with the status change.
export function updateTeamStatus(agreementId, teamCode, status, fromStatus, teamName, remarkText) {
  return apiFetch(`/api/agreements/${agreementId}/team-status`, {
    method: 'PATCH',
    body: JSON.stringify({ teamCode, status, fromStatus, teamName, remarkText }),
  })
}

// ── Stage engine ──────────────────────────────────────────────────────────
// Advances review_pending -> final_approval_pending (needs docLink) ->
// signing_required -> signing_done. Only the original uploader may call
// this — the backend checks agreements.created_by, not just role.
export function advanceStage(agreementId, docLink) {
  return apiFetch(`/api/agreements/${agreementId}/stage/advance`, {
    method: 'PATCH',
    body: JSON.stringify({ docLink }),
  })
}

// Stage-2-only same-stage document correction — does not change stage,
// resets all 4 My statuses to Pending. Both docLink and reason are required.
export function reviseStage2Doc(agreementId, docLink, reason) {
  return apiFetch(`/api/agreements/${agreementId}/stage/revise-doc`, {
    method: 'POST',
    body: JSON.stringify({ docLink, reason }),
  })
}

// ── Remarks ─────────────────────────────────────────────────────────────
export function addRemark(agreementId, text) {
  return apiFetch(`/api/agreements/${agreementId}/remarks`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

// ── Clauses ─────────────────────────────────────────────────────────────
export function updateClauseOutcome(clauseId, outcome) {
  return apiFetch(`/api/clauses/${clauseId}/outcome`, {
    method: 'PATCH',
    body: JSON.stringify({ outcome }),
  })
}

// ── Drafts (backend surface exists for RLS parity; not yet wired into the
// UI, same as before the migration — see infra/HANDOVER.md "common changes"
// if you want to switch the Drafts modal from local-only to persisted) ────
export function uploadDraft(agreementId, file, draftNo, direction, note) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('draftNo', draftNo)
  formData.append('direction', direction)
  formData.append('note', note || '')
  return apiFetch(`/api/agreements/${agreementId}/drafts`, { method: 'POST', body: formData })
}

// No-file variant, used by the Drafts modal today (it only collects
// date/direction/note — see backend/routes/drafts.js for why this is a
// separate route rather than reusing uploadDraft).
export function addDraftNote(agreementId, draftNo, direction, note, date) {
  return apiFetch(`/api/agreements/${agreementId}/drafts/note`, {
    method: 'POST',
    body: JSON.stringify({ draftNo, direction, note, date }),
  })
}

export function getDraftViewURL(draftId) {
  return apiFetch(`/api/drafts/${draftId}/url`).then(r => r.url)
}

export function updateDraftDirection(draftId, direction) {
  return apiFetch(`/api/drafts/${draftId}/direction`, {
    method: 'PATCH',
    body: JSON.stringify({ direction }),
  })
}

// ── Reminders (also not yet wired into the UI — see note above) ─────────
export function sendReminder(agreementId, fromRole, toTeams, clientName) {
  return apiFetch('/api/reminders', {
    method: 'POST',
    body: JSON.stringify({ agreementId, fromRole, toTeams, clientName }),
  })
}

// Always the caller's own team — the backend derives it from the verified
// profile, not a query param (see backend/routes/reminders.js).
export function getMyReminders() {
  return apiFetch('/api/reminders')
}

export function dismissReminder(reminderId, teamCode) {
  return apiFetch(`/api/reminders/${reminderId}/dismiss`, {
    method: 'PATCH',
    body: JSON.stringify({ teamCode }),
  })
}

// ── AI clause analysis ───────────────────────────────────────────────────
export function analyzeWithAI(agreement, docText) {
  // No apiKey argument by design — the OpenAI key is server-side only.
  return apiFetch('/api/ai-analyze', {
    method: 'POST',
    body: JSON.stringify({ agreement, docText }),
  })
}

// ── Adobe Sign ────────────────────────────────────────────────────────────
export function signDocument(agreementId, signerEmail, signerName, role, filePath) {
  return apiFetch('/api/sign-document', {
    method: 'POST',
    body: JSON.stringify({ agreementId, signerEmail, signerName, role, filePath }),
  })
}

// ── Row → portal-format mapper (moved from the old src/data/agreements.js;
// column names are unchanged from the Supabase schema, so this logic is
// identical to before — only the source of the rows changed) ─────────────
function mapToPortalFormat(a) {
  const tm = {}, ms = {}, teamAging = {}
  const stateMap = {
    'Pending':      'tc-none',
    'Under Review': 'tc-yellow',
    'Approved':     'tc-green',
    'Rejected':     'tc-red',
  }
  ;(a.team_statuses || []).forEach(ts => {
    tm[ts.team_code]        = stateMap[ts.status] || 'tc-none'
    ms[ts.team_code]        = ts.status
    teamAging[ts.team_code] = ts.aging_days > 0 ? `+${ts.aging_days}d` : null
  })

  const drafts = (a.drafts || []).map(d => ({
    n: d.draft_no, date: d.date, dir: d.direction, note: d.note || '',
    filePath: d.file_path, docLink: d.doc_link || '', _id: d.id,
  }))

  const clauses = (a.clauses || []).map(c => ({
    no: c.clause_no, name: c.clause_name, outcome: c.outcome, full: c.full_context, _id: c.id,
    changes: (c.clause_changes || [])
      .sort((x, y) => x.draft_no.localeCompare(y.draft_no))
      .map(cc => cc.change_text),
  }))

  return {
    id: a.id, _sbId: a.id,
    client: a.client,
    tag: a.tag || a.client.slice(0, 4).toUpperCase(),
    ct: colorFromType(a.type),
    sD: a.start_date, type: a.type, st: a.status, clientStatus: a.client_status,
    stage: a.stage || 'review_pending', stage2DocLink: a.stage2_doc_link || '',
    createdBy: a.created_by || null,
    pd: a.promise_date || '',
    tm, ms, teamAging,
    lu: (a.updated_at || a.created_at || '').split('T')[0],
    ag: 'On time', ac: 'ag-ok',
    doc: a.doc_link || '',
    sp: {
      L: a.spoc_legal || '—', F: a.spoc_finance || '—',
      C: a.spoc_compliance || '—', B: a.spoc_business || '—',
    },
    remarks: (a.remarks || []).map(r => ({
      author: r.author_name, role: r.author_role,
      ts: (r.created_at || '').replace('T', ' ').slice(0, 16), txt: r.text,
    })),
    hist: (a.history_log || []).map(h => ({
      d: (h.created_at || '').replace('T', ' ').slice(0, 16),
      t: h.team, b: h.changed_by, f: h.from_status, to: h.to_status,
    })),
    drafts, clauses,
    clientDates: a.client_dates || {},
  }
}

function colorFromType(type) {
  if (!type) return 'ct-q'
  if (type.includes('API'))         return 'ct-b'
  if (type.includes('White Label')) return 'ct-t'
  if (type.includes('Reseller'))    return 'ct-p'
  if (type.includes('Enterprise'))  return 'ct-a'
  return 'ct-q'
}
