// middleware/auth.js — validates the Cognito JWT on every protected request.
// Same pattern as the gyftr-portal sibling migration.

import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse:   'id',
  clientId:   process.env.COGNITO_CLIENT_ID,
});

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = await verifier.verify(token);
    req.user = { sub: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
