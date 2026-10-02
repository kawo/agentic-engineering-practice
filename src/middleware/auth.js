// TODO: replace with real JWT validation

/**
 * @description Lets the request through only if its `x-api-key` header matches `API_KEY` (default `dev-key`), otherwise responds 401.
 * @param {import('express').Request} req - The incoming request.
 * @param {import('express').Response} res - The response, used to send the 401.
 * @param {import('express').NextFunction} next - Calls the next handler.
 * @returns {void} Nothing.
 */
function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey === (process.env.API_KEY || 'dev-key')) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { authenticate };
