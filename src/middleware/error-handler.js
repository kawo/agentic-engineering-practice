// Turns any error passed to next() or thrown in a handler into a JSON response.
// Errors without a status (unexpected failures) become a 500 and are logged.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err.stack);
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { errorHandler };
