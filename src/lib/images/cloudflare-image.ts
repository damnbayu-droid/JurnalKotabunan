// Cloudflare Workers AI text-to-image. Free tier (~10k "neurons"/day), four
// visually distinct models - rotated so a batch of article photos doesn't
// all share one model's "look".
//
//   @cf/stabilityai/stable-diffusion-xl-base-1.0   full SDXL, richest detail
//   @cf/bytedance/stable-diffusion-xl-lightning    fast SDXL, flatter
//   @cf/lykon/dreamshaper-8-lcm                    painterly / stylised
//   @cf/black-forest-labs/flux-1-schnell           FLUX, different aesthetic
//
// Auth: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (token needs the
// "Workers AI" permission). SDXL models return a raw image/png body; FLUX
// returns JSON { result: { image: <base64> } }.

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

export const CF_IMAGE_MODELS = [
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    '@cf/lykon/dreamshaper-8-lcm',
    '@cf/black-forest-labs/flux-1-schnell',
    '@cf/bytedance/stable-diffusion-xl-lightning',
] as const

export type CfImageModel = (typeof CF_IMAGE_MODELS)[number]

export function cloudflareImageConfigured(): boolean {
    return !!ACCOUNT_ID && !!API_TOKEN
}

/** Generates one image. Returns PNG bytes, or null on any failure. */
export async function generateCloudflareImage(
    prompt: string,
    model: CfImageModel,
    timeoutMs = 60_000,
): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!cloudflareImageConfigured()) return null

    const isFlux = model.includes('flux')
    const body = isFlux
        ? { prompt: prompt.slice(0, 2048), steps: 6 }
        : { prompt: prompt.slice(0, 2048), width: 1024, height: 768, num_steps: 20 }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${model}`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            },
        )
        if (!res.ok) {
            console.warn(`[cf-image] ${model} -> HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`)
            return null
        }

        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
            const j = await res.json()
            const b64: string | undefined = j?.result?.image
            if (!b64) return null
            return { buffer: Buffer.from(b64, 'base64'), contentType: 'image/png' }
        }
        const buffer = Buffer.from(await res.arrayBuffer())
        if (buffer.length < 5000) return null
        return { buffer, contentType: contentType.startsWith('image/') ? contentType : 'image/png' }
    } catch (err) {
        console.warn(`[cf-image] ${model} threw: ${(err as Error).message}`)
        return null
    } finally {
        clearTimeout(timer)
    }
}
