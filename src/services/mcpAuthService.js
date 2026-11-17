const crypto = require('crypto');
const { setMcpTokenHash, findUserByMcpTokenHash } = require('../db/users');

async function createMcpToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await setMcpTokenHash(userId, hash);
  return token;
}

async function authenticateMcpToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await findUserByMcpTokenHash(hash);
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    role: user.role,
  };
}

module.exports = {
  createMcpToken,
  authenticateMcpToken,
};
