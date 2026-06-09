import './env.js'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.FROM_EMAIL || 'Reminder App <onboarding@resend.dev>'

// Falls back to console.log when RESEND_API_KEY is not configured.
export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log(`[email] No RESEND_API_KEY — would send to ${to}:\n  Subject: ${subject}\n  Body: ${html.replace(/<[^>]+>/g, ' ').trim().slice(0, 200)}`)
    return { ok: true, fallback: true }
  }
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) throw new Error(error.message)
    return { ok: true, id: data?.id }
  } catch (err) {
    console.error('[email] send failed:', err.message)
    return { ok: false, error: err.message }
  }
}

export function resetPasswordEmail(name, resetUrl) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
      <h2 style="margin:0 0 8px">Reset your password</h2>
      <p style="color:#555;margin:0 0 24px">Hi ${name || 'there'}, click the button below to choose a new password. The link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a>
      <p style="color:#999;font-size:13px;margin:24px 0 0">If you didn't request this, you can safely ignore it.</p>
      <p style="color:#bbb;font-size:12px;margin:4px 0 0">Or copy this link: <a href="${resetUrl}" style="color:#7c3aed">${resetUrl}</a></p>
    </div>`
}

export function digestEmail(name, dueItems, overdueItems) {
  const row = (r) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">
        <strong style="font-size:14px">${r.title}</strong>
        ${r.datetime ? `<span style="color:#888;font-size:12px;margin-left:8px">${new Date(r.datetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>` : ''}
      </td>
    </tr>`

  const section = (label, items) => items.length ? `
    <h3 style="margin:20px 0 8px;font-size:14px;color:#555;text-transform:uppercase;letter-spacing:.5px">${label}</h3>
    <table style="width:100%;border-collapse:collapse">${items.map(row).join('')}</table>` : ''

  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
      <h2 style="margin:0 0 4px">Good morning${name ? `, ${name.split(' ')[0]}` : ''} 👋</h2>
      <p style="color:#555;margin:0 0 20px">Here's what's on your plate today.</p>
      ${section('Overdue', overdueItems)}
      ${section('Due today', dueItems)}
      <p style="margin:28px 0 0"><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="color:#7c3aed;font-weight:600">Open Reminder →</a></p>
    </div>`
}
