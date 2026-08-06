import { db } from '../lib/supabase.js'

// ── In production, replace with real Supabase calls ──────────────────────────
// For now these wrap the sample data but are structured identically
// to what the real DB calls will look like.

export async function loadAllAgreements() {
  const { data, error } = await db
    .from('agreements')
    .select('*, drafts(*), team_statuses(*), remarks(*), history_log(*), clauses(*, clause_changes(*))')
    .order('created_at', { ascending: false })
    .order('date',       { referencedTable: 'drafts',      ascending: true })
    .order('created_at', { referencedTable: 'remarks',     ascending: true })
    .order('created_at', { referencedTable: 'history_log', ascending: true })
  if (error) throw error
  return data.map(mapToPortalFormat)
}

export async function createAgreement(form) {
  const { data, error } = await db
    .from('agreements')
    .insert({
      client:         form.client,
      tag:            form.client.slice(0,4).toUpperCase(),
      type:           form.type,
      status:         'pending',
      client_status:  'awaiting',
      promise_date:   form.pd || null,
      spoc_legal:     form.spocL || null,
      spoc_finance:   form.spocF || null,
      spoc_business:  form.spocB || null,
      spoc_compliance:form.spocC || null,
      doc_link:       form.doc  || null,
      start_date:     new Date().toISOString().split('T')[0]
    })
    .select()
    .single()
  if (error) throw error

  // insert default team status rows
  await db.from('team_statuses').insert([
    { agreement_id: data.id, team_code: 'L', status: 'Pending' },
    { agreement_id: data.id, team_code: 'F', status: 'Pending' },
    { agreement_id: data.id, team_code: 'C', status: 'Pending' },
    { agreement_id: data.id, team_code: 'B', status: 'Pending' },
  ])

  return data
}

export async function updateAgreementStatus(id, status) {
  const { error } = await db
    .from('agreements')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateClientStatus(id, clientStatus) {
  const { error } = await db
    .from('agreements')
    .update({ client_status: clientStatus })
    .eq('id', id)
  if (error) throw error
}

// ── Data mapper: Supabase row → portal JS format ─────────────────────────────
function mapToPortalFormat(a) {
  const tm = {}, ms = {}, teamAging = {}
  const stateMap = {
    'Pending':      'tc-none',
    'Under Review': 'tc-yellow',
    'Approved':     'tc-green',
    'Rejected':     'tc-red'
  }
  ;(a.team_statuses || []).forEach(ts => {
    tm[ts.team_code]       = stateMap[ts.status] || 'tc-none'
    ms[ts.team_code]       = ts.status
    teamAging[ts.team_code] = ts.aging_days > 0 ? `+${ts.aging_days}d` : null
  })

  const drafts = (a.drafts || []).map(d => ({
    n:    d.draft_no,
    date: d.date,
    dir:  d.direction,
    note: d.note || '',
    filePath: d.file_path
  }))

  const clauses = (a.clauses || []).map(c => ({
    no:      c.clause_no,
    name:    c.clause_name,
    outcome: c.outcome,
    full:    c.full_context,
    changes: (c.clause_changes || [])
      .sort((x, y) => x.draft_no.localeCompare(y.draft_no))
      .map(cc => cc.change_text)
  }))

  return {
    id:           a.id,
    _sbId:        a.id,
    client:       a.client,
    tag:          a.tag || a.client.slice(0,4).toUpperCase(),
    ct:           colorFromType(a.type),
    sD:           a.start_date,
    type:         a.type,
    st:           a.status,
    clientStatus: a.client_status,
    pd:           a.promise_date || '',
    tm, ms, teamAging,
    lu:           (a.updated_at || a.created_at || '').split('T')[0],
    ag:           'On time',
    ac:           'ag-ok',
    doc:          a.doc_link || '',
    sp: {
      L: a.spoc_legal      || '—',
      F: a.spoc_finance     || '—',
      C: a.spoc_compliance  || '—',
      B: a.spoc_business    || '—'
    },
    remarks: (a.remarks || []).map(r => ({
      author: r.author_name,
      role:   r.author_role,
      ts:     (r.created_at || '').replace('T',' ').slice(0,16),
      txt:    r.text
    })),
    hist: (a.history_log || []).map(h => ({
      d:  (h.created_at || '').replace('T',' ').slice(0,16),
      t:  h.team,
      b:  h.changed_by,
      f:  h.from_status,
      to: h.to_status
    })),
    drafts,
    clauses,
    clientDates: a.client_dates || {}
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
