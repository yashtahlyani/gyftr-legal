// middleware/auth.js — validates the Cognito JWT on every protected request.
// Same pattern as the gyftr-portal sibling migration.

import { CognitoJwtVerifier } from 'aws-jwt-verify';

const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId   = process.env.COGNITO_CLIENT_ID;

if (!userPoolId || !clientId) {
  console.error(
    '[auth] Missing COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID — set both on the container.'
  );
  process.exit(1);
}

const verifier = CognitoJwtVerifier.create({
  userPoolId,
  tokenUse: 'id',
  clientId,
});

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = await verifier.verify(token);
    req.user = {
      sub: payload.sub,
      email: payload.email,
      // Google-federated tokens carry this as a real boolean; be liberal
      // about the shape since it's the gate loadProfile.js uses before
      // trusting `email` enough to auto-link an account to it.
      email_verified: payload.email_verified === true || payload.email_verified === 'true',
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
