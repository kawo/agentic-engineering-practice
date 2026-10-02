/**
 * @description Logs the time, method and URL of each request, then passes it on.
 * @param {import('express').Request} req - The incoming request.
 * @param {import('express').Response} res - The response (unused).
 * @param {import('express').NextFunction} next - Calls the next handler.
 * @returns {void} Nothing.
 */
function requestLogger(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
}

module.exports = { requestLogger };
