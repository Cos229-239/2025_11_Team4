/**
 * Lightweight email service stub
 * In production, wire to a real provider (SMTP/SendGrid/Postmark).
 * For development, logs emails to the console.
 */

require('dotenv').config();

const SEND_EMAILS = (process.env.SEND_EMAILS || 'false').toLowerCase() === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@ordereasy.local';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const SMTP_SECURE = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter = null;
if (SEND_EMAILS && SMTP_HOST) {
  try {
    // Lazy require nodemailer so dev envs without it can still run
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT || (SMTP_SECURE ? 465 : 587),
      secure: SMTP_SECURE,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    // Optional: verify connection config in background
    transporter.verify().then(() => {
      console.log('[EmailService] SMTP transport ready');
    }).catch(err => {
      console.warn('[EmailService] SMTP verify failed:', err.message);
    });
  } catch (e) {
    console.warn('[EmailService] Nodemailer not installed or failed to init:', e.message);
  }
}

async function sendEmail({ to, subject, html, text, from, attachments }) {
  if (!to) return { ok: false, error: 'Missing recipient' };
  const mail = {
    from: from || EMAIL_FROM,
    to,
    subject: subject || '(no subject)',
    text: text || undefined,
    html: html || undefined,
  };

  // If SEND_EMAILS + transporter, attempt real send; otherwise log
  if (SEND_EMAILS && transporter) {
    try {
      const info = await transporter.sendMail({ ...mail, attachments });
      console.log('[EmailService] Sent:', info.messageId);
      return { ok: true, id: info.messageId };
    } catch (err) {
      console.warn('[EmailService] SMTP send failed; falling back to log:', err.message);
      // fall through to logging
    }
  } else if (SEND_EMAILS && !transporter) {
    console.warn('[EmailService] SEND_EMAILS=true but SMTP not configured; logging email instead');
  }

  // Log fallback (dev safe)
  console.log('\n=== EMAIL OUT (LOGGED) ===');
  console.log('From:   ', mail.from);
  console.log('To:     ', mail.to);
  console.log('Subject:', mail.subject);
  if (mail.text) console.log('\n' + mail.text);
  if (mail.html) console.log('\n[HTML]\n' + mail.html);
  if (attachments?.length) console.log(`\n[ATTACHMENTS] ${attachments.map(a => a.filename || 'attachment').join(', ')}`);
  console.log('=== END EMAIL ===\n');
  return { ok: true, logged: true };
}

module.exports = { sendEmail };
