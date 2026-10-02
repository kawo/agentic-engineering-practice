// TODO: process webhook payload
/**
 * @description Acknowledges a task-update webhook by logging its payload (stub).
 * @param {*} payload - The webhook request body.
 * @returns {{received: boolean}} `{ received: true }`.
 */
function handleTaskUpdate(payload) {
  console.log('[WEBHOOK] Received:', payload);
  return { received: true };
}

module.exports = { handleTaskUpdate };
