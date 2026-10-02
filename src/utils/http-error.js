/**
 * @description An error that carries the HTTP status the error handler should respond with.
 * Services throw it for client errors, and the error handler sends
 * `{ error: message }` with `status`.
 * @extends Error
 */
class HttpError extends Error {
  /**
   * @description Creates an error with an HTTP status.
   * @param {number} status - The HTTP status code to respond with, such as 400 or 404.
   * @param {string} message - The error message sent to the client as `error`.
   */
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

module.exports = { HttpError };
