// Google Picker + Drive + Docs API integration — GyfTR Legal Portal

const GOOGLE_API_KEYS = {
  docs:   'YOUR_GOOGLE_DOCS_API_KEY',
  drive:  'YOUR_GOOGLE_DRIVE_API_KEY',
  picker: 'YOUR_GOOGLE_PICKER_API_KEY'
}
const GOOGLE_OAUTH_CLIENT_ID = '577644767198-52bej9n54ahh29fi1fgcvd0m6b67inhe.apps.googleusercontent.com'
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents'

let gisTokenClient     = null
let currentAccessToken = null
let pickerApiLoaded    = false
let _currentAgreement  = null
let currentDoc         = { id: null, name: null, mimeType: null }
let pendingAfterAuth   = null
let _autosaveTimer     = null
let _docComments       = []
let _selectionListenerAdded = false

// ── Bootstrap: wait for gapi ──────────────────────────────────────────────────
;(function waitForGapi() {
  if (window.gapi) {
    gapi.load('picker', () => { pickerApiLoaded = true })
  } else {
    setTimeout(waitForGapi, 200)
  }
})()

// ── Bootstrap: wait for Google Identity Services ──────────────────────────────
;(function waitForGIS() {
  if (window.google && google.accounts && google.accounts.oauth2) {
    initGIS()
  } else {
    setTimeout(waitForGIS, 200)
  }
})()

function initGIS() {
  gisTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    scope: GOOGLE_SCOPES,
    callback: (resp) => {
      if (resp.error) { console.error('GIS auth error:', resp.error); return }
      currentAccessToken = resp.access_token
      if (pendingAfterAuth) {
        const fn = pendingAfterAuth
        pendingAfterAuth = null
        fn()
      }
    }
  })
}

function googleSignIn(afterSignIn) {
  if (afterSignIn) pendingAfterAuth = afterSignIn
  if (!gisTokenClient) { setTimeout(() => googleSignIn(afterSignIn), 300); return }
  gisTokenClient.requestAccessToken({ prompt: currentAccessToken ? '' : 'consent' })
}

async function getAccessToken() {
  if (currentAccessToken) return currentAccessToken
  return new Promise((resolve, reject) => {
    googleSignIn(() => {
      currentAccessToken ? resolve(currentAccessToken) : reject(new Error('Google auth failed'))
    })
  })
}

// ── Agreement context ─────────────────────────────────────────────────────────
function setCurrentAgreement(a) {
  _currentAgreement = a
  currentDoc = { id: null, name: null, mimeType: null }
  _docComments = a._docComments ? [...a._docComments] : []
  stopAutoSave()
}

// ── Picker ────────────────────────────────────────────────────────────────────
function openPickerForCurrentAgreement() {
  if (!_currentAgreement) return
  if (!pickerApiLoaded) {
    if (window.showToast) showToast('Picker loading, please wait…')
    setTimeout(openPickerForCurrentAgreement, 500)
    return
  }
  if (!currentAccessToken) {
    googleSignIn(() => createPicker())
    return
  }
  createPicker()
}

function createPicker() {
  const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
    .setMimeTypes([
      'application/vnd.google-apps.document',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ].join(','))
    .setMode(google.picker.DocsViewMode.LIST)
  const picker = new google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(currentAccessToken)
    .setDeveloperKey(GOOGLE_API_KEYS.picker)
    .setCallback(pickerCallback)
    .setTitle('Select Agreement Draft')
    .build()
  picker.setVisible(true)
}

function pickerCallback(data) {
  if (data.action !== google.picker.Action.PICKED) return
  const doc = data.docs[0]
  currentDoc = { id: doc.id, name: doc.name, mimeType: doc.mimeType }
  const isGDoc = doc.mimeType === 'application/vnd.google-apps.document'
  const docEditUrl = `https://docs.google.com/document/d/${doc.id}/edit`
  const urlEl  = document.getElementById('docFrameUrl')
  const linkEl = document.getElementById('docOpenLink')
  if (urlEl)  urlEl.textContent = doc.name
  if (linkEl) { linkEl.href = docEditUrl; linkEl.style.display = '' }
  if (_currentAgreement) {
    _currentAgreement._linkedDocId   = doc.id
    _currentAgreement._linkedDocMime = doc.mimeType
    _currentAgreement._linkedDocName = doc.name
    _currentAgreement._linkedDocUrl  = isGDoc ? docEditUrl : null
  }
  if (isGDoc) {
    // Google Doc → show in iframe
    const iframe      = document.getElementById('docIframe')
    const editorScroll = document.getElementById('docEditorScroll')
    const workArea    = document.getElementById('docWorkArea')
    if (iframe)       { iframe.src = `${docEditUrl}?rm=minimal`; iframe.style.display = 'flex'; iframe.style.flex = '1' }
    if (editorScroll) editorScroll.style.display = 'none'
    if (workArea)     workArea.style.display = 'flex'
    renderComments()
  } else {
    // Word doc → load HTML via Drive API
    loadDocHtml(doc.id, doc.name, doc.mimeType)
  }
}

// ── Load Word doc content into portal editor (used for .docx files from picker) ──
async function loadDocHtml(fileId, name, mimeType) {
  const editor       = document.getElementById('docEditor')
  const editorScroll = document.getElementById('docEditorScroll')
  const docIframe    = document.getElementById('docIframe')
  const workArea     = document.getElementById('docWorkArea')
  const loadingState = document.getElementById('docLoadingState')
  const editToggle   = document.getElementById('editToggleBtn')
  const saveBtn      = document.getElementById('saveDocBtn')
  const urlEl        = document.getElementById('docFrameUrl')
  const linkEl       = document.getElementById('docOpenLink')

  // Reset to loading state
  if (workArea)     workArea.style.display    = 'none'
  if (loadingState) loadingState.style.display = 'flex'
  if (editToggle)   editToggle.style.display   = 'none'
  if (saveBtn)      saveBtn.style.display      = 'none'
  if (docIframe)    { docIframe.src = 'about:blank'; docIframe.style.display = 'none' }
  if (editorScroll) editorScroll.style.display = 'none'
  if (editor)       { editor.innerHTML = ''; editor.contentEditable = 'false' }

  currentDoc = { id: fileId, name, mimeType }
  if (urlEl)  urlEl.textContent = name || '—'
  if (linkEl) linkEl.href = `https://drive.google.com/file/d/${fileId}/view`

  try {
    const token = await getAccessToken()

    // Always check the actual mimeType from Drive — URL alone is unreliable
    let actualMime = mimeType
    try {
      const metaRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,name`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (metaRes.ok) {
        const meta = await metaRes.json()
        actualMime = meta.mimeType
        currentDoc.mimeType = actualMime
        if (meta.name) {
          currentDoc.name = meta.name
          if (urlEl) urlEl.textContent = meta.name
        }
      }
    } catch {}

    const isWordDoc   = actualMime && (actualMime.includes('wordprocessingml') || actualMime === 'application/msword')
    const isGoogleDoc = actualMime === 'application/vnd.google-apps.document'

    let htmlContent = ''

    if (isWordDoc) {
      if (!window.mammoth) throw new Error('mammoth.js not loaded')
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      const buf    = await res.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer: buf })
      htmlContent  = result.value

    } else if (isGoogleDoc) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const fullHtml = await res.text()
      const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      htmlContent = bodyMatch ? bodyMatch[1] : fullHtml

    } else {
      // Try HTML export first, then binary fallback
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const fullHtml  = await res.text()
          const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
          htmlContent = bodyMatch ? bodyMatch[1] : fullHtml
        }
      } catch {}

      if (!htmlContent && window.mammoth) {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (res.ok) {
          const buf    = await res.arrayBuffer()
          const result = await mammoth.convertToHtml({ arrayBuffer: buf })
          htmlContent  = result.value
        }
      }
    }

    if (!htmlContent) throw new Error('No content received from Drive')

    _showInEditor(editor, loadingState, workArea, editToggle, htmlContent)

  } catch (e) {
    console.error('loadDocHtml failed:', e)
    if (editor && _currentAgreement) {
      const simHtml   = buildDocSimulation(_currentAgreement)
      const bodyMatch = simHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      editor.innerHTML = bodyMatch ? bodyMatch[1] : `<p style="color:#94a59b;padding:20px">Could not load document.</p>`
    }
    if (loadingState) loadingState.style.display = 'none'
    const editorScroll = document.getElementById('docEditorScroll')
    if (editorScroll) editorScroll.style.display = 'block'
    if (workArea)     workArea.style.display      = 'flex'
    if (editToggle)   editToggle.style.display    = 'inline-flex'
    renderComments()
    _ensureSelectionListener()
  }
}

function _showInEditor(editor, loadingState, workArea, editToggle, bodyHtml) {
  if (loadingState) loadingState.style.display = 'none'
  if (editor) {
    editor.innerHTML       = bodyHtml
    editor.contentEditable = 'false'
  }
  const editorScroll = document.getElementById('docEditorScroll')
  if (editorScroll) { editorScroll.style.display = 'block'; editorScroll.scrollTop = 0 }
  if (workArea)   workArea.style.display   = 'flex'
  if (editToggle) editToggle.style.display = 'inline-flex'
  renderComments()
  _ensureSelectionListener()
}

// ── Edit toggle ───────────────────────────────────────────────────────────────
function toggleEdit() {
  const editor  = document.getElementById('docEditor')
  const editBtn = document.getElementById('editToggleBtn')
  const saveBtn = document.getElementById('saveDocBtn')
  if (!editor) return
  const isEditing = editor.contentEditable === 'true'
  if (isEditing) {
    editor.contentEditable = 'false'
    if (editBtn) editBtn.textContent = '✏ Edit'
    if (saveBtn) saveBtn.style.display = 'none'
    stopAutoSave()
  } else {
    editor.contentEditable = 'true'
    editor.focus()
    if (editBtn) editBtn.textContent = '✓ Done Editing'
    if (saveBtn) saveBtn.style.display = 'inline-flex'
    startAutoSave()
  }
}

// ── Save edited doc to Drive ──────────────────────────────────────────────────
async function saveEditedDoc() {
  const editor  = document.getElementById('docEditor')
  const saveBtn = document.getElementById('saveDocBtn')
  const editBtn = document.getElementById('editToggleBtn')
  const status  = document.getElementById('autosaveStatus')
  if (!editor) return

  const html    = editor.innerHTML
  const docName = currentDoc.name || (_currentAgreement ? `${_currentAgreement.client} — ${_currentAgreement.type} Agreement` : 'GyfTR Agreement')
  const fileId  = currentDoc.id || null

  if (status) status.textContent = 'Saving…'
  if (saveBtn) { saveBtn.textContent = 'Saving…'; saveBtn.disabled = true }

  try {
    const result = await _uploadDocHtml(html, docName, fileId)
    // If this was a new file (simulation), store the Drive ID on the agreement
    if (!fileId && result && result.id && _currentAgreement) {
      currentDoc.id   = result.id
      currentDoc.name = result.name || docName
      _currentAgreement._linkedDocId   = result.id
      _currentAgreement._linkedDocName = currentDoc.name
      _currentAgreement._linkedDocUrl  = `https://docs.google.com/document/d/${result.id}/edit`
      const linkEl = document.getElementById('docOpenLink')
      if (linkEl) { linkEl.href = _currentAgreement._linkedDocUrl; linkEl.style.display = '' }
      if (window.showToast) showToast('Created in Drive — doc now linked', 'green')
    } else {
      if (window.showToast) showToast('Saved to Drive', 'green')
    }
    if (status) { status.textContent = 'Saved to Drive ✓'; setTimeout(() => { if (status) status.textContent = '' }, 3000) }
    // Exit edit mode
    editor.contentEditable = 'false'
    if (editBtn) editBtn.textContent = '✏ Edit'
    if (saveBtn) { saveBtn.style.display = 'none'; saveBtn.textContent = 'Save to Drive'; saveBtn.disabled = false }
    stopAutoSave()
  } catch (e) {
    if (status) status.textContent = 'Save failed — sign in to Google first'
    if (saveBtn) { saveBtn.textContent = 'Save to Drive'; saveBtn.disabled = false }
    if (window.showToast) showToast('Save failed — click Sign In on the toolbar', 'red')
  }
}

// ── Autosave ──────────────────────────────────────────────────────────────────
function startAutoSave() {
  stopAutoSave()
  const status = document.getElementById('autosaveStatus')
  if (status) status.textContent = ''
  _autosaveTimer = setInterval(async () => {
    const editor = document.getElementById('docEditor')
    const html   = editor?.innerHTML
    if (!html) return
    const storeKey = currentDoc.id || (_currentAgreement ? `ag_${_currentAgreement.id}` : null)
    if (storeKey) localStorage.setItem(`doc_${storeKey}`, html)
    if (currentAccessToken && currentDoc.id) {
      try {
        await _uploadDocHtml(html, currentDoc.name, currentDoc.id)
        if (status) { status.textContent = 'Saved to Drive ✓'; setTimeout(() => { if (status) status.textContent = '' }, 2000) }
      } catch {}
    } else {
      if (status) { status.textContent = 'Saved locally'; setTimeout(() => { if (status) status.textContent = '' }, 2000) }
    }
  }, 30000)
}

function stopAutoSave() {
  if (_autosaveTimer) { clearInterval(_autosaveTimer); _autosaveTimer = null }
}

async function _uploadDocHtml(html, name, fileId) {
  const token    = await getAccessToken()
  const boundary = 'gyftr_' + Date.now()
  const meta     = JSON.stringify({ name: name || 'GyfTR Agreement', mimeType: 'application/vnd.google-apps.document' })
  const bodyStr  = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: text/html\r\n\r\n${html}\r\n--${boundary}--`
  const url    = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
  const method = fileId ? 'PATCH' : 'POST'
  const res    = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: bodyStr
  })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

// ── Inline Commenting ─────────────────────────────────────────────────────────
function _ensureSelectionListener() {
  if (_selectionListenerAdded) return
  _selectionListenerAdded = true
  document.addEventListener('selectionchange', _onSelectionChange)
}

function _onSelectionChange() {
  const sel      = window.getSelection()
  const floatBtn = document.getElementById('commentFloatBtn')
  const editor   = document.getElementById('docEditor')
  if (!floatBtn || !editor) return

  if (!sel || sel.isCollapsed || !sel.toString().trim()) {
    floatBtn.style.display = 'none'
    return
  }

  // Only show when selection is inside #docEditor
  try {
    const range = sel.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) {
      floatBtn.style.display = 'none'
      return
    }
    const rect = range.getBoundingClientRect()
    floatBtn.style.display = 'block'
    floatBtn.style.left    = `${Math.max(8, rect.left + rect.width / 2 - 55)}px`
    floatBtn.style.top     = `${rect.top - 46 + window.scrollY}px`
  } catch {
    floatBtn.style.display = 'none'
  }
}

const TEAM_CFG = {
  L: { bg: '#DCFCE7', color: '#15803D', name: 'Legal'      },
  F: { bg: '#DBEAFE', color: '#1D4ED8', name: 'Finance'    },
  B: { bg: '#EDE9FE', color: '#7C3AED', name: 'Business'   },
  C: { bg: '#FEF3C7', color: '#B45309', name: 'Compliance' },
}

function _currentUserMeta() {
  const R = window.ROLES && window.role ? window.ROLES[window.role] : null
  return {
    author: R?.name  || 'User',
    role:   R?.role  || '',
    team:   R?.team  || 'L',
    avatar: R?.av    || 'U',
  }
}

function addComment() {
  const sel    = window.getSelection()
  const editor = document.getElementById('docEditor')
  if (!sel || sel.isCollapsed || !sel.toString().trim()) return

  const quote  = sel.toString().trim().slice(0, 150)
  const markId = 'cm_' + Date.now()
  const me     = _currentUserMeta()

  try {
    const range = sel.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) {
      const mark        = document.createElement('mark')
      mark.className    = 'comment-mark'
      mark.dataset.cmid = markId
      mark.onclick      = () => {
        document.querySelector(`.gdc-thread[data-cmid="${markId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      range.surroundContents(mark)
    }
  } catch { /* cross-element selection — proceed without highlight mark */ }

  _docComments.push({
    id: markId, quote, ...me,
    ts: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    text: '', resolved: false, replies: []
  })
  if (_currentAgreement) _currentAgreement._docComments = _docComments

  const floatBtn = document.getElementById('commentFloatBtn')
  if (floatBtn) floatBtn.style.display = 'none'
  sel.removeAllRanges()
  renderComments()
  setTimeout(() => document.getElementById(`ci_${markId}`)?.focus(), 50)
}

function addReply(id, text) {
  if (!text?.trim()) return
  const c = _docComments.find(x => x.id === id)
  if (!c) return
  c.replies = c.replies || []
  c.replies.push({
    ...  _currentUserMeta(),
    ts:   new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    body: text.trim()
  })
  if (_currentAgreement) _currentAgreement._docComments = _docComments
  renderComments()
}

function saveCommentText(id, text) {
  if (!text || !text.trim()) return
  const c = _docComments.find(x => x.id === id)
  if (!c) return
  c.text = text.trim()
  if (_currentAgreement) _currentAgreement._docComments = _docComments
  renderComments()
}

function resolveComment(id) {
  const c = _docComments.find(x => x.id === id)
  if (!c) return
  c.resolved = true
  const mark = document.querySelector(`.comment-mark[data-cmid="${id}"]`)
  if (mark) mark.classList.add('resolved')
  if (_currentAgreement) _currentAgreement._docComments = _docComments
  renderComments()
}

function deleteComment(id) {
  _docComments = _docComments.filter(x => x.id !== id)
  const mark = document.querySelector(`.comment-mark[data-cmid="${id}"]`)
  if (mark) mark.replaceWith(...mark.childNodes)
  if (_currentAgreement) _currentAgreement._docComments = _docComments
  renderComments()
}

function _avatarHtml(avatar, team, size = 28) {
  const cfg = TEAM_CFG[team] || { bg: '#EEF4EF', color: '#586860' }
  return `<div class="gdc-avatar" style="width:${size}px;height:${size}px;background:${cfg.bg};color:${cfg.color};font-size:${size<=24?10:11}px">${escHtml(avatar||'?')}</div>`
}

function _teamBadge(team) {
  const cfg = TEAM_CFG[team]
  if (!cfg) return ''
  return `<span class="gdc-team-badge" style="background:${cfg.bg};color:${cfg.color}">${cfg.name}</span>`
}

function renderComments() {
  const list    = document.getElementById('docCommentsList')
  const empty   = document.getElementById('docCommentsEmpty')
  const counter = document.getElementById('docCommentCount')
  if (!list) return

  const active = _docComments.filter(c => !c.resolved)
  if (counter) counter.textContent = active.length || ''

  if (_docComments.length === 0) {
    list.innerHTML = ''
    if (empty) empty.style.display = 'flex'
    return
  }
  if (empty) empty.style.display = 'none'

  list.innerHTML = _docComments.map(c => {
    const resolved = c.resolved
    const replies  = c.replies || []
    const hasText  = !!(c.text || '').trim()

    // ── Replies HTML
    const repliesHtml = replies.map(r => `
      <div class="gdc-reply">
        ${_avatarHtml(r.avatar, r.team, 24)}
        <div class="gdc-reply-body">
          <div class="gdc-reply-meta">
            <span class="gdc-reply-author">${escHtml(r.author)}</span>
            ${_teamBadge(r.team)}
            <span class="gdc-ts">${r.ts}</span>
          </div>
          <div class="gdc-body-text">${escHtml(r.body)}</div>
        </div>
      </div>`).join('')

    // ── Reply input row
    const replyInputHtml = !resolved ? `
      <div class="gdc-reply-compose" id="rc_${c.id}" style="display:none">
        ${_avatarHtml(_currentUserMeta().avatar, _currentUserMeta().team, 24)}
        <div style="flex:1;display:flex;flex-direction:column;gap:5px">
          <textarea id="ri_${c.id}" class="gdc-textarea" placeholder="Reply…" rows="2"></textarea>
          <div style="display:flex;gap:6px">
            <button class="gx-btn gx-btn-dark" style="font-size:11px;padding:4px 11px"
              onclick="window.gAddReply&&window.gAddReply('${c.id}',document.getElementById('ri_${c.id}').value)">Post</button>
            <button class="gx-btn gx-btn-ghost" style="font-size:11px;padding:4px 11px"
              onclick="document.getElementById('rc_${c.id}').style.display='none'">Cancel</button>
          </div>
        </div>
      </div>` : ''

    return `
      <div class="gdc-thread${resolved ? ' resolved' : ''}" data-cmid="${c.id}">
        <!-- Quote strip -->
        ${c.quote ? `<div class="gdc-quote">${escHtml(c.quote.length > 80 ? c.quote.slice(0,80)+'…' : c.quote)}</div>` : ''}

        <!-- Main comment -->
        <div class="gdc-comment">
          <div class="gdc-author-row">
            ${_avatarHtml(c.avatar || c.author?.slice(0,2), c.team)}
            <div class="gdc-author-info">
              <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
                <span class="gdc-author-name">${escHtml(c.author)}</span>
                ${_teamBadge(c.team)}
              </div>
              <span class="gdc-ts">${c.ts}</span>
            </div>
            ${!resolved ? `
            <div class="gdc-thread-actions">
              <button class="gdc-icon-btn" title="Resolve" onclick="window.gResolveComment&&window.gResolveComment('${c.id}')">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button class="gdc-icon-btn" title="Delete" onclick="window.gDeleteComment&&window.gDeleteComment('${c.id}')">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
            </div>` : `<span class="gdc-resolved-badge">Resolved</span>`}
          </div>

          ${hasText
            ? `<div class="gdc-body-text">${escHtml(c.text)}</div>`
            : `<textarea id="ci_${c.id}" class="gdc-textarea" placeholder="Add a comment…" rows="3" autofocus></textarea>
               <div style="display:flex;gap:6px;margin-top:6px">
                 <button class="gx-btn gx-btn-dark" style="font-size:11px;padding:4px 11px"
                   onclick="window.gSaveCommentText&&window.gSaveCommentText('${c.id}',document.getElementById('ci_${c.id}').value)">Post</button>
                 <button class="gx-btn gx-btn-ghost" style="font-size:11px;padding:4px 11px"
                   onclick="window.gDeleteComment&&window.gDeleteComment('${c.id}')">Cancel</button>
               </div>`}
        </div>

        <!-- Replies -->
        ${repliesHtml ? `<div class="gdc-replies">${repliesHtml}</div>` : ''}

        <!-- Reply compose -->
        ${replyInputHtml}

        <!-- Reply button -->
        ${hasText && !resolved ? `
          <div class="gdc-footer">
            <button class="gdc-reply-btn" onclick="const rc=document.getElementById('rc_${c.id}');rc.style.display='flex';rc.querySelector('textarea')?.focus()">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 8h10M8 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Reply
            </button>
            <span style="font-size:10px;color:#c4cfc7">${replies.length ? replies.length+' repl'+(replies.length===1?'y':'ies') : ''}</span>
          </div>` : ''}
      </div>`
  }).join('')
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── Legal document simulation ─────────────────────────────────────────────────
function buildDocSimulation(a) {
  const clauses   = a.clauses  || []
  const drafts    = a.drafts   || []
  const cd        = a.clientDates || {}
  const lastDraft = drafts.length ? drafts[drafts.length - 1] : null
  const effectiveDate = cd.effectiveDate ? new Date(cd.effectiveDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '____________________'
  const endDate       = cd.endDate       ? new Date(cd.endDate      ).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '____________________'

  const sigL = a.signatures?.L
    ? `<div style="margin-top:4px;font-size:12pt;color:#15803D;font-weight:600">✓ Signed by ${a.signatures.L.name} on ${a.signatures.L.ts}</div>`
    : `<div style="border-top:1px solid #000;width:200px;margin-top:48px;padding-top:4px;font-size:10pt;color:#444">${a.sp?.L || 'Authorised Signatory'}</div>`
  const sigB = a.signatures?.B
    ? `<div style="margin-top:4px;font-size:12pt;color:#15803D;font-weight:600">✓ Signed by ${a.signatures.B.name} on ${a.signatures.B.ts}</div>`
    : `<div style="border-top:1px solid #000;width:200px;margin-top:48px;padding-top:4px;font-size:10pt;color:#444">Authorised Signatory</div>`

  const docTypeLabel = a.type === 'White Label' ? 'WHITE LABEL SOLUTION AGREEMENT'
    : a.type === 'API / Direct' ? 'CLIENT BUY &amp; SELL AGREEMENT'
    : `${a.type.toUpperCase()} AGREEMENT`

  const draftBadge = lastDraft
    ? `<table width="100%" style="margin-bottom:18pt"><tr>
        <td style="background:#FFF8E1;border-left:3pt solid #F59E0B;padding:7pt 10pt;font-size:10pt">
          <strong>Working Draft — ${lastDraft.n}</strong> &nbsp;·&nbsp; ${lastDraft.dir === 'sent' ? 'Sent to Client' : 'Received from Client'} &nbsp;·&nbsp; ${lastDraft.date}
          <br><span style="color:#666">${lastDraft.note}</span>
        </td>
      </tr></table>`
    : ''

  // Build clause paragraphs in legal format
  const clauseRows = clauses.map(c => {
    const finalText  = c.changes?.length ? c.changes[c.changes.length - 1] : (c.full || '')
    const ocColor = c.outcome === 'accepted' ? '#15803D'
      : c.outcome === 'held'    ? '#1D4ED8'
      : c.outcome === 'partial' ? '#B45309'
      : c.outcome === 'pending' ? '#7C3AED' : '#586860'
    const ocLabel = c.outcome === 'accepted' ? 'Accepted'
      : c.outcome === 'held'    ? 'GyfTR Held Firm'
      : c.outcome === 'partial' ? 'Partially Accepted'
      : c.outcome === 'pending' ? 'Pending'
      : '—'
    return `
      <p style="margin:0 0 12pt 0">
        <span style="font-weight:700">${c.no}. ${escHtml(c.name)}</span>
        <span style="font-size:9pt;font-weight:700;color:${ocColor};background:${ocColor}14;padding:1pt 6pt;border-radius:4pt;margin-left:8pt">${ocLabel}</span>
      </p>
      <p style="margin:0 0 18pt 22pt;text-align:justify;font-size:11pt">${escHtml(finalText)}</p>`
  }).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    *{box-sizing:border-box}
    body{font-family:'Times New Roman',Times,serif;font-size:12pt;color:#111;background:#fff;padding:56pt 72pt;line-height:1.6;max-width:820pt;margin:0 auto}
    h1{font-size:14pt;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6pt}
    .subtitle{text-align:center;font-size:11pt;color:#444;margin-bottom:24pt}
    .section-head{font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin:24pt 0 8pt;border-bottom:1pt solid #ccc;padding-bottom:3pt}
    .party-block{margin-bottom:12pt;padding-left:18pt}
    .whereas-item{margin:0 0 8pt 18pt}
    .sig-block{margin-top:8pt}
    .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:90pt;font-weight:900;color:rgba(0,0,0,.03);pointer-events:none;white-space:nowrap;z-index:0}
    .link-note{background:#F0FDF4;border:1pt solid #BBF7D0;border-radius:6pt;padding:10pt 14pt;margin-bottom:20pt;font-size:10pt;font-family:Arial,sans-serif;color:#15803D}
  </style>
  </head><body>
  <div class="wm">DRAFT</div>

  <div class="link-note">
    <strong>Simulation mode</strong> — This is a structured preview based on the clause data in the portal.
    To view and edit the actual Google Doc, click <strong>Link Google Doc</strong> in the toolbar above.
  </div>

  ${draftBadge}

  <h1>${docTypeLabel}</h1>
  <p class="subtitle">This Agreement is entered into as of ${effectiveDate} between the following Parties:</p>

  <p class="section-head">Parties</p>

  <div class="party-block">
    <p style="margin:0 0 8pt"><strong>(1) Vouchagram India Private Limited</strong> (trading as "<strong>GyfTR</strong>"), a company incorporated under the Companies Act, 2013 having CIN U74999DL2014PTC272590 and its registered office at 2<sup>nd</sup> Floor, Unit – 200, Plot No. F – 5, Best Sky Towers, Pitampura, Netaji Subhash Place, New Delhi – 110034 (hereinafter referred to as "<strong>GyfTR</strong>", which expression shall, unless repugnant to the context or meaning thereof, mean and include its successors and assigns);</p>
    <p style="margin:0 0 8pt"><strong>And</strong></p>
    <p style="margin:0"><strong>${escHtml(a.client)}</strong>, a private limited company incorporated under the provisions of the Companies Act, 2013/1956 and having its registered office at ____________________ (hereinafter referred to as the "<strong>Client</strong>", which expression shall, unless repugnant to the context or meaning thereof, mean and include its successors and permitted assigns).</p>
  </div>

  <p style="margin:12pt 0">GyfTR and the Client shall hereinafter, wherever the context so permits, be individually referred to as a "<strong>Party</strong>" and collectively as the "<strong>Parties</strong>".</p>

  <p class="section-head">Whereas</p>
  <p class="whereas-item">1. GyfTR is a registered trademark of Vouchagram India Pvt Ltd and the Client has obtained the necessary permission and authority from Vouchagram India Pvt Ltd <em>(hereinafter referred to as a Business Partner)</em> to use the same pursuant to a licensing agreement.</p>
  <p class="whereas-item">2. The Client is engaged in the business of buying, reselling and/or distributing gift vouchers / gift cards / digital reward instruments and related services for corporate and employee incentive programmes.</p>
  <p class="whereas-item">3. GyfTR is in the business of providing technology-driven gifting and reward solutions including the sale of gift vouchers, codes, and digital instruments through its proprietary platform.</p>
  <p class="whereas-item">4. The Parties now desire to set out the terms and conditions governing their commercial relationship in this Agreement.</p>

  <p style="margin:14pt 0 18pt"><strong>NOW, THEREFORE</strong>, in consideration of the mutual covenants and agreements set forth herein, and for other good and valuable consideration, the receipt and sufficiency of which is hereby acknowledged, the Parties agree as follows:</p>

  ${clauseRows ? `<p class="section-head">Agreement Terms</p>${clauseRows}` : '<p style="color:#666;font-style:italic">No clause data available.</p>'}

  <p class="section-head">Annexure A — Commercial Terms</p>
  <p>The commercial terms including pricing, revenue share, discount structure, invoice cycle, and prefunded account requirements shall be as agreed by the Parties and set out in Annexure A, which forms an integral part of this Agreement.</p>

  <p class="section-head">Term and Termination</p>
  <p>This Agreement shall commence on the Effective Date (${effectiveDate}) and shall remain in force until ${endDate}, unless earlier terminated in accordance with the provisions hereof. Either Party may terminate this Agreement by providing 30 (thirty) days' written notice to the other Party.</p>

  <p class="section-head">Governing Law &amp; Dispute Resolution</p>
  <p>This Agreement shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or in connection with this Agreement shall be subject to the exclusive jurisdiction of the courts at New Delhi, India.</p>

  <p class="section-head">In Witness Whereof</p>
  <p>The Parties have caused this Agreement to be executed by their duly authorised representatives as of the date first written above.</p>

  <table width="100%" style="margin-top:32pt;border-collapse:collapse">
    <tr>
      <td style="vertical-align:top;padding-right:24pt;width:50%">
        <p style="font-weight:700;margin:0 0 4pt">For and on behalf of<br>Vouchagram India Private Limited (GyfTR)</p>
        <div class="sig-block">${sigL}</div>
        <p style="margin:10pt 0 2pt;font-size:10pt;color:#555">Name: ${a.sp?.L || '____________________'}</p>
        <p style="margin:0;font-size:10pt;color:#555">Designation: Authorised Signatory</p>
        <p style="margin:4pt 0 0;font-size:10pt;color:#555">Date: ____________________</p>
        <p style="margin:4pt 0 0;font-size:10pt;color:#555">Place: New Delhi</p>
      </td>
      <td style="vertical-align:top;padding-left:24pt;width:50%;border-left:1pt solid #ddd">
        <p style="font-weight:700;margin:0 0 4pt">For and on behalf of<br>${escHtml(a.client)}</p>
        <div class="sig-block">${sigB}</div>
        <p style="margin:10pt 0 2pt;font-size:10pt;color:#555">Name: ____________________</p>
        <p style="margin:0;font-size:10pt;color:#555">Designation: Authorised Signatory</p>
        <p style="margin:4pt 0 0;font-size:10pt;color:#555">Date: ____________________</p>
        <p style="margin:4pt 0 0;font-size:10pt;color:#555">Place: ____________________</p>
      </td>
    </tr>
  </table>

  </body></html>`
}

// ── Save a copy of current Google Doc directly to user's Drive ───────────────
async function saveCopyToDrive() {
  const btn = document.getElementById('saveDocBtn')
  const iframe = document.getElementById('docIframe')
  const src = iframe ? iframe.src : ''
  const docId = _currentAgreement?._linkedDocId
    || (src.match(/\/document\/d\/([a-zA-Z0-9_-]{10,})/) || [])[1]
  if (!docId) { if (window.showToast) showToast('No document linked'); return }

  const now = new Date()
  const stamp = now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
    + ' ' + now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})
  const name = _currentAgreement
    ? `${_currentAgreement.client} — ${_currentAgreement.type} Agreement (${stamp})`
    : `GyfTR Agreement (${stamp})`

  if (btn) { btn.disabled = true; btn.textContent = 'Saving…' }
  try {
    const token = await getAccessToken()
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}/copy`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    if (!res.ok) throw new Error((await res.json()).error?.message || 'Drive error')
    const file = await res.json()
    if (window.showToast) showToast('Saved to your Google Drive ✓', 'green')
    if (btn) {
      btn.textContent = 'Saved ✓'
      btn.style.background = '#15803D'
      setTimeout(() => { btn.textContent = 'Save to Drive'; btn.style.background = '#1a73e8'; btn.disabled = false }, 2500)
    }
    return file
  } catch (e) {
    if (window.showToast) showToast('Save failed: ' + e.message)
    if (btn) { btn.textContent = 'Save to Drive'; btn.disabled = false }
  }
}

// ── Expose to window ──────────────────────────────────────────────────────────
window.gOpenPicker        = openPickerForCurrentAgreement
window.gToggleEdit        = toggleEdit
window.gSaveDoc           = saveEditedDoc
window.gStopAutoSave      = stopAutoSave
window.gSignIn            = googleSignIn
window.gSetAgreement      = setCurrentAgreement
window.gLoadDocHtml       = loadDocHtml
window.gAddComment        = addComment
window.gSaveCommentText   = saveCommentText
window.gResolveComment    = resolveComment
window.gDeleteComment     = deleteComment
window.gAddReply          = addReply
window.gRenderComments         = renderComments
window.gEnsureSelectionListener = _ensureSelectionListener
window.buildDocSimulation      = buildDocSimulation
window.gSaveCopyToDrive        = saveCopyToDrive
