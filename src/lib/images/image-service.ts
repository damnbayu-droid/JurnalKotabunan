import { uploadImage } from '@/lib/storage/upload-image'

/**
 * Centralised image pipeline for Jurnal Kotabunan.
 *
 * Generates an image via an external generator (Pollinations -> LoremFlickr
 * fallback), VERIFIES the binary response (content-type + minimum size),
 * uploads it to persistent cloud storage (Supabase Storage, Vercel Blob
 * fallback - see src/lib/storage/upload-image.ts) and returns a STABLE
 * public url.
 *
 * Articles therefore never store fragile third-party hotlinks again —
 * once generated, the image lives in our own storage.
 *
 * NOTE: this used to write to public/uploads/articles/ on local disk. That
 * silently broke every article photo on Vercel (serverless functions have a
 * read-only filesystem at runtime, and the folder was gitignored anyway so
 * nothing written there ever reached production) - confirmed via a live
 * deploy where every image 404'd. Fixed 2026-09-01.
 */

const BROWSER_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const MIN_IMAGE_BYTES = 5000 // anything smaller is almost certainly an error page
const DOWNLOAD_TIMEOUT_MS = 45_000 // generators can legitimately be slow

export interface StoredImage {
    /** Public storage URL (Supabase Storage or Vercel Blob), or null if every source failed */
    localPath: string | null
    /** Human-readable provenance stored in Article.imageSource */
    source: string
}

function cleanPromptText(input: string, max = 60): string {
    return (
        (input || 'kotabunan news')
            .substring(0, max)
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .trim() || 'kotabunan news'
    )
}

function randomSeed(): number {
    return Math.floor(Math.random() * 1_000_000)
}

function buildPollinationsUrl(prompt: string): string {
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt
    )}?width=1200&height=800&nologo=true&seed=${randomSeed()}`
}

function extractKeywords(title: string): string {
    const ignored = ['kotabunan', 'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'will']
    const words = title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !ignored.includes(w))
    return words.slice(0, 2).join(',') || 'kotabunan,news'
}

// ---------------------------------------------------------------------------
// Prompt building - moved here from scripts/regenerate-images.ts so every
// caller (live generation AND repair scripts) shares one implementation
// instead of drifting into slightly different prompt logic.
// ---------------------------------------------------------------------------

/**
 * 10 rotating visual concepts per category (not one fixed phrase) - a single
 * fixed string per category, especially OPINION's old "person reading
 * newspaper", meant every image in that category converged on the same
 * composition regardless of which specific story it was for. Each category
 * cycles through its own 10 independently (see categoryVisualIndex below),
 * so consecutive articles in the same category don't repeat.
 */
const CATEGORY_VISUAL_CONCEPTS: Record<string, string[]> = {
    TOURISM: [
        'white-sand beach with turquoise water, surfers in the distance',
        'wooden village mosque framed by tropical foliage',
        'hillside homestay veranda overlooking coconut plantations',
        'bustling local street market with handicrafts and warungs',
        'traditional Mongondow dance performance, ornate costumes',
        'coconut plantation and forested hills at sunrise, North Sulawesi countryside',
        'seaside gathering at sunset, string lights, ocean view',
        'scooter riders navigating a scenic coastal road',
        'dive boat off the Kotabunan coastline',
        'hotel lobby with tropical architecture and greenery',
    ],
    GOVERNMENT: [
        "governor's office desk with Indonesian flag and official seal",
        'press conference podium with microphones, officials seated behind',
        'provincial parliament session, legislators in formal attire',
        'government building exterior, Indonesian architecture, flag flying',
        'official ceremony with sash-wearing dignitaries',
        'public service counter, citizens being assisted by civil servants',
        'policy signing event, officials shaking hands over documents',
        'regional meeting hall, officials seated around a long table',
        'uniformed government inspector reviewing site documents',
        'courthouse or municipal building steps, formal proceedings',
    ],
    INVESTMENT: [
        'glass-walled boardroom, executives reviewing charts',
        'modern office tower skyline against blue sky',
        'handshake between business partners closing a deal',
        'investor presentation with financial graphs on a screen',
        'construction site of a new development project',
        'co-working space with entrepreneurs collaborating',
        'bank or financial institution interior, professional setting',
        'groundbreaking ceremony with hard hats and shovels',
        'startup team working late in a modern office',
        'financial data displayed across multiple monitors',
    ],
    INCIDENTS: [
        'emergency responders at a scene, flashing lights',
        'police tape cordoning off an area, officers on scene',
        'ambulance or fire truck arriving at an incident location',
        'crowd gathered watching an unfolding emergency',
        'damaged property or vehicle after an incident',
        'investigators examining a scene, evidence markers',
        'rescue workers coordinating near water or difficult terrain',
        'hospital exterior or emergency room entrance',
        'news photographer capturing an incident aftermath',
        'community members assisting during a local emergency',
    ],
    LOCAL: [
        'traditional Mongondow community ceremony, ceremonial dress',
        'local market vendors selling fresh produce',
        'village elders in discussion under a banyan tree',
        'community gotong-royong (mutual aid) work event',
        'traditional Mongondow wooden house courtyard scene',
        'schoolchildren walking through a village lane',
        'local artisan crafting traditional goods by hand',
        'rural road lined with coconut palms and farmers',
        'village hall (balai desa) community gathering',
        'fishermen preparing boats at a local harbor',
    ],
    JOBS: [
        'job fair booth with recruiters and applicants',
        'vocational training workshop, hands-on instruction',
        'office interview setting, candidate and interviewer',
        'hospitality staff training session',
        'group of young professionals networking',
        'resume review at a career counseling desk',
        'tourism industry staff in uniform at a workplace',
        'construction or trade workers on a job site',
        'remote worker at a co-working desk',
        'graduation or certification ceremony for trainees',
    ],
    OPINION: [
        'empty park bench overlooking a coastal town at dusk',
        'close-up of hands writing notes at a wooden desk',
        'silhouette of a person against a dramatic North Sulawesi sunset',
        'scales-of-justice motif with a village mosque and church in the background',
        'quiet coffee shop table with a laptop and notebook, contemplative mood',
        'wide shot of a crowded street symbolizing public debate',
        'traditional and modern North Sulawesi architecture juxtaposed in one frame',
        'close-up of a gavel or ballot box, symbolic of policy and decisions',
        'aerial view of the Kotabunan coastline representing the region\'s future',
        'a lone figure walking along a quiet rice-terrace path, reflective mood',
    ],
}

const categoryVisualIndex = new Map<string, number>()

function nextCategoryVisual(category?: string): string {
    const concepts = (category && CATEGORY_VISUAL_CONCEPTS[category]) || CATEGORY_VISUAL_CONCEPTS.LOCAL
    const key = category || '_default'
    const i = categoryVisualIndex.get(key) || 0
    categoryVisualIndex.set(key, i + 1)
    return concepts[i % concepts.length]
}

// Applied to every generated prompt - restricts generators from producing
// nudity/explicit content. This is a soft (prompt-level) guard only; it does
// NOT verify the actual output. See the vision-based post-generation gate
// (once GEMINI_API_KEY has usable credits) for the real enforcement layer.
const SAFE_CONTENT_CLAUSE =
    'fully clothed, professional attire, tasteful composition, appropriate for a general-audience news outlet, no nudity, no sexual content'

const PROMPT_STOPWORDS = new Set([
    'kotabunan', 'this', 'that', 'with', 'from', 'have', 'will', 'their', 'about',
    'after', 'over', 'into', 'than', 'then', 'they', 'them', 'were', 'been',
    'more', 'most', 'also', 'said', 'says', 'amid', 'among', 'which', 'while',
    'announced', 'faces', 'rising', 'new', 'the', 'and', 'for', 'are',
])

/** The ~80% "what is this story about" half of the prompt - driven by the headline itself. */
function extractContentKeywords(text: string, max = 8): string {
    const words = (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !PROMPT_STOPWORDS.has(w))
    return [...new Set(words)].slice(0, max).join(', ')
}

/**
 * The ~20% "make this specific article's image unique" half of the prompt -
 * a short snippet lifted from the excerpt/short description. Two articles
 * with a similar headline in the same category would otherwise generate a
 * near-identical prompt (and therefore image) - this is what keeps them
 * apart, since the excerpt carries detail the headline alone doesn't.
 */
function shortExcerptSnippet(excerpt: string, maxWords = 6): string {
    const words = (excerpt || '')
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
    return words.slice(0, maxWords).join(' ')
}

// Randomized composition/angle modifiers. Two articles with a near-identical
// title+excerpt (same recurring topic, e.g. "boost sustainable tourism")
// would otherwise generate a near-identical prompt and therefore a
// near-identical looking photo, REGARDLESS of which generator produces it -
// this is a second line of defense on top of the title-duplicate check in
// news-generator.ts (which is the real fix; this just adds resilience for
// legitimately-similar topics that aren't duplicates).
const COMPOSITION_VARIANTS = [
    'wide establishing shot',
    'close-up detail shot',
    'over-the-shoulder perspective',
    'aerial/drone angle',
    'candid mid-action moment',
    'symmetrical formal composition',
]
const TIME_OF_DAY_VARIANTS = ['golden hour', 'overcast daylight', 'bright midday sun', 'blue hour dusk']

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Builds the default image-generation prompt: ~80% driven by the headline
 * itself (what this story is actually about), ~20% a short snippet from the
 * excerpt/short description for extra uniqueness. Category adds visual
 * grounding (e.g. "government office" vs "tropical beach") on top of both,
 * and a randomized composition/lighting modifier adds a further layer of
 * visual variety between separately-generated images.
 * Exported so scripts/regenerate-images.ts can share this instead of keeping
 * its own copy.
 */
export function buildImagePrompt(title: string, category?: string, excerpt?: string): string {
    const categoryVisual = nextCategoryVisual(category)
    const titleContext = extractContentKeywords(title, 8)
    const excerptSnippet = shortExcerptSnippet(excerpt || '', 6)
    const composition = randomFrom(COMPOSITION_VARIANTS)
    const timeOfDay = randomFrom(TIME_OF_DAY_VARIANTS)

    return (
        `award-winning editorial news photograph, ${categoryVisual}, ` +
        `subject: ${titleContext}` +
        (excerptSnippet ? `, additional detail: ${excerptSnippet}` : '') +
        `, ${composition}, ${timeOfDay}, ` +
        `kotabunan north sulawesi indonesia, photojournalism, natural lighting, sharp focus, high detail, ` +
        `${SAFE_CONTENT_CLAUSE}`
    ).slice(0, 480)
}

function extensionFor(contentType: string): string {
    if (contentType.includes('png')) return 'png'
    if (contentType.includes('webp')) return 'webp'
    if (contentType.includes('gif')) return 'gif'
    return 'jpg'
}

/** Downloads an image and only accepts genuine image binaries. */
async function downloadImage(
    url: string,
    timeoutMs: number = DOWNLOAD_TIMEOUT_MS
): Promise<{ buffer: Buffer; contentType: string } | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: { 'User-Agent': BROWSER_UA, Accept: 'image/*' },
        })
        if (!res.ok) return null

        const contentType = res.headers.get('content-type') || ''
        if (!contentType.startsWith('image/')) return null

        const buffer = Buffer.from(await res.arrayBuffer())
        if (buffer.length < MIN_IMAGE_BYTES) return null

        return { buffer, contentType }
    } catch {
        return null
    } finally {
        clearTimeout(timer)
    }
}

/** Uploads the image to persistent cloud storage and returns its public URL. Exported so upload endpoints (e.g. manual admin image uploads) can reuse the same storage convention as AI-generated images. Throws if both storage backends fail. */
export async function persistImage(
    buffer: Buffer,
    contentType: string,
    baseName: string
): Promise<string> {
    const safe =
        baseName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 80) || 'image'
    const fileName = `${safe}-${randomSeed().toString(36)}.${extensionFor(contentType)}`
    const result = await uploadImage(buffer, contentType, fileName)
    if (!result) throw new Error('Both Supabase Storage and Vercel Blob uploads failed')
    return result.url
}

// ---------------------------------------------------------------------------
// Generator rotation - a pool of independent "strategies" (each with its own
// internal fallback chain) so consecutive articles don't all come from the
// same source. Currently only Pollinations is wired in: it's the only
// generator with confirmed-working credentials right now. A Gemini
// (Nano Banana) strategy belongs here once GEMINI_API_KEY has usable
// billing credits (see src/lib/ai/providers/gemini.ts, not yet created) -
// push it into GENERATOR_POOL at the desired ratio (e.g. duplicate the
// pollinations entry twice for a 2:1 pollinations:gemini split) and rotation
// starts working automatically, no other changes needed here.
//
// UPDATE: a Gemini strategy is now wired in (2:1 pollinations:gemini, per
// the requested ratio) - but Gemini image generation needs a billing-enabled
// Google AI Studio account (confirmed: free tier's quota for image-output
// models is hard-capped at 0, not just rate-limited - see providers/gemini.ts).
// Until that's funded, generateImage() returns null and this strategy falls
// straight through to its own Pollinations/LoremFlickr fallback below - so
// rotation "works" today, it just silently skips Gemini's turn.
// ---------------------------------------------------------------------------

interface ImageCandidate {
    label: string
    /** Returns the raw bytes for this candidate, or null if this source failed. */
    fetch: () => Promise<{ buffer: Buffer; contentType: string } | null>
}

interface GeneratorStrategy {
    name: string
    buildCandidates: (prompt: string, cleanTitle: string) => ImageCandidate[]
}

function urlCandidate(url: string, label: string): ImageCandidate {
    return { label, fetch: () => downloadImage(url) }
}

const LOREMFLICKR_FALLBACK = (cleanTitle: string): ImageCandidate =>
    urlCandidate(
        `https://loremflickr.com/1200/800/${extractKeywords(cleanTitle)}?lock=${randomSeed()}`,
        'Stock Photo (LoremFlickr)'
    )

const pollinationsStrategy: GeneratorStrategy = {
    name: 'pollinations',
    buildCandidates: (prompt, cleanTitle) => [
        urlCandidate(buildPollinationsUrl(prompt), 'AI-Generated Illustration'),
        urlCandidate(buildPollinationsUrl(`kotabunan news ${cleanTitle}`), 'AI-Generated Illustration'),
        LOREMFLICKR_FALLBACK(cleanTitle),
    ],
}

const geminiStrategy: GeneratorStrategy = {
    name: 'gemini',
    buildCandidates: (prompt, cleanTitle) => [
        {
            label: 'AI-Generated Illustration (Gemini)',
            fetch: async () => {
                const { generateImage } = await import('@/lib/ai/providers/gemini')
                const result = await generateImage(prompt)
                return result ? { buffer: result.buffer, contentType: result.mimeType } : null
            },
        },
        urlCandidate(buildPollinationsUrl(prompt), 'AI-Generated Illustration'),
        LOREMFLICKR_FALLBACK(cleanTitle),
    ],
}

// Real stock photography (not generative) - see providers/unsplash.ts. Only
// used via an explicit `pool` override (bulk backfill batches), never the
// default GENERATOR_POOL - see nextGeneratorStrategy()'s batch-pool branch.
const unsplashStrategy: GeneratorStrategy = {
    name: 'unsplash',
    buildCandidates: (prompt, cleanTitle) => [
        {
            label: 'Stock Photo (Unsplash)',
            fetch: async () => {
                const { searchUnsplashPhoto } = await import('@/lib/ai/providers/unsplash')
                return searchUnsplashPhoto(`north sulawesi ${cleanTitle}`)
            },
        },
        urlCandidate(buildPollinationsUrl(prompt), 'AI-Generated Illustration'),
        LOREMFLICKR_FALLBACK(cleanTitle),
    ],
}

// Gemini-primary (2:1 gemini:pollinations). Originally the other way around,
// but flipped after an NSFW audit of the published backlog (2026-08-26)
// found Pollinations repeatedly generating content depicting apparent
// minors for "traditional community/village" style prompts specifically -
// not a one-off, the same failure mode recurred across multiple articles.
// The safety gate caught all of it before publish, but an uncensored
// generator producing that pattern at all isn't something to keep as the
// majority source once a safer, higher-quality, billing-funded alternative
// (Gemini, KEY1+KEY4) is available. Pollinations/LoremFlickr stay in the
// rotation as capacity + fallback, not gone entirely - see geminiStrategy's
// own candidate chain above, which already falls back to Pollinations then
// LoremFlickr if both Gemini keys fail on a given call.
const GENERATOR_POOL: GeneratorStrategy[] = [geminiStrategy, geminiStrategy, pollinationsStrategy]

// Named export so a caller (e.g. the bulk backfill script) can build its own
// wider pool - e.g. [geminiStrategy, geminiStrategy, pollinationsStrategy,
// unsplashStrategy] - without duplicating these strategy definitions.
export const IMAGE_STRATEGIES = { gemini: geminiStrategy, pollinations: pollinationsStrategy, unsplash: unsplashStrategy }
export type { GeneratorStrategy }

let rotationIndex = 0
// Separate counter for custom (batch-only) pools, so passing a `pool`
// override to generateAndStoreImage() never perturbs the default pool's
// rotation state for the site's normal, concurrent day-to-day generation.
let batchRotationIndex = 0

function nextGeneratorStrategy(pool?: GeneratorStrategy[]): GeneratorStrategy {
    if (pool) {
        const strategy = pool[batchRotationIndex % pool.length]
        batchRotationIndex++
        return strategy
    }
    const strategy = GENERATOR_POOL[rotationIndex % GENERATOR_POOL.length]
    rotationIndex++
    return strategy
}

/**
 * Generates an image for a title, verifies it and stores it locally.
 *
 * @param title Article title - always used for the filename and as a
 *   fallback prompt source.
 * @param promptOverride Use this exact prompt instead of the default
 *   80/20 (category+content / headline-snippet) builder. Existing callers
 *   that already build their own rich prompt (repair scripts, etc.) keep
 *   working unchanged.
 * @param context Category/excerpt used to build the default prompt when no
 *   promptOverride is given - skip this and the prompt falls back to a
 *   generic "kotabunan news" framing.
 * @param pool Override the generator rotation for this call only (own
 *   counter, doesn't touch the default pool's rotation state) - for one-off
 *   bulk batches that want wider source variety than the site's normal
 *   day-to-day generation. Omit for standard behavior.
 */
export async function generateAndStoreImage(
    title: string,
    promptOverride?: string,
    context?: { category?: string; excerpt?: string; content?: string },
    pool?: GeneratorStrategy[]
): Promise<StoredImage> {
    const cleanTitle = cleanPromptText(title)

    // Priority: explicit override > AI-reasoned prompt (when content is
    // available - reads title+excerpt+a content slice, grounds the prompt
    // in this specific story instead of generic category keywords, and
    // rotates through several visual styles) > the deterministic template.
    let prompt = promptOverride
    if (!prompt && context?.content) {
        const { buildReasonedImagePrompt } = await import('@/lib/ai/image-prompt-reasoner')
        prompt = (await buildReasonedImagePrompt({
            title,
            excerpt: context.excerpt,
            content: context.content,
            category: context.category,
        })) ?? undefined
    }
    if (!prompt) {
        prompt = buildImagePrompt(title, context?.category, context?.excerpt)
    }

    const candidates: ImageCandidate[] = []

    if (promptOverride) {
        candidates.push(urlCandidate(buildPollinationsUrl(promptOverride), 'AI-Generated Illustration'))
    }

    const strategy = nextGeneratorStrategy(pool)
    candidates.push(...strategy.buildCandidates(prompt, cleanTitle))

    for (const candidate of candidates) {
        const downloaded = await candidate.fetch()
        if (!downloaded) continue

        // NSFW gate - verify the actual pixels before this ever touches
        // disk/the DB. Fails closed: any error here (network, no key, quota)
        // discards the candidate rather than publishing something nobody
        // actually checked. See providers/gemini.ts for why this can't go
        // through MyAI OS (confirmed to reject image input outright).
        const { checkImageSafety } = await import('@/lib/ai/providers/gemini')
        const safety = await checkImageSafety(downloaded.buffer, downloaded.contentType)
        if (!safety.safe) {
            console.warn(`Discarded image candidate (${candidate.label}) - safety check: ${safety.reason}`)
            continue
        }

        try {
            const localPath = await persistImage(
                downloaded.buffer,
                downloaded.contentType,
                cleanTitle
            )
            return { localPath, source: candidate.label }
        } catch (error) {
            console.error('Failed to persist image file:', error)
        }
    }

    console.error(`All image sources failed for: "${title}"`)
    return { localPath: null, source: 'Generation Failed' }
}

// ---------------------------------------------------------------------------
// Inline images - places additional images WITHIN an article's body, not
// just the one featuredImageUrl banner at the top. There's no separate
// image table/schema for this: `content` is already stored and rendered as
// raw HTML (see article/[slug]/page.tsx's dangerouslySetInnerHTML), so an
// inline image is just an extra <figure> block spliced into that string at
// a paragraph boundary.
// ---------------------------------------------------------------------------

/** Splits HTML into top-level `<p>...</p>` blocks (non-paragraph markup, e.g. stray <h3>, stays attached to the following block). */
export function splitIntoParagraphBlocks(html: string): string[] {
    const pieces = html.split(/(<\/p>)/i)
    const blocks: string[] = []
    let pending = ''
    for (let i = 0; i < pieces.length; i++) {
        pending += pieces[i]
        if (/^<\/p>$/i.test(pieces[i])) {
            blocks.push(pending)
            pending = ''
        }
    }
    if (pending.trim()) blocks.push(pending)
    return blocks
}

/**
 * Inserts `count` additional contextual images directly into an article's
 * HTML body, spaced across its paragraphs. "Accurate placement" means each
 * image is generated from the TEXT OF THE PARAGRAPH IT SITS NEXT TO (not
 * just the article's overall title/excerpt) - the image after paragraph 4
 * is built from what paragraph 4 actually says, via the same 80/20
 * (category+content / snippet) prompt builder used everywhere else.
 *
 * No-ops (returns the original HTML unchanged) if the article doesn't have
 * enough paragraphs to space `count` images out without bunching them at
 * the start/end - a 3-paragraph article doesn't need 2 extra photos.
 */
export async function insertInlineImages(
    html: string,
    title: string,
    category: string | undefined,
    count: number = 2
): Promise<string> {
    const blocks = splitIntoParagraphBlocks(html)
    const minParagraphsNeeded = (count + 1) * 2
    if (count <= 0 || blocks.length < minParagraphsNeeded) return html

    const insertPositions: number[] = []
    for (let i = 1; i <= count; i++) {
        insertPositions.push(Math.floor((blocks.length * i) / (count + 1)))
    }

    // Fire every inline image generation CONCURRENTLY rather than one at a
    // time in the loop below - with 2 funded Gemini keys (KEY1 + KEY4) now
    // in rotation, this is what actually lets a 2-image job run both
    // requests in parallel instead of queueing the second behind the first.
    // See imageKeyRotation in providers/gemini.ts for the key-assignment
    // side of this.
    const generated = await Promise.all(
        insertPositions.map((pos) => {
            const sectionText = blocks[pos].replace(/<[^>]+>/g, ' ').trim()
            return generateAndStoreImage(title, undefined, { category, excerpt: sectionText })
        })
    )

    const insertAt = new Map(insertPositions.map((pos, idx) => [pos, generated[idx]]))
    // Full HTML-attribute escaping (not just quotes) - title is AI-generated,
    // not a fixed literal, and this string gets spliced into `content`,
    // which the article page renders via dangerouslySetInnerHTML.
    const alt = title
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    let result = ''
    for (let i = 0; i < blocks.length; i++) {
        result += blocks[i]
        const stored = insertAt.get(i)
        if (stored?.localPath) {
            result += `<figure class="my-6"><img src="${stored.localPath}" alt="${alt}" loading="lazy" /><figcaption>${stored.source}</figcaption></figure>`
        }
    }
    return result
}
