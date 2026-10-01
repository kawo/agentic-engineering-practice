const usersQueries = require('../db/queries/users');
const { sendEmail } = require('./email');
const { HttpError } = require('../utils/http-error');
const { validateEmail, isNonEmptyString } = require('../utils/validation');

function listUsers() {
  return usersQueries.findAll();
}

function getUser(id) {
  const user = usersQueries.findById(id);
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

async function createUser({ name, email }) {
  if (!name || !isNonEmptyString(name)) throw new HttpError(400, 'name is required');
  if (!email || !isNonEmptyString(email)) throw new HttpError(400, 'email is required');
  if (!validateEmail(email)) throw new HttpError(400, 'Invalid email address');

  let id;
  try {
    id = usersQueries.insert({ name, email });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      throw new HttpError(409, 'email already exists');
    }
    throw err;
  }
  const user = usersQueries.findById(id);

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Taskr!',
    body: `Hi ${user.name}, your account is ready. Start managing your tasks at taskr.io.`
  });

  return user;
}

function updateUser(id, data) {
  const existing = getUser(id);
  const name = data.name !== undefined ? data.name : existing.name;
  const email = data.email !== undefined ? data.email : existing.email;
  usersQueries.update(id, { name, email });
  return usersQueries.findById(id);
}

function deleteUser(id) {
  if (usersQueries.remove(id) === 0) throw new HttpError(404, 'User not found');
  return { deleted: true };
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
