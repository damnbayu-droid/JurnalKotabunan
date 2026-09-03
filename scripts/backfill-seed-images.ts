/**
 * Fill in featuredImageUrl for every article that has none (the historical
 * seed inserts them image-less on purpose).
 *
 * Rotates the image ENGINE and MODEL per article so no two consecutive
 * photos share a look:
 *   Cloudflare Workers AI: SDXL-base, DreamShaper, FLUX-schnell, SDXL-lightning
 *   Pollinations:          model=flux, model=turbo   (free, no key)
 *   fallback:              Pollinations default -> LoremFlickr
 *
 * The prompt is the deterministic buildImagePrompt() from image-service.ts,
 * which itself rotates 10 category visual-concepts x composition x lighting.
 * No NSFW vision gate here (needs a Gemini key this project doesn't have) -
 * every prompt carries the SAFE_CONTENT_CLAUSE and the generators used
 * (SDXL / FLUX) are far tamer than raw Pollinations; the seed's subjects
 * (government, mining, environment, ports) carry negligible NSFW risk.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backfill-seed-images.ts            # dry run
 *   npx tsx --env-file=.env scripts/backfill-seed-images.ts --write
 *   npx tsx --env-file=.env scripts/backfill-seed-images.ts --write --limit 5
 */

import { db } from '@/lib/db'
import { buildImagePrompt, persistImage } from '@/lib/images/image-service'
import { generateCloudflareImage, cloudflareImageConfigured, CF_IMAGE_MODELS } from '@/lib/images/cloudflare-image'

const ARGV = process.argv.slice(2)
const WRITE = ARGV.includes('--write')
// --reconvert: don't generate new images; re-encode existing non-.webp
// featured images to WebP via persistImage() and swap the URL.
const RECONVERT = ARGV.includes('--reconvert')
const LIMIT = Number((ARGV.find((a) => a.startsWith('--limit='))?.split('=')[1]) || (ARGV.includes('--limit') ? ARGV[ARGV.indexOf('--limit') + 1] : 0)) || 0

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const MIN_BYTES = 5000

function rnd(): number { return Math.floor(Math.random() * 1e6) }

async function fetchImage(url: string, timeoutMs = 60_000): Promise<{ buffer: Buffer; contentType: string } | null> {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), timeoutMs)
    try {
        const res = await fetch(url, { signal: c.signal, redirect: 'follow', headers: { 'User-Agent': BROWSER_UA, Accept: 'image/*' } })
        if (!res.ok) return null
        const ct = res.headers.get('content-type') || ''
        if (!ct.startsWith('image/')) return null
        const buffer = Buffer.from(await res.arrayBuffer())
        return buffer.length >= MIN_BYTES ? { buffer, contentType: ct } : null
    } catch { return null } finally { clearTimeout(t) }
}

function pollinationsUrl(prompt: string, model?: string): string {
    const q = new URLSearchParams({ width: '1200', height: '800', nologo: 'true', seed: String(rnd()) })
    if (model) q.set('model', model)
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 1500))}?${q}`
}

// Rotation slots. Index into this per article; each is a distinct look.
type Slot =
    | { kind: 'cf'; model: (typeof CF_IMAGE_MODELS)[number] }
    | { kind: 'pollinations'; model: string }

const SLOTS: Slot[] = [
    { kind: 'cf', model: '@cf/stabilityai/stable-diffusion-xl-base-1.0' },
    { kind: 'pollinations', model: 'flux' },
    { kind: 'cf', model: '@cf/lykon/dreamshaper-8-lcm' },
    { kind: 'pollinations', model: 'turbo' },
    { kind: 'cf', model: '@cf/black-forest-labs/flux-1-schnell' },
    { kind: 'cf', model: '@cf/bytedance/stable-diffusion-xl-lightning' },
]

async function generateFor(prompt: string, cleanTitle: string, slotIdx: number): Promise<{ img: { buffer: Buffer; contentType: string }; source: string } | null> {
    const slot = SLOTS[slotIdx % SLOTS.length]

    if (slot.kind === 'cf' && cloudflareImageConfigured()) {
        const img = await generateCloudflareImage(prompt, slot.model)
        if (img) return { img, source: `Cloudflare Workers AI (${slot.model.split('/').pop()})` }
    }
    if (slot.kind === 'pollinations') {
        const img = await fetchImage(pollinationsUrl(prompt, slot.model))
        if (img) return { img, source: `Pollinations (${slot.model})` }
    }

    // Fallbacks, in order, whatever the slot was.
    for (const [url, source] of [
        [pollinationsUrl(prompt), 'Pollinations'],
        [pollinationsUrl(`kotabunan north sulawesi news, ${cleanTitle}`), 'Pollinations'],
        [`https://loremflickr.com/1200/800/${encodeURIComponent(cleanTitle.split(/\s+/).slice(0, 2).join(','))}?lock=${rnd()}`, 'LoremFlickr'],
    ] as [string, string][]) {
        const img = await fetchImage(url)
        if (img) return { img, source }
    }
    return null
}

async function reconvert() {
    const rows = await db.article.findMany({
        where: { featuredImageUrl: { not: null } },
        select: { id: true, title: true, slug: true, featuredImageUrl: true },
        orderBy: { publishedAt: 'asc' },
        ...(LIMIT ? { take: LIMIT } : {}),
    })
    const stale = rows.filter((r) => r.featuredImageUrl && !r.featuredImageUrl.endsWith('.webp'))
    console.log(`${rows.length} with image, ${stale.length} not yet .webp.`)
    if (!WRITE) { console.log('DRY RUN - pass --write.'); return }

    let done = 0, failed = 0
    for (const [i, a] of stale.entries()) {
        try {
            const img = await fetchImage(a.featuredImageUrl!)
            if (!img) throw new Error('could not download current image')
            const url = await persistImage(img.buffer, img.contentType, a.slug || a.title)
            await db.article.update({ where: { id: a.id }, data: { featuredImageUrl: url } })
            done++
            console.log(`[${i + 1}/${stale.length}] ✅ ${a.title.slice(0, 64)}`)
        } catch (err) {
            failed++
            console.error(`[${i + 1}/${stale.length}] ❌ ${a.title.slice(0, 64)} :: ${(err as Error).message.slice(0, 140)}`)
        }
    }
    console.log(`\nDONE. reconverted=${done} failed=${failed}`)
}

async function main() {
    if (RECONVERT) return reconvert()
    const where = { featuredImageUrl: null }
    const total = await db.article.count({ where })
    let articles = await db.article.findMany({
        where,
        select: { id: true, title: true, slug: true, category: true, excerpt: true },
        orderBy: { publishedAt: 'asc' },
        ...(LIMIT ? { take: LIMIT } : {}),
    })

    console.log(`${total} article(s) without an image; processing ${articles.length}.`)
    console.log(`Cloudflare Workers AI: ${cloudflareImageConfigured() ? 'configured' : 'NOT configured (Pollinations only)'}`)
    if (!WRITE) {
        console.log('\nDRY RUN. First few prompts:')
        articles.slice(0, 5).forEach((a, i) => {
            console.log(`  [${SLOTS[i % SLOTS.length].kind}:${SLOTS[i % SLOTS.length].model}]`)
            console.log(`   ${buildImagePrompt(a.title, a.category, a.excerpt).slice(0, 160)}...`)
        })
        console.log('\nRun with --write to generate + attach.')
        return
    }

    let done = 0, failed = 0
    for (const [i, a] of articles.entries()) {
        try {
            const prompt = buildImagePrompt(a.title, a.category, a.excerpt)
            const cleanTitle = a.title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
            const gen = await generateFor(prompt, cleanTitle, i)
            if (!gen) throw new Error('all image sources failed')

            const url = await persistImage(gen.img.buffer, gen.img.contentType, a.slug || cleanTitle)
            await db.article.update({
                where: { id: a.id },
                data: { featuredImageUrl: url, featuredImageAlt: a.title.slice(0, 200), imageSource: gen.source },
            })
            done++
            console.log(`[${i + 1}/${articles.length}] ✅ [${a.category}] ${gen.source} :: ${a.title.slice(0, 64)}`)
        } catch (err) {
            failed++
            console.error(`[${i + 1}/${articles.length}] ❌ ${a.title.slice(0, 64)} :: ${(err as Error).message.slice(0, 140)}`)
        }
    }
    console.log(`\nDONE. attached=${done} failed=${failed}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
