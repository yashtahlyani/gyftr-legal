// server.js — GyfTR Legal Portal API
// Express backend that replaces direct Supabase calls from the browser.
// Runs on EC2 behind an ALB. Auth via AWS Cognito JWT + a profiles lookup
// (see middleware/auth.js, middleware/loadProfile.js, authz.js).

import 'dotenv/config';
import express         from 'express';
import cors            from 'cors';
import { initDb }      from './db.js';
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

const app  = express();
const PORT = process.env.PORT || 7978;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// ── Health check (no auth needed — used by the ALB target group) ───────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── AI analysis stays unauthenticated, matching the old Vercel Function
//    (api/ai-analyze.js had no auth check either — this keeps demo-mode
//    login, which has no Cognito token, able to use it against sample data). ─
app.use('/api', aiAnalyzeRoutes);

// ── Everything else under /api requires a valid Cognito token + a linked profile ─
app.use('/api', requireAuth, loadProfile);

app.use('/api/agreements', agreementsRoutes);
app.use('/api', draftsRoutes);
app.use('/api', remarksRoutes);
app.use('/api', teamStatusRoutes);
app.use('/api', clausesRoutes);
app.use('/api', remindersRoutes);
app.use('/api', profileRoutes);
app.use('/api', signDocumentRoutes);

// ── Start ──────────────────────────────────────────────────────────────────
async function start() {
  await initDb();
  app.listen(PORT, () => console.log(`[server] Listening on port ${PORT}`));
}

start().catch(err => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
