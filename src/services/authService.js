const bcrypt = require('bcryptjs');
const { findUserByEmail } = require('../db/users');

async function authenticateUser(email, password) {
  if (!email || !password) {
    return null;
  }
  const user = await findUserByEmail(email);
  if (!user || !user.password_hash) {
    return null;
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return null;
  }
  // Return user object without password_hash
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

module.exports = {
  authenticateUser,
};
