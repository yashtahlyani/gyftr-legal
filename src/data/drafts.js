import { db } from '../lib/supabase.js'

export async function uploadDraft(agreementId, file, draftNo, direction, note) {
  const ext = file.name.slice(file.name.lastIndexOf('.'))
  const filePath = `${agreementId}/${draftNo}${ext}`

  // 1. Upload file to Supabase storage
  const { error: uploadError } = await db.storage
    .from('legal-drafts')
    .upload(filePath, file, { upsert: true })
  if (uploadError) throw uploadError

  // 2. Save draft record
  const { data, error } = await db.from('drafts').insert({
    agreement_id: agreementId,
    draft_no:     draftNo,
    direction,
    note,
    file_path: filePath,
    file_name: file.name,
    date: new Date().toISOString().split('T')[0]
  }).select().single()
  if (error) throw error
  return data
}

export async function getDraftViewURL(filePath) {
  const { data, error } = await db.storage
    .from('legal-drafts')
    .createSignedUrl(filePath, 3600)
  if (error) throw error

  // Word docs → Google Docs viewer; PDFs → direct
  if (filePath.match(/\.(docx?|doc)$/i)) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(data.signedUrl)}&embedded=true`
  }
  return data.signedUrl
}

export async function getDraftsForAgreement(agreementId) {
  const { data, error } = await db
    .from('drafts')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

export async function updateDraftDirection(draftId, direction) {
  const { error } = await db
    .from('drafts')
    .update({ direction })
    .eq('id', draftId)
  if (error) throw error
}
