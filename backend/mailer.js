// ---------------------------------------------------------------------------
// Sending verification emails.
//
// Configure SMTP in your .env file:
//     SMTP_HOST=smtp.gmail.com
//     SMTP_PORT=587
//     SMTP_USER=you@gmail.com
//     SMTP_PASS=your-app-password
//     MAIL_FROM="LegalDraft.pk <you@gmail.com>"
//     PUBLIC_URL=https://legaldraft.pk        (used to build reset links)
//
// For Gmail you must use an App Password, not your normal password.
//
// IF SMTP IS NOT CONFIGURED the code or link is printed to the backend console instead
// of being emailed. That lets you develop and test the whole signup flow before
// setting up an email provider — just copy it from the terminal.
// ---------------------------------------------------------------------------

let nodemailer = null
try {
  nodemailer = require('nodemailer')
} catch (e) {
  // Package not installed — we fall back to console output.
}

const FROM = process.env.MAIL_FROM || 'LegalDraft.pk <no-reply@legaldraft.pk>'
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:5173'

function smtpConfigured() {
  return Boolean(nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

let transporter = null
function getTransporter() {
  if (!smtpConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return transporter
}

// Account names are typed by whoever signs up, so they never go into HTML raw.
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// No name here: anyone can sign up with someone else's address, so this email
// can reach a stranger and must not carry text chosen by the person signing up.
function verificationHtml(code, freeCredits, minutes) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f7f9fc;font-family:Segoe UI,Arial,sans-serif;color:#0f1c2e;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e8ef;border-radius:14px;padding:32px;">
    <div style="font-size:20px;font-weight:800;margin-bottom:24px;">
      LegalDraft<span style="color:#b8873b;">.pk</span>
    </div>
    <p style="margin:0 0 14px;">Assalam-o-Alaikum,</p>
    <p style="margin:0 0 20px;line-height:1.6;color:#4a5a70;">
      Enter this code on LegalDraft.pk to activate your account.
      ${freeCredits ? `Once confirmed, <strong>${freeCredits} free credits</strong> will be added to your account.` : ''}
    </p>
    <p style="margin:0 0 26px;font-size:32px;font-weight:800;letter-spacing:8px;">${code}</p>
    <p style="margin:0;font-size:12px;color:#718096;border-top:1px solid #eef2f7;padding-top:16px;">
      This code expires in ${minutes} minutes. Never share it with anyone. If you did not create
      this account, you can ignore this email.
    </p>
  </div>
</body></html>`
}

async function sendVerificationEmail(to, code, freeCredits, minutes) {
  const tx = getTransporter()

  if (!tx) {
    // Development fallback — no SMTP configured.
    console.log('\n' + '='.repeat(72))
    console.log('  EMAIL NOT CONFIGURED — verification code for', to)
    console.log('  ' + code)
    console.log('  (Set SMTP_* in .env to send real emails)')
    console.log('='.repeat(72) + '\n')
    return { ok: true, delivered: false, code }
  }

  try {
    await tx.sendMail({
      from: FROM,
      to,
      subject: `${code} is your LegalDraft.pk verification code`,
      html: verificationHtml(code, freeCredits, minutes),
      text: `Your LegalDraft.pk verification code is ${code}\n\nThis code expires in ${minutes} minutes. Never share it with anyone.`,
    })
    return { ok: true, delivered: true }
  } catch (err) {
    console.error('Could not send verification email:', err.message)
    return { ok: false, error: 'Could not send the verification email. Please try again shortly.' }
  }
}

function resetUrl(token) {
  return `${PUBLIC_URL.replace(/\/$/, '')}/#/reset?token=${encodeURIComponent(token)}`
}

function resetHtml(name, link) {
  const greeting = name ? `Assalam-o-Alaikum ${escapeHtml(name)},` : 'Assalam-o-Alaikum,'
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f7f9fc;font-family:Segoe UI,Arial,sans-serif;color:#0f1c2e;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e8ef;border-radius:14px;padding:32px;">
    <div style="font-size:20px;font-weight:800;margin-bottom:24px;">
      LegalDraft<span style="color:#b8873b;">.pk</span>
    </div>
    <p style="margin:0 0 14px;">${greeting}</p>
    <p style="margin:0 0 20px;line-height:1.6;color:#4a5a70;">
      We received a request to reset the password on your LegalDraft.pk account.
      Use the button below to choose a new one.
    </p>
    <p style="margin:0 0 26px;">
      <a href="${link}" style="display:inline-block;background:#0f1c2e;color:#fff;text-decoration:none;padding:13px 26px;border-radius:9px;font-weight:600;">
        Set a new password
      </a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#718096;">Or paste this link into your browser:</p>
    <p style="margin:0 0 24px;font-size:12px;color:#1a4f8a;word-break:break-all;">${link}</p>
    <p style="margin:0;font-size:12px;color:#718096;border-top:1px solid #eef2f7;padding-top:16px;">
      This link expires in 2 hours. If you did not request a password reset you can ignore this
      email — your password will not change.
    </p>
  </div>
</body></html>`
}

async function sendPasswordResetEmail(to, token, name) {
  const link = resetUrl(token)
  const tx = getTransporter()

  if (!tx) {
    console.log('\n' + '='.repeat(72))
    console.log('  EMAIL NOT CONFIGURED — password reset link for', to)
    console.log('  ' + link)
    console.log('='.repeat(72) + '\n')
    return { ok: true, delivered: false, link }
  }

  try {
    await tx.sendMail({
      from: FROM,
      to,
      subject: 'Reset your password — LegalDraft.pk',
      html: resetHtml(name, link),
      text: `Use this link to set a new password:\n\n${link}\n\nThis link expires in 2 hours.`,
    })
    return { ok: true, delivered: true }
  } catch (err) {
    console.error('Could not send reset email:', err.message)
    return { ok: false, error: 'Could not send the reset email. Please try again shortly.' }
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  resetHtml,
  smtpConfigured,
  resetUrl,
}