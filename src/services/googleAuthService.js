const googleClient = require('../lib/googleOAuthClient');
const { findUserByGoogleId, findUserByEmail, setGoogleId, createUser } = require('../db/users');

class EmailNotVerified extends Error {
  constructor(message) {
    super(message);
    this.name = 'EmailNotVerified';
  }
}

// SPEC.md, account linking: one person is one row in users.
async function signInWithGoogle({ googleId, email, emailVerified, name }) {
  if (!emailVerified) {
    throw new EmailNotVerified('Google has not verified this email.');
  }
  const linked = await findUserByGoogleId(googleId);
  if (linked) {
    return linked;
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    return setGoogleId(existing.id, googleId);
  }
  return createUser({ email, password_hash: null, role: 'member', google_id: googleId, name: name || email });
}

function startGoogleLogin() {
  return googleClient.createLoginRequest();
}

async function finishGoogleLogin(code, codeVerifier) {
  const profile = await googleClient.fetchGoogleProfile(code, codeVerifier);
  return signInWithGoogle(profile);
}

module.exports = { signInWithGoogle, startGoogleLogin, finishGoogleLogin, EmailNotVerified };