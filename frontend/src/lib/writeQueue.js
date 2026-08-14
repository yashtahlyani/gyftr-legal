// src/lib/writeQueue.js — retry queue for writes the user would be upset to
// lose (team status, agreement status, remarks, client status, clause
// outcomes, signatures). Mirrors the EFFORT_QUEUE / flushEffortQueue
// pattern in gyftr-portal's src/hooks/useTaskStore.js.
//
// Writes are NOT queued proactively — api.js already awaits and throws on
// any failed request. This module is only used from the `catch` block of a
// write, i.e. only failed writes ever get queued, and each is removed once
// it successfully replays (never on a timer, never optimistically).
//
// Function objects aren't serializable, so queued entries store a `type` +
// plain-data `args` array; REPLAYERS maps `type` back to the real api.js call.

import * as api from './api.js'

const QUEUE_KEY = 'gyftr_write_queue'
const MAX_QUEUE = 200

const REPLAYERS = {
  teamStatus:      (args) => api.updateTeamStatus(...args),
  agreementStatus: (args) => api.updateAgreementStatus(...args),
  clientStatus:    (args) => api.updateClientStatus(...args),
  remark:          (args) => api.addRemark(...args),
  clauseOutcome:   (args) => api.updateClauseOutcome(...args),
  signDocument:    (args) => api.signDocument(...args),
  draftNote:       (args) => api.addDraftNote(...args),
  reminder:        (args) => api.sendReminder(...args),
}

function readQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') }
  catch { return [] }
}

function persistQueue(arr) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(arr.slice(-MAX_QUEUE))) }
  catch { /* storage full or blocked — nothing useful to do */ }
}

// enqueueWrite(type, args, label) — call from the catch block of a failed
// write. `label` is shown to the user later (e.g. in a "N changes pending"
// indicator) — kept short and human-readable.
export function enqueueWrite(type, args, label) {
  if (!REPLAYERS[type]) throw new Error(`writeQueue: unknown type "${type}"`)
  const q = readQueue()
  q.push({ type, args, label, queuedAt: Date.now() })
  persistQueue(q)
}

export function getQueuedCount() {
  return readQueue().length
}

export function getQueuedLabels() {
  return readQueue().map(item => item.label)
}

// flushWriteQueue() — replays every queued write in order. Entries that
// still fail stay queued (in their original order) for the next flush;
// entries that succeed are removed. Called on every successful data load
// (see _loadFromApi in app-logic.js), same trigger point as the sibling's
// flushEffortQueue-before-fetchTasks pattern.
export async function flushWriteQueue() {
  const queued = readQueue()
  if (!queued.length) return { flushed: 0, remaining: 0 }

  const stillFailing = []
  let flushed = 0
  for (const item of queued) {
    const replay = REPLAYERS[item.type]
    try {
      await replay(item.args)
      flushed++
    } catch {
      stillFailing.push(item)
    }
  }
  persistQueue(stillFailing)
  return { flushed, remaining: stillFailing.length }
}
