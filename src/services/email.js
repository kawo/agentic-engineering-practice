// TODO: replace with real email provider (SendGrid, SES, etc.)

/**
 * @description Pretends to send an email by logging it (stub).
 * @param {Object} email - The email to send.
 * @param {string} email.to - The recipient address.
 * @param {string} email.subject - The subject line.
 * @param {string} email.body - The message body (not logged).
 * @returns {Promise<{sent: boolean, to: string, subject: string}>} Resolves with `sent: true`, the recipient and the subject.
 */
function sendEmail({ to, subject, body }) {
  console.log('[EMAIL] Sending to:', to, '| Subject:', subject);
  return Promise.resolve({ sent: true, to, subject });
}

module.exports = { sendEmail };
