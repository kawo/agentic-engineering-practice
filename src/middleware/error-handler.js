/**
 * @description Turns any thrown error into a JSON `{ error }` response with its status, or 500 (logged) if it has none.
 * @param {Error} err - The error; its optional `status` property is the HTTP status to send.
 * @param {import('express').Request} req - The request that failed.
 * @param {import('express').Response} res - The response to send the error on.
 * @param {import('express').NextFunction} next - Unused, but Express needs four parameters to treat this as an error handler.
 * @returns {void} Nothing.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err.stack);
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { errorHandler };
