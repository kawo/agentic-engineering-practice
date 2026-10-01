// TODO: process webhook payload
function handleTaskUpdate(payload) {
  console.log('[WEBHOOK] Received:', payload);
  return { received: true };
}

module.exports = { handleTaskUpdate };
