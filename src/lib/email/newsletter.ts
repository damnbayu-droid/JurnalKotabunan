import { Resend } from 'resend'
import { renderEmailLayout } from '@/lib/email/resend'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'

let client: Resend | null = null
function getClient(): Resend {
    if (!client) {
        const apiKey = process.env.RESEND_API_KEY
        if (!apiKey) throw new Error('RESEND_API_KEY is not set')
        client = new Resend(apiKey)
    }
    return client
}

function fromHeader(): string {
    const fromName = process.env.RESEND_FROM_NAME || 'Jurnal Kotabunan'
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'info@jurnal.kotabunan.com'
    return `${fromName} <${fromEmail}>`
}

function unsubscribeFooter(subscriberId: string): string {
    const url = `${SITE_URL}/unsubscribe?id=${subscriberId}`
    return `<p style="margin:16px 0 0;font-size:11px;color:#a1a1aa;">
      Tidak ingin menerima email ini lagi? <a href="${url}" style="color:#a1a1aa;text-decoration:underline;">Berhenti berlangganan</a>.
    </p>`
}

/** Sent once, right after someone subscribes via the Footer form. */
export async function sendWelcomeEmail(to: string, subscriberId: string): Promise<void> {
    const html = renderEmailLayout(`
      <p style="margin:0 0 12px;font-size:18px;font-weight:bold;">Terima kasih sudah berlangganan!</p>
      <p style="margin:0;white-space:pre-wrap;">
        Kamu akan menerima email setiap kali ada berita baru dari ${SITE_NAME} - jurnalisme investigasi dari Kotabunan, Sulawesi Utara, Indonesia.
      </p>
      ${unsubscribeFooter(subscriberId)}
    `)

    const result = await getClient().emails.send({
        from: fromHeader(),
        to,
        subject: `Selamat datang di ${SITE_NAME}!`,
        html,
        text: `Terima kasih sudah berlangganan ${SITE_NAME}. Kamu akan menerima email setiap kali ada berita baru.`,
    })
    if (result.error) throw new Error(`Resend welcome email failed: ${result.error.message}`)
}

export interface DigestArticle {
    title: string
    excerpt: string
    slug: string
    category: string
}

/**
 * One digest email per subscriber, listing every article that's newly
 * published since the last successful run of the newsletter-notify cron
 * (see src/app/api/cron/newsletter-notify/route.ts). Deliberately batched
 * rather than one email per article - if the daily generator or a Smart
 * Schedule slot publishes several articles close together, a subscriber
 * gets one tidy digest instead of a burst of separate emails, and it keeps
 * total send volume far below Resend's rate limits regardless of how many
 * articles happen to publish in a given window.
 */
export async function sendDigestEmail(to: string, subscriberId: string, articles: DigestArticle[]): Promise<void> {
    const itemsHtml = articles
        .map(
            (a) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td style="padding-bottom:4px;">
            <a href="${SITE_URL}/article/${a.slug}" style="font-size:16px;font-weight:bold;color:#8b1a2e;text-decoration:none;">${a.title}</a>
          </td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#52525b;">${a.excerpt}</td>
        </tr>
      </table>`
        )
        .join('')

    const html = renderEmailLayout(`
      <p style="margin:0 0 20px;font-size:16px;font-weight:bold;">
        ${articles.length} berita baru dari ${SITE_NAME}
      </p>
      ${itemsHtml}
      ${unsubscribeFooter(subscriberId)}
    `)

    const subject =
        articles.length === 1
            ? articles[0].title
            : `${articles.length} Berita Baru dari ${SITE_NAME}`

    const result = await getClient().emails.send({
        from: fromHeader(),
        to,
        subject,
        html,
        text: articles.map((a) => `${a.title}\n${SITE_URL}/article/${a.slug}\n`).join('\n'),
    })
    if (result.error) throw new Error(`Resend digest email failed: ${result.error.message}`)
}
