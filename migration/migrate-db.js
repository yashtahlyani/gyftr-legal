/**
 * migrate-db.js — Supabase → RDS full data migration for the GyfTR Legal Portal.
 *
 * Copies every real row (agreements, drafts, team_statuses, remarks,
 * history_log, clauses, clause_changes, reminders, signatures, profiles)
 * from the live Supabase project into RDS, preserving every primary key.
 * Safe to re-run — every insert uses ON CONFLICT (id) DO NOTHING, so running
 * it twice does not duplicate or corrupt data.
 *
 * Run AFTER the RDS schema is created (backend/schema.sql — see
 * infra/aws-setup.md §1 and §8).
 *
 * Usage:
 *   cd migration && npm install
 *   node migrate-db.js
 *
 * Required env vars (set in your shell — never write these to a file that
 * could be committed):
 *   SUPABASE_URL   — e.g. https://aiaeruajrbrxkoaqzdpp.supabase.co
 *   SUPABASE_PAT   — Supabase personal access token (Account → Access Tokens)
 *   RDS_HOST       — RDS endpoint
 *   RDS_USER       — e.g. gyftr_admin
 *   RDS_PASSWORD   — RDS master password
 *   RDS_DB         — e.g. gyftr_legal
 *
 * Optional:
 *   SUPABASE_PROJECT_REF        — inferred from SUPABASE_URL if not set
 *   SUPABASE_SERVICE_ROLE_KEY   — skip the Management-API lookup if you
 *                                 already have this key
 *   RDS_PORT (default 5432)
 *   DRAFTS_BUCKET (default gyftr-legal-drafts) — the destination S3 bucket
 *     for the file-copy step (Supabase Storage `legal-drafts` -> S3).
 *     Requires AWS credentials in the environment (same as anywhere else
 *     the AWS SDK is used — e.g. `aws configure` locally, or an IAM role).
 *
 * profiles.cognito_sub is intentionally left NULL by this script — run
 * create-cognito-users.js afterwards to create each person's Cognito
 * account and link it back to their profiles row by email.
 */

import { createClient }                          from '@supabase/supabase-js';
import pg                                        from 'pg';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// ── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_REF  = process.env.SUPABASE_PROJECT_REF
  || SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const SUPABASE_PAT  = process.env.SUPABASE_PAT;

const RDS = {
  host:     process.env.RDS_HOST,
  user:     process.env.RDS_USER     || 'gyftr_admin',
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DB       || 'gyftr_legal',
  port:     parseInt(process.env.RDS_PORT || '5432'),
  ssl:      { rejectUnauthorized: false },
};

const TABLES = [
  'agreements', 'drafts', 'team_statuses', 'remarks',
  'history_log', 'clauses', 'clause_changes', 'reminders', 'signatures',
];

const DRAFTS_BUCKET = process.env.DRAFTS_BUCKET || 'gyftr-legal-drafts';
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

// ── Step 1: get the service_role key via the Supabase Management API ──────

async function getServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Using SUPABASE_SERVICE_ROLE_KEY from env');
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  if (!SUPABASE_REF) throw new Error('Could not determine SUPABASE_PROJECT_REF from SUPABASE_URL — set it explicitly');
  console.log('Fetching service_role key from Supabase Management API…');
  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${SUPABASE_PAT}` },
  });
  if (!res.ok) throw new Error(`Management API error ${res.status}: ${await res.text()}`);
  const keys = await res.json();
  const srKey = keys.find(k => k.name === 'service_role')?.api_key;
  if (!srKey) throw new Error('service_role key not found in Management API response');
  console.log('Got service_role key.');
  return srKey;
}

// ── Step 2: export profiles + every table from Supabase ───────────────────

async function exportSupabase(sb) {
  // profiles.email doesn't exist in the old Supabase `profiles` table (the
  // email lived on the linked auth.users row) — the new RDS schema needs it
  // as a real column, so pull it from the Admin Auth API and join it in.
  console.log('Fetching auth.users (for email) via Admin API…');
  const emailById = {};
  let page = 1;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    if (!data.users.length) break;
    for (const u of data.users) emailById[u.id] = u.email;
    if (data.users.length < 200) break;
    page++;
  }
  console.log(`  ${Object.keys(emailById).length} auth users found`);

  console.log('Exporting profiles…');
  const { data: profiles, error: pErr } = await sb.from('profiles').select('*');
  if (pErr) throw pErr;
  const profilesWithEmail = profiles.map(p => ({ ...p, email: emailById[p.id] || null }));
  const missingEmail = profilesWithEmail.filter(p => !p.email);
  if (missingEmail.length) {
    console.warn(`  Warning: ${missingEmail.length} profile(s) have no matching auth.users email and will be skipped:`,
      missingEmail.map(p => p.id));
  }
  console.log(`  ${profilesWithEmail.length} profiles (${profilesWithEmail.length - missingEmail.length} with email)`);

  const exported = { profiles: profilesWithEmail.filter(p => p.email) };
  for (const table of TABLES) {
    console.log(`Exporting ${table}…`);
    const { data, error } = await sb.from(table).select('*');
    if (error) {
      console.warn(`  Warning: ${table} export failed: ${error.message}`);
      exported[table] = [];
    } else {
      exported[table] = data;
      console.log(`  ${data.length} rows`);
    }
  }
  return exported;
}

// ── Step 3: copy the actual draft files from Supabase Storage to S3 ───────
// (migrating the `drafts` table rows above only copies the metadata —
// file_path just points at a Storage object key, so the bytes need copying
// too, one object at a time via download + upload.)

async function copyDraftFiles(sb, drafts) {
  const withFiles = drafts.filter(d => d.file_path);
  if (!withFiles.length) { console.log('\nNo draft files to copy.'); return; }

  console.log(`\nCopying ${withFiles.length} draft file(s) from Supabase Storage to s3://${DRAFTS_BUCKET}…`);
  let copied = 0, skipped = 0, failed = 0;

  for (const d of withFiles) {
    try {
      // Skip if it already exists in S3 (idempotent re-run)
      try {
        await s3.send(new HeadObjectCommand({ Bucket: DRAFTS_BUCKET, Key: d.file_path }));
        skipped++;
        continue;
      } catch { /* not found — proceed to copy */ }

      const { data, error } = await sb.storage.from('legal-drafts').download(d.file_path);
      if (error) throw error;
      const buffer = Buffer.from(await data.arrayBuffer());

      await s3.send(new PutObjectCommand({
        Bucket: DRAFTS_BUCKET,
        Key:    d.file_path,
        Body:   buffer,
      }));
      copied++;
    } catch (err) {
      console.warn(`  Warning: failed to copy ${d.file_path}: ${err.message}`);
      failed++;
    }
  }
  console.log(`  Copied: ${copied}  Already present: ${skipped}  Failed: ${failed}`);
}

// ── Step 4: import into RDS ────────────────────────────────────────────────

async function importRds(data) {
  if (!RDS.host || !RDS.password) {
    throw new Error('RDS_HOST and RDS_PASSWORD env vars are required');
  }

  const pool   = new pg.Pool(RDS);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log(`\nImporting ${data.profiles.length} profiles…`);
    for (const r of data.profiles) {
      await client.query(
        `insert into profiles (id, email, name, role, team_code, avatar, created_at)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do nothing`,
        [r.id, r.email, r.name, r.role, r.team_code, r.avatar, r.created_at]
      );
    }

    console.log(`Importing ${data.agreements.length} agreements…`);
    for (const r of data.agreements) {
      await client.query(
        `insert into agreements
           (id, client, tag, type, status, client_status, promise_date, start_date,
            spoc_legal, spoc_finance, spoc_business, spoc_compliance, doc_link,
            client_dates, created_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         on conflict (id) do nothing`,
        [r.id, r.client, r.tag, r.type, r.status, r.client_status, r.promise_date, r.start_date,
         r.spoc_legal, r.spoc_finance, r.spoc_business, r.spoc_compliance, r.doc_link,
         r.client_dates, r.created_by, r.created_at, r.updated_at]
      );
    }

    console.log(`Importing ${data.drafts.length} drafts…`);
    for (const r of data.drafts) {
      await client.query(
        `insert into drafts (id, agreement_id, draft_no, direction, note, file_path, file_name, date, created_by, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (id) do nothing`,
        [r.id, r.agreement_id, r.draft_no, r.direction, r.note, r.file_path, r.file_name, r.date, r.created_by, r.created_at]
      );
    }

    console.log(`Importing ${data.team_statuses.length} team statuses…`);
    for (const r of data.team_statuses) {
      await client.query(
        `insert into team_statuses (id, agreement_id, team_code, status, aging_days, updated_by, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do nothing`,
        [r.id, r.agreement_id, r.team_code, r.status, r.aging_days, r.updated_by, r.updated_at]
      );
    }

    console.log(`Importing ${data.remarks.length} remarks…`);
    for (const r of data.remarks) {
      await client.query(
        `insert into remarks (id, agreement_id, author_id, author_name, author_role, text, created_at)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do nothing`,
        [r.id, r.agreement_id, r.author_id, r.author_name, r.author_role, r.text, r.created_at]
      );
    }

    console.log(`Importing ${data.history_log.length} history log entries…`);
    for (const r of data.history_log) {
      await client.query(
        `insert into history_log (id, agreement_id, team, changed_by, from_status, to_status, created_at)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do nothing`,
        [r.id, r.agreement_id, r.team, r.changed_by, r.from_status, r.to_status, r.created_at]
      );
    }

    console.log(`Importing ${data.clauses.length} clauses…`);
    for (const r of data.clauses) {
      await client.query(
        `insert into clauses (id, agreement_id, clause_no, clause_name, outcome, full_context, created_at)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (id) do nothing`,
        [r.id, r.agreement_id, r.clause_no, r.clause_name, r.outcome, r.full_context, r.created_at]
      );
    }

    console.log(`Importing ${data.clause_changes.length} clause changes…`);
    for (const r of data.clause_changes) {
      await client.query(
        `insert into clause_changes (id, clause_id, draft_no, change_text, created_at)
         values ($1,$2,$3,$4,$5)
         on conflict (id) do nothing`,
        [r.id, r.clause_id, r.draft_no, r.change_text, r.created_at]
      );
    }

    console.log(`Importing ${data.reminders.length} reminders…`);
    for (const r of data.reminders) {
      await client.query(
        `insert into reminders (id, agreement_id, from_role, from_name, to_teams, client_name, dismissed_by, sent_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (id) do nothing`,
        [r.id, r.agreement_id, r.from_role, r.from_name, r.to_teams, r.client_name, r.dismissed_by, r.sent_at]
      );
    }

    console.log(`Importing ${data.signatures.length} signatures…`);
    for (const r of data.signatures) {
      await client.query(
        `insert into signatures (id, agreement_id, signer_name, signer_role, signer_email, adobe_envelope_id, status, signed_at, signed_file_path, created_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (id) do nothing`,
        [r.id, r.agreement_id, r.signer_name, r.signer_role, r.signer_email, r.adobe_envelope_id, r.status, r.signed_at, r.signed_file_path, r.created_at]
      );
    }

    await client.query('COMMIT');
    console.log('\nMigration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== GyfTR Legal Portal: Supabase → RDS Migration ===\n');
  if (!SUPABASE_URL || !SUPABASE_PAT) {
    console.error('Error: SUPABASE_URL and SUPABASE_PAT env vars are required.');
    console.error('Set them before running, e.g.:');
    console.error('  export SUPABASE_URL=https://aiaeruajrbrxkoaqzdpp.supabase.co');
    console.error('  export SUPABASE_PAT=<your-supabase-personal-access-token>');
    process.exit(1);
  }
  try {
    const srKey = await getServiceRoleKey();
    const sb    = createClient(SUPABASE_URL, srKey, { auth: { persistSession: false } });
    const data  = await exportSupabase(sb);
    await importRds(data);
    await copyDraftFiles(sb, data.drafts);
  } catch (err) {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  }
}

main();
