import { db } from '../lib/supabase.js'

export async function addRemark(agreementId, authorName, authorRole, text) {
  const { data, error } = await db.from('remarks').insert({
    agreement_id: agreementId,
    author_name:  authorName,
    author_role:  authorRole,
    text
  }).select().single()
  if (error) throw error
  // update agreement updated_at
  await db.from('agreements')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', agreementId)
  return data
}

export async function getRemarksForAgreement(agreementId) {
  const { data, error } = await db
    .from('remarks')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}
