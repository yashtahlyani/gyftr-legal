import { db } from '../lib/supabase.js'

export async function sendReminder(agreementId, fromName, fromRole, toTeams, client) {
  const { error } = await db.from('reminders').insert({
    agreement_id: agreementId,
    from_role:    fromRole,
    from_name:    fromName,
    to_teams:     toTeams,
    client_name:  client
  })
  if (error) throw error
}

export async function getRemindersForTeam(teamCode) {
  const { data, error } = await db
    .from('reminders')
    .select('*')
    .contains('to_teams', [teamCode])
    .order('sent_at', { ascending: false })
  if (error) throw error
  return data
}

export async function dismissReminder(reminderId, teamCode) {
  // fetch current dismissed_by array and append
  const { data: rem } = await db.from('reminders').select('dismissed_by').eq('id', reminderId).single()
  const dismissed = [...(rem?.dismissed_by || []), teamCode]
  const { error } = await db.from('reminders').update({ dismissed_by: dismissed }).eq('id', reminderId)
  if (error) throw error
}
