const googleClient = require('../lib/googleOAuthClient');
const { findUserByGoogleId, findUserByEmail, setGoogleId } = require('../db/users');

class EmailNotVerified extends Error {
  constructor(message) {
    super(message);
    this.name = 'EmailNotVerified';
  }
}

class NotAMember extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotAMember';
  }
}

// SPEC.md, account linking: one person is one row in users.
// The club registers members first; Google only signs in a row that already exists (AC-28).
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
  throw new NotAMember('This Google account is not a club member.');
}

function startGoogleLogin() {
  return googleClient.createLoginRequest();
}

async function finishGoogleLogin(code, codeVerifier) {
  const profile = await googleClient.fetchGoogleProfile(code, codeVerifier);
  return signInWithGoogle(profile);
}

module.exports = { signInWithGoogle, startGoogleLogin, finishGoogleLogin, EmailNotVerified, NotAMember };