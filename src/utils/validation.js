/**
 * Checks whether a string looks like an email address: some text, an `@`,
 * and a domain containing a dot, with no whitespace. Checks the format only;
 * it does not check that the address exists.
 *
 * @param {string} email - The value to check.
 * @returns {boolean} `true` if `email` has the shape of an email address, otherwise `false`.
 */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Checks whether a value is a string with at least one non-whitespace character.
 *
 * @param {*} val - The value to check. It can be of any type.
 * @returns {boolean} `true` if `val` is a string that isn't empty or only whitespace, otherwise `false`.
 */
function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

module.exports = { validateEmail, isNonEmptyString };
