/**
 * @description Checks whether a string has the shape of an email address.
 * @param {string} email - The value to check: it must be some text, an `@` and a domain
 *   containing a dot, with no whitespace. Only the format is checked, not that the address exists.
 * @returns {boolean} `true` if `email` has the shape of an email address, otherwise `false`.
 */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * @description Checks whether a value is a string with at least one non-whitespace character.
 * @param {*} val - The value to check. It can be of any type.
 * @returns {boolean} `true` if `val` is a string that isn't empty or only whitespace, otherwise `false`.
 */
function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

module.exports = { validateEmail, isNonEmptyString };
