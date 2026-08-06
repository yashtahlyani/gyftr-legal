import { db } from '../lib/supabase.js'

export async function updateTeamStatus(agreementId, teamCode, status, changedBy) {
  // upsert team status row
  const { error } = await db.from('team_statuses').upsert({
    agreement_id: agreementId,
    team_code:    teamCode,
    status,
    updated_at:   new Date().toISOString(),
    updated_by:   changedBy
  }, { onConflict: 'agreement_id,team_code' })
  if (error) throw error
}

export async function logHistory(agreementId, team, changedBy, fromStatus, toStatus) {
  const { error } = await db.from('history_log').insert({
    agreement_id: agreementId,
    team,
    changed_by:   changedBy,
    from_status:  fromStatus,
    to_status:    toStatus
  })
  if (error) throw error
}
