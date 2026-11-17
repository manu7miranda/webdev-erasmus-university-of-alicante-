const crypto = require('node:crypto');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

function redirectUri() {
  return `${process.env.PUBLIC_BASE_URL}/api/auth/google/callback`;
}

// state: the callback must belong to a login this browser started.
// PKCE: only the browser that holds codeVerifier can turn the code into a token.
function createLoginRequest() {
  const state = crypto.randomBytes(16).toString('base64url');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return { url: `${AUTH_URL}?${params}`, state, codeVerifier };
}

async function fetchGoogleProfile(code, codeVerifier) {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenResponse.ok) {
    throw new Error(`Google token exchange failed with ${tokenResponse.status}`);
  }
  const { access_token: accessToken } = await tokenResponse.json();
  const profileResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!profileResponse.ok) {
    throw new Error(`Google userinfo failed with ${profileResponse.status}`);
  }
  const profile = await profileResponse.json();
  return {
    googleId: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified === true,
    name: profile.name,
  };
}

module.exports = { createLoginRequest, fetchGoogleProfile };