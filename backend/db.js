// db.js — RDS Postgres connection pool
// Credentials come from env vars, or AWS Secrets Manager if AWS_SECRET_NAME is set.
// (Pattern mirrors the gyftr-portal sibling migration — see infra/aws-setup.md.)

import pg from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';

const { Pool } = pg;
let pool;

async function getDbCredentials() {
  if (process.env.AWS_SECRET_NAME) {
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-south-1' });
    const res = await client.send(new GetSecretValueCommand({ SecretId: process.env.AWS_SECRET_NAME }));
    const secret = JSON.parse(res.SecretString);
    return {
      host:     secret.host,
      port:     secret.port || 5432,
      database: secret.dbname,
      user:     secret.username,
      password: secret.password,
    };
  }
  return {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
}

// Applies schema.sql on every boot. Every statement in that file is
// IF NOT EXISTS, so this is a no-op against an already-current database —
// deploying is just a restart, nobody has to remember to hand-run psql.
async function applySchema() {
  const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('[db] Schema applied (idempotent)');
}

export async function initDb() {
  const creds = await getDbCredentials();

  if (!creds.host || !creds.database || !creds.user || !creds.password) {
    throw new Error(
      'Database not configured. Set DB_HOST, DB_NAME, DB_USER, DB_PASSWORD ' +
      '(or AWS_SECRET_NAME for Secrets Manager).'
    );
  }

  pool = new Pool({
    ...creds,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  const client = await pool.connect();
  console.log('[db] Connected to RDS Postgres:', creds.host);
  client.release();
  await applySchema();
}

export function query(sql, params) {
  if (!pool) throw new Error('DB not initialized — call initDb() first');
  return pool.query(sql, params);
}

// A couple of routes (agreement create + default team rows, draft upload,
// remark insert + agreement touch) need multiple statements to succeed or
// fail together — the old Supabase code did these as separate best-effort
// calls; here we can use a real transaction instead.
export async function withTransaction(fn) {
  if (!pool) throw new Error('DB not initialized — call initDb() first');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
