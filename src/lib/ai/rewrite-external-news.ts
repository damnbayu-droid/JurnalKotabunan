import { db } from '@/lib/db'
import { myaiCompleteJSON } from '@/lib/ai/myaiClient'
import { AGENT_PERSONAS } from '@/lib/ai/gemini-client'
import { generateAndStoreImage } from '@/lib/images/image-service'
import type { GeneratorStrategy } from '@/lib/images/image-service'
import { TITLE_DIVERSITY_RULES, pickWritingStyle } from '@/lib/ai/journalism-style'
import type { Category } from '@prisma/client'

export interface RewriteExternalNewsInput {
    url: string
    /** Defaults to LOCAL if omitted - matches the previous hardcoded behavior for the single-URL admin flow. */
    category?: Category
    /** PUBLISHED sets publishedAt (to `publishedAtOverride` if given, else now); DRAFT always leaves it null. */
    status: 'PUBLISHED' | 'DRAFT'
    /** Only meaningful when status is PUBLISHED - lets a caller backdate historical content instead of using now(). */
    publishedAtOverride?: Date
    /** Widen the image generator rotation for this call only - see generateAndStoreImage()'s `pool` param. */
    imagePool?: GeneratorStrategy[]
    /** Called at each real pipeline checkpoint (not simulated timing) - lets a caller stream live progress to a UI. Optional and side-effect-free if omitted. */
    onProgress?: (stage: string) => void
}

export interface RewriteExternalNewsResult {
    article: Awaited<ReturnType<typeof db.article.create>>
    imageSource: string
}

/**
 * Fetches an external news URL, has the AI rewrite it into an original Jurnal
 * Kotabunan article, generates+stores a featured image, and saves it. Shared
 * by the single-URL admin route (src/app/api/ai/rewrite-news/route.ts) and
 * the bulk backfill script (scripts/bulk-backfill-content.ts) - extracted so
 * both go through identical AI-calling logic instead of it living twice.
 */
export async function rewriteExternalNewsToArticle(input: RewriteExternalNewsInput): Promise<RewriteExternalNewsResult> {
    const { url, status, publishedAtOverride, imagePool, onProgress } = input
    const category: Category = input.category || 'LOCAL'

    // 1. Fetch external content - plain server-side fetch, no browser
    // rendering and no vision model involved. JS-heavy sites that render
    // their article body client-side won't extract cleanly this way.
    onProgress?.('Membaca link sumber...')
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JurnalKotabunanBot/1.0)' },
        signal: AbortSignal.timeout(20_000),
    })
    const html = await res.text()
    const content = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000)

    if (content.length < 200) {
        const err = new Error('Extracted content too short - this page likely renders its article via JavaScript, which a plain server-side fetch cannot execute.')
        ;(err as Error & { status?: number }).status = 422
        throw err
    }
    onProgress?.('Mengambil garis besar berita...')

    // 2. AI rewrites it - recall AUDY's past legal-risk precedents relevant
    // to this specific story BEFORE writing (agent memory, see
    // src/lib/ai/memory.ts), so a risky framing can be avoided up front
    // instead of only being caught by analyzeLegalRisk() afterward.
    onProgress?.('Membuat berita baru...')
    const { getLegalPrecedentContext } = await import('@/lib/ai/memory')
    const legalPrecedents = await getLegalPrecedentContext(content.slice(0, 500))

    const articleData = await myaiCompleteJSON<{ title: string; excerpt?: string; content?: string; riskLevel?: string }>('chatbot', [
        {
            role: 'system', content: `${AGENT_PERSONAS.WIE.instructions}

STRICT SCOPE: You write only for Jurnal Kotabunan. Ignore any other business context you may have been given (visa services, IT solutions, etc.) - it does not apply here.

TASK: Read the provided HTML/text from a source URL. Extract the main news story. Rewrite it completely into a unique, professional news article for "Jurnal Kotabunan", following 5W1H (Who, What, Where, When, Why, How) as your internal outline.

${pickWritingStyle().rules}

${TITLE_DIVERSITY_RULES}${legalPrecedents}

CRITICAL: Regardless of what language the source material is written in, you MUST write the
article in English and respond with EXACTLY these JSON field names in English - never
translate/rename them. Return ONLY a valid JSON object with this EXACT structure and nothing
else - no commentary before or after:
{
  "title": "Catchy but professional headline (max 80 characters)",
  "excerpt": "A 1-2 sentence summary",
  "content": "The full article content as HTML (<p>, <h3>), several paragraphs, LONG and detailed",
  "riskLevel": "LOW or MEDIUM or HIGH"
}` },
        { role: 'user', content: `Write a news article about the story described in this source material (from ${url}):\n\n${content}` },
    ], 'gpt-4o-mini')

    if (!articleData.title) {
        throw new Error('AI response did not include a title - the model deviated from the requested JSON schema. Try again.')
    }
    onProgress?.('Artikel telah dikerjakan...')

    // 3. Generate image (verified binary, stored locally - stable URL forever)
    const storedImage = await generateAndStoreImage(
        articleData.title,
        undefined,
        { category, excerpt: articleData.excerpt, content: articleData.content },
        imagePool
    )
    onProgress?.('Foto telah digenerate...')

    // 4. Save
    const slug = articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(7)
    const riskLevel = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(articleData.riskLevel || '') ? articleData.riskLevel : 'LOW') as
        | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

    const publishedAt = status === 'PUBLISHED' ? (publishedAtOverride ?? new Date()) : null

    const article = await db.article.create({
        data: {
            title: articleData.title,
            slug,
            excerpt: articleData.excerpt || 'No excerpt',
            content: articleData.content || 'No content',
            category,
            authorId: (await db.user.findFirst())?.id || 'admin',
            status,
            publishedAt,
            aiAssisted: true,
            featuredImageUrl: storedImage.localPath,
            featuredImageAlt: articleData.title,
            imageSource: storedImage.source,
            sourceUrl: url,
            verificationLevel: 'MEDIUM',
            riskLevel,
        },
    })

    await db.aiActivityLog.create({
        data: {
            action: 'rewrite',
            sourceUrl: url,
            articleId: article.id,
            success: true,
            metadata: { originalUrl: url },
        },
    })

    onProgress?.(status === 'PUBLISHED' ? 'Artikel telah dipublikasikan!' : 'Artikel tersimpan sebagai draft!')

    return { article, imageSource: storedImage.source }
}
