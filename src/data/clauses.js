import { db } from '../lib/supabase.js'

export async function analyseWithClaude(agreementId, draftA, draftB) {
  // Call the Supabase Edge Function
  const { data, error } = await db.functions.invoke('analyse-drafts', {
    body: { agreement_id: agreementId, draft_a: draftA, draft_b: draftB }
  })
  if (error) throw error
  return data
}

export async function updateClauseOutcome(clauseId, outcome) {
  const { error } = await db.from('clauses').update({ outcome }).eq('id', clauseId)
  if (error) throw error
}

export async function getClausesForAgreement(agreementId) {
  const { data, error } = await db
    .from('clauses')
    .select('*, clause_changes(*)')
    .eq('agreement_id', agreementId)
  if (error) throw error
  return data
}
