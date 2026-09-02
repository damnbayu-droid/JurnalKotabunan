import { Resend } from 'resend'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

// Powers the Admin Dashboard Email panel (replies to Contact Form
// submissions). No Gmail/SMTP credentials involved anywhere in this path -
// Resend sends independently via its own API key against a domain verified
// directly with Resend (jurnal.kotabunan.com - verify the domain in Resend
// before sends will succeed).

let client: Resend | null = null
function getClient(): Resend {
    if (!client) {
        const apiKey = process.env.RESEND_API_KEY
        if (!apiKey) throw new Error('RESEND_API_KEY is not set')
        client = new Resend(apiKey)
    }
    return client
}

const BRAND_COLOR = '#8b1a2e' // matches theme_color in src/app/manifest.ts
const LOGO_URL = `${SITE_URL}/icon-512.png`

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

/**
 * Shared branded shell for every outbound email (reply, and any future
 * transactional email that reuses this) - table-based layout with inline
 * styles throughout, not flexbox/grid or a <style> block, because email
 * clients (Outlook in particular) have very inconsistent CSS support and
 * table+inline-style is the one layout approach that reliably renders the
 * same everywhere. Logo has an alt fallback (site name text) for
 * clients that block images by default (most webmail, until the recipient
 * clicks "show images") - the header still identifies the sender even then.
 */
export function renderEmailLayout(bodyHtml: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="${LOGO_URL}" width="40" height="40" alt="${SITE_NAME}" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:20px;font-weight:bold;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">${SITE_NAME}</span><br />
                    <span style="font-size:11px;color:#f0d9de;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.5px;">INVESTIGATIVE JOURNALISM</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#18181b;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f4f4f5;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
              <p style="margin:0 0 4px;font-size:12px;color:#71717a;font-family:Arial,Helvetica,sans-serif;">
                Dikirim oleh tim <strong>${SITE_NAME}</strong>
              </p>
              <p style="margin:0;font-size:11px;color:#a1a1aa;font-family:Arial,Helvetica,sans-serif;">
                <a href="${SITE_URL}" style="color:#a1a1aa;text-decoration:underline;">${SITE_URL.replace('https://', '')}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

export interface SendReplyInput {
    to: string
    subject: string
    /** Plain text - wrapped in the branded HTML template below. */
    message: string
    /** The original message being replied to, quoted for context. */
    originalMessage?: string
    originalSubject?: string
}

export async function sendContactReply({ to, subject, message, originalMessage, originalSubject }: SendReplyInput): Promise<void> {
    const fromName = process.env.RESEND_FROM_NAME || 'Jurnal Kotabunan'
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@jurnal.kotabunan.com'

    const bodyHtml = escapeHtml(message).replace(/\n/g, '<br />')
    const quotedHtml = originalMessage
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
             <tr>
               <td style="border-left:3px solid #e4e4e7;padding:4px 0 4px 14px;">
                 <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#71717a;font-family:Arial,Helvetica,sans-serif;">
                   Pesan asli${originalSubject ? ` &mdash; "${escapeHtml(originalSubject)}"` : ''}
                 </p>
                 <p style="margin:0;font-size:13px;color:#71717a;white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;">
                   ${escapeHtml(originalMessage).replace(/\n/g, '<br />')}
                 </p>
               </td>
             </tr>
           </table>`
        : ''

    const html = renderEmailLayout(`<p style="margin:0;white-space:pre-wrap;">${bodyHtml}</p>${quotedHtml}`)

    const result = await getClient().emails.send({
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        html,
        text: message,
    })

    if (result.error) {
        throw new Error(`Resend send failed: ${result.error.message}`)
    }
}
