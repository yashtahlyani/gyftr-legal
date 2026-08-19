// server.js — GyfTR Legal Portal API
// Express backend that replaces direct Supabase calls from the browser.
// Runs on EC2 behind an ALB. Auth via AWS Cognito JWT + a profiles lookup
// (see middleware/auth.js, middleware/loadProfile.js, authz.js).

import 'dotenv/config';
import express         from 'express';
import cors            from 'cors';
import { initDbWithRetry, isDbReady, dbLastError, query } from './db.js';
import { requireAuth } from './middleware/auth.js';
import { loadProfile } from './middleware/loadProfile.js';

import agreementsRoutes  from './routes/agreements.js';
import draftsRoutes       from './routes/drafts.js';
import remarksRoutes      from './routes/remarks.js';
import teamStatusRoutes   from './routes/team-status.js';
import clausesRoutes      from './routes/clauses.js';
import remindersRoutes    from './routes/reminders.js';
import profileRoutes      from './routes/profile.js';
import aiAnalyzeRoutes    from './routes/ai-analyze.js';
import signDocumentRoutes from './routes/sign-document.js';
import stageRoutes        from './routes/stage.js';

const app  = express();
const PORT = process.env.PORT || 7978;

// ── Middleware ─────────────────────────────────────────────────────────────
// Explicit origin allowlist — never '*'. The previous default of '*' both
// defeated the point and is invalid alongside credentials: true anyway.
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV === 'production' ? [] : [
    'http://localhost:7979',
    'http://localhost:5173',
    'http://localhost:4173',
  ]),
].filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} is not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// ── Health check (no auth needed — used by the ALB target group) ───────────
// Liveness — is the process up? This is what the ALB target group polls.
// Deliberately does NOT touch the database: a brief RDS blip would otherwise
// deregister every instance at once and turn a degraded service into a total
// outage.
app.get('/health', (_req, res) => res.json({ ok: true, service: 'gyftr-legal-api' }));

// Readiness — can it actually serve? Verifies the database round-trips.
// `/health` returning ok while every request 500s is the failure mode that
// keeps costing us time: pm2 says online, the ALB says healthy, and the portal
// is dead. Use this one when diagnosing, and from scripts/smoke-test.js.
app.get('/health/deep', async (_req, res) => {
  const started = Date.now();
  if (!isDbReady()) {
    return res.status(503).json({
      ok: false,
      database: 'not ready',
      error: dbLastError() || 'still connecting',
      hint: 'The API is running but cannot reach RDS. Check the DB_* / AWS_SECRET_NAME values and the RDS security group.',
    });
  }
  try {
    await query('select 1');
    res.json({ ok: true, database: 'reachable', latencyMs: Date.now() - started });
  } catch (err) {
    console.error('[health/deep] database unreachable:', err.message);
    res.status(503).json({
      ok: false,
      database: 'unreachable',
      error: err.message,
      latencyMs: Date.now() - started,
    });
  }
});

// Without the database there is nothing to serve. Say so in a way somebody can
// act on, rather than letting requests fail with an opaque error.
app.use('/api', (req, res, next) => {
  if (isDbReady()) return next();
  res.status(503).json({
    error: 'The portal is starting up or cannot reach its database. ' +
           (dbLastError() || 'Retrying.') +
           ' Check GET /health/deep for the current status.',
  });
});

// ── Everything under /api requires a valid Cognito token + a linked profile ─
//
// /api/ai-analyze used to be mounted ABOVE this line, unauthenticated, so that
// demo mode could reach it. That was survivable only while the caller supplied
// their own OpenAI key. The key is now server-side, so an open endpoint means
// anyone on the internet can spend GyFTR's OpenAI credits. Demo mode losing AI
// analysis is the correct trade.
app.use('/api', requireAuth, loadProfile);

app.use('/api', aiAnalyzeRoutes);
app.use('/api/agreements', agreementsRoutes);
app.use('/api', draftsRoutes);
app.use('/api', remarksRoutes);
app.use('/api', teamStatusRoutes);
app.use('/api', clausesRoutes);
app.use('/api', remindersRoutes);
app.use('/api', profileRoutes);
app.use('/api', signDocumentRoutes);
app.use('/api', stageRoutes);

// ── Start ──────────────────────────────────────────────────────────────────
// Listen FIRST, connect second. If the database is unreachable the API still
// answers /health (so the load balancer keeps a target and the box stays
// reachable) and /health/deep reports exactly why. Previously this awaited
// initDb() and exited on failure, so an RDS problem crash-looped the container
// and the ALB returned a bare 503 with nothing to diagnose.
app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
  initDbWithRetry().catch(err => {
    console.error('[server] Database retry loop stopped unexpectedly:', err);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('[server] Unhandled rejection:', err);
});
