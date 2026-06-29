// Date formatter: "2026-05-12" → "12 May"
export const fd = d => {
  if (!d) return '—'
  const [y, m, dy] = d.split('-')
  return `${parseInt(dy)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]}`
}

// Now string: "2026-06-15 14:22"
export const ns = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')} ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`
}

// Today date string: "2026-06-15"
export const td = () => new Date().toISOString().split('T')[0]

// Parse "2026-06-05 14:22" → Date
export function parseTs(s) {
  const [d, t] = s.split(' ')
  const [y, mo, dy] = d.split('-')
  const [h, mi] = (t || '00:00').split(':')
  return new Date(+y, +mo-1, +dy, +h, +mi)
}

// Duration between two timestamps → "2d 3h"
export function diffLabel(t1, t2) {
  const ms = Math.abs(parseTs(t2) - parseTs(t1))
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60), rm = mins % 60
  if (hrs < 24) return rm > 0 ? `${hrs}h ${rm}m` : `${hrs}h`
  const days = Math.floor(hrs / 24), rh = hrs % 24
  return rh > 0 ? `${days}d ${rh}h` : `${days}d`
}

// Toast
export function showToast(msg, type = '') {
  const t = document.getElementById('toast')
  if (!t) return
  t.textContent = msg
  t.className = 'toast show' + (type ? ' ' + type : '')
  setTimeout(() => t.classList.remove('show'), 2400)
}

// Promise date helpers
export function promiseDaysLeft(pd) {
  if (!pd) return null
  return Math.floor((new Date(pd) - new Date()) / 86400000)
}

export function renderPromiseBadge(pd) {
  if (!pd) return '<span style="color:#c4cfc7;font-size:11px">—</span>'
  const d = promiseDaysLeft(pd)
  if (d < 0)  return `<span class="pd-over">Overdue ${Math.abs(d)}d</span>`
  if (d <= 3) return `<span class="pd-warn">Due in ${d}d</span>`
  return `<span class="pd-ok">Due ${fd(pd)}</span>`
}

// Word-level diff highlight
export function wordDiff(oldTxt, newTxt) {
  if (!oldTxt) return `<span class="an-new-line">${newTxt}</span>`
  const oldWords = new Set(oldTxt.split(/[\s,]+/))
  return newTxt.split(/(\s+)/).map(tok =>
    /^\s+$/.test(tok) ? tok : (oldWords.has(tok) ? tok : `<span class="an-new-line">${tok}</span>`)
  ).join('')
}
