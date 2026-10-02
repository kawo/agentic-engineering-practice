const usersQueries = require('../db/queries/users');
const { sendEmail } = require('./email');
const { HttpError } = require('../utils/http-error');
const { validateEmail, isNonEmptyString } = require('../utils/validation');

/**
 * @description Lists every user, newest first.
 * @returns {Object[]} The users.
 */
function listUsers() {
  return usersQueries.findAll();
}

/**
 * @description Gets a user by ID.
 * @param {number} id - The ID of the user.
 * @returns {Object} The user. Throws `HttpError` 404 if the user does not exist.
 */
function getUser(id) {
  const user = usersQueries.findById(id);
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

/**
 * @description Validates and creates a user, then sends them a welcome email.
 * @param {Object} data - The request body.
 * @param {string} data.name - The name of the user, which must not be empty.
 * @param {string} data.email - A valid email address that no other user has.
 * @returns {Promise<Object>} Resolves with the new user. Rejects with `HttpError` 400 if the input is invalid, or 409 if the email is taken.
 */
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

/**
 * @description Updates the fields given in `data` and keeps the others.
 * @param {number} id - The ID of the user.
 * @param {Object} data - The fields to change: `name`, `email` or both.
 * @returns {Object} The updated user. Throws `HttpError` 404 if the user does not exist.
 */
function updateUser(id, data) {
  const existing = getUser(id);
  const name = data.name !== undefined ? data.name : existing.name;
  const email = data.email !== undefined ? data.email : existing.email;
  usersQueries.update(id, { name, email });
  return usersQueries.findById(id);
}

/**
 * @description Deletes a user.
 * @param {number} id - The ID of the user.
 * @returns {{deleted: boolean}} `{ deleted: true }`. Throws `HttpError` 404 if the user does not exist.
 */
function deleteUser(id) {
  if (usersQueries.remove(id) === 0) throw new HttpError(404, 'User not found');
  return { deleted: true };
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
