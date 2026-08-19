// authz.js — server-side authorization, 1:1 port of every Supabase RLS
// policy from supabase/schema.sql + supabase/seed.sql.
//
// RDS has no RLS, so this module is now the ONLY security boundary for
// row-level access — every route that used to rely on a Postgres policy
// must call the matching check here before touching the DB.
//
// Original policy inventory this file replaces (for audit purposes):
//
//   agreements, drafts, team_statuses, remarks, history_log, clauses,
//   clause_changes, reminders, signatures:
//     "Read <table>" ............ for select using (auth.role() = 'authenticated')
//       -> any authenticated request may read; enforced simply by every
//          route in routes/ sitting behind requireAuth + loadProfile.
//
//   agreements:
//     "Legal creates agreements" . for insert with check (role = 'legal')
//     "Legal updates agreements" . for update using (role = 'legal')
//     "Legal deletes agreements" . for delete using (role = 'legal')      (seed.sql)
//       -> canManageAgreements(profile)
//
//   team_statuses:
//     "Update own team status" ... for update using (team_code = own OR role = 'legal')
//       -> canUpdateTeamStatus(profile, teamCode)
//     "Insert team status" ....... for insert with check (authenticated)
//       -> any authenticated request (no extra check)
//
//   remarks, history_log, reminders:
//     "Add remarks" / "Add history" / "Add reminders" .. insert with check (authenticated)
//     "Update reminders" ................................ update using (authenticated)
//       -> any authenticated request (no extra check)
//
//   drafts:
//     "Upload drafts" ............ for insert with check (role = 'legal')
//       -> canManageDrafts(profile)
//
//   profiles (seed.sql):
//     "Read profiles" ............ for select using (authenticated)
//       -> any authenticated request
//     "Insert own profile" ....... for insert with check (auth.uid() = id)
//     "Update own profile" ....... for update using (auth.uid() = id)
//       -> canManageOwnProfile(profile, targetProfileId)
//
//   storage.objects (bucket `legal-drafts`):
//     "Authenticated upload" / "Authenticated read" .... authenticated
//       -> covered by requireAuth on the /api/drafts routes that hand out
//          presigned S3 URLs; the meaningful gate is still "Upload drafts"
//          above, since only Legal can create the drafts row a file
//          attaches to.

export function canManageAgreements(profile) {
  return profile.role === 'legal';
}

export function canManageDrafts(profile) {
  return profile.role === 'legal';
}

export function canUpdateTeamStatus(profile, teamCode) {
  return profile.team_code === teamCode || profile.role === 'legal';
}

export function canManageOwnProfile(profile, targetProfileId) {
  return profile.id === targetProfileId;
}

// Express middleware wrapping the checks above, for routes that gate the
// entire handler on one of them (most do).
export function requireLegal(req, res, next) {
  if (!canManageAgreements(req.profile)) {
    return res.status(403).json({ error: 'Only Legal can perform this action' });
  }
  next();
}

export function requireDraftUploadPermission(req, res, next) {
  if (!canManageDrafts(req.profile)) {
    return res.status(403).json({ error: 'Only Legal can upload drafts' });
  }
  next();
}

// Stage engine (Legal Panel Tool spec v4) — every stage-transition action is
// restricted to "the specific person who uploaded the agreement at task
// creation," not just anyone with role='legal'. `agreements.created_by`
// doubles as that reference. No delegate/fallback if that person is
// unavailable — explicitly out of scope per the spec.
export function isOriginalUploader(profile, agreement) {
  return agreement.created_by === profile.id;
}
