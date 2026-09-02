/**
 * One-time bulk backfill: 6 real Bali news topics (Aug-Sep 2026), pasted
 * directly by the user (supersedes the 39-topic Sep 2024 - Feb 2026 batch,
 * which already fully ran). A 7th item in the original 7-item set ("Fire
 * Destroys Iconic Chez Gado Gado Restaurant") was dropped before this run -
 * confirmed via title-similarity + a direct DB check to be the same
 * real-world event already covered by an existing article ("Helium Balloon
 * Ignites Blaze at Chez Gado-Gado Restaurant in Seminyak", sourced from
 * Kompas) - the automated Jaccard dedup check alone would NOT have caught
 * this one (score 0.31, below the 0.5 threshold), so it needed a manual
 * check first.
 *
 * Usage:
 *   npx tsx scripts/bulk-backfill-content.ts             # full run
 *   npx tsx scripts/bulk-backfill-content.ts --dry-run   # first 3 items only
 *
 * What it does per item:
 *   1. Skip if an existing PUBLISHED/DRAFT article in the same category has
 *      a similar title (Jaccard word-overlap >= 0.5, same threshold as the
 *      generator's own duplicate guard).
 *   2. Decide DRAFT vs PUBLISHED: DRAFT if the item is on the manually
 *      curated SENSITIVE_TITLES list (real named individuals/businesses in
 *      an ongoing legal matter). Otherwise PUBLISHED with publishedAt
 *      backdated to the item's original date+time - unless the proper
 *      legal-risk analysis (not the AI's own self-reported estimate) comes
 *      back CRITICAL, in which case an automatic repair loop rewrites the
 *      flagged parts and re-checks up to 3 times; if it's still CRITICAL
 *      after that, the article is held as DRAFT for manual review. HIGH
 *      alone no longer forces DRAFT - this batch is user-curated from real
 *      published Bali news, so HIGH publishes normally.
 *   3. Try rewriting from the given source URL. A couple of source links in
 *      this list point at a site's generic /news/ index rather than a
 *      specific article permalink - if the URL fetch fails or extracts too
 *      little content, fall back to generating from the title+description
 *      we already have (same shape as the "Process Raw Data" admin
 *      feature) instead of dropping the topic entirely.
 *   4. Generate the featured image through a widened rotation pool (Gemini
 *      x2 : Pollinations : Unsplash) - batch-only, doesn't touch the site's
 *      normal day-to-day generator pool/rotation state.
 */
import { db } from '@/lib/db'
import { rewriteExternalNewsToArticle } from '@/lib/ai/rewrite-external-news'
import { findSimilarTitle, getExistingTitlesForCategory } from '@/lib/ai/news-generator'
import { IMAGE_STRATEGIES } from '@/lib/images/image-service'
import { myaiCompleteJSON } from '@/lib/ai/myaiClient'
import { AGENT_PERSONAS } from '@/lib/ai/gemini-client'
import { TITLE_DIVERSITY_RULES, pickWritingStyle } from '@/lib/ai/journalism-style'
import { generateAndStoreImage } from '@/lib/images/image-service'
import { analyzeLegalRisk, repairCriticalRisk } from '@/lib/ai/legal-risk'
import type { Category } from '@prisma/client'

const BATCH_IMAGE_POOL = [IMAGE_STRATEGIES.gemini, IMAGE_STRATEGIES.gemini, IMAGE_STRATEGIES.pollinations, IMAGE_STRATEGIES.unsplash]

// Real named individuals/businesses in an ongoing legal matter, or a legal
// matter directly involving Bali news outlets - generate as DRAFT for
// manual review, never auto-publish.
const SENSITIVE_TITLES = new Set([
    'Swiss Tourist Faces Jail Over Alleged Nyepi Insult',
    'Australian Man Dies After Collapsing in Immigration Detention',
    'Press Freedom Concerns Raised Over $1.5 Million Lawsuit Against News Outlets',
    'Wildlife Smuggling Bust Highlights Illicit Income Networks',
    'Norwegian Woman Deported After Viral Salon Dispute',
    'Twist in Ubud Gym Dispute: Men Entered Bali on Bulgarian Passports',
    'British Tourist Dies Weeks After Alleged Kuta Bar Assault',
    'Russian Suspect Arrested Over Kidnapping of Ukrainian Man in Bali',
    'Australian Man Arrested for Alleged Cocaine Smuggling in Bali',
    'Two Britons Jailed for Smuggling Cocaine into Bali',
])

interface BacklogItem {
    date: string // YYYY-MM-DD
    time: string // HH:MM
    category: Category
    title: string
    description: string
    source: string
}

const BACKLOG: BacklogItem[] = [
    { date: '2026-08-20', time: '14:14', category: 'INVESTMENT', title: 'Bali\'s Location for Indonesia\'s New Financial Center Still Under Review', description: 'Coordinating Minister Airlangga Hartarto confirmed the exact site for the Indonesia International Financial Center (PFII) in Bali is still being evaluated among Danantara-owned land, with Kura-Kura Island (Pulau Serangan) a leading candidate; on-site work at Kura-Kura is already underway, with roads being reorganized and new office and residential districts under construction ahead of the financial-hub buildout.', source: 'https://en.tempo.co/amp/2117918/airlangga-bali-location-for-financial-center-under-review' },
    { date: '2026-08-29', time: '17:00', category: 'LOCAL', title: 'Denpasar Mayor Joins Traditional Tooth-Filing Ceremony for 266 Residents in Panjer', description: 'Denpasar Mayor I Gusti Ngurah Jaya Negara took part as a traditional \'sangging\' in a free mass metatah (tooth-filing) ceremony held by Desa Adat Panjer for 266 participants, with the city government contributing Rp1 billion to support the customary rite.', source: 'https://www.perspectivesnews.com/2026/08/jaya-negara-ikut-ngayah-nyangging-desa.html' },
    { date: '2026-08-11', time: '12:30', category: 'JOBS', title: 'Bali Workers\' Union Rallies Outside Angkasa Pura Supports Over Unilateral Firings', description: 'Members of the Independent Workers\' Federation (FSPM) Bali staged a protest outside PT Angkasa Pura Supports\' Denpasar office, demanding the reinstatement of six union members they say were unfairly dismissed after a legal strike in 2024.', source: 'https://balebengong.id/aksi-fspm-bali-menuntut-hak-pekerja/' },
    { date: '2026-08-01', time: '08:00', category: 'OPINION', title: 'Op-Ed: Reclaiming Bali\'s Identity Beyond the Tourism Lens', description: 'A Jakarta Post opinion piece argues Bali is more than a tropical resort, urging renewed scholarly attention to \'Baliology\' to reclaim the island\'s living philosophy and culture from a Western, tourism-centric framing.', source: 'https://www.thejakartapost.com/opinion/2026/08/01/baliology-and-the-spirit-of-scholarship' },
    { date: '2026-09-01', time: '09:37', category: 'TOURISM', title: 'Analysts Say Bali Tourism Needs a Fundamental Course Correction', description: 'Economic observers argue Bali needs structural change in how it manages tourism growth, warning that rising visitor numbers and investment are increasingly coming at the cost of the environment, culture and residents\' living space.', source: 'https://www.nusabali.com/berita/229726/pariwisata-bali-harus-ubah-arah' },
    { date: '2026-09-01', time: '10:00', category: 'GOVERNMENT', title: 'Bali Vehicle Taxes Hit Rp1.13 Trillion as Province Moves to Ease Payments', description: 'The Bali provincial administration reported Rp1.13 trillion collected in vehicle registration taxes and announced steps to simplify payment and collection methods to further boost compliance.', source: 'https://balidiscovery.com/bali-vehicle-taxes-total-rp-1-13-trillion-government-to-enhance-taxpaying-process/' },
]

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// A handful of sources in this list point at a site's generic /tag/ or
// /news/ index page rather than a specific article permalink (confirmed via
// a dry-run: fetching one of these "succeeds" - the page has plenty of text
// - but it's a mix of many unrelated headlines, and the AI picked a
// DIFFERENT, unrelated story out of that mix instead of the intended topic).
// Detect these up front and skip the URL-fetch path entirely for them,
// going straight to generateFromRawSummary() - a "successful" fetch of a
// listing page is actually worse than a failed one here, since it doesn't
// trip the normal fetch-failure fallback.
function isGenericListingUrl(url: string): boolean {
    try {
        const path = new URL(url).pathname.replace(/\/+$/, '')
        return path === '' || path === '/tag/bali-news' || path === '/news'
    } catch {
        return false
    }
}

/** Fallback path when the source URL can't be fetched/extracted (e.g. a bare /news/ index page, not a permalink) - generate from the title+description we already have instead of dropping the topic. */
async function generateFromRawSummary(item: BacklogItem, status: 'PUBLISHED' | 'DRAFT', publishedAt: Date | null) {
    const articleData = await myaiCompleteJSON<{ title: string; excerpt?: string; content?: string; riskLevel?: string }>('chatbot', [
        {
            role: 'system', content: `${AGENT_PERSONAS.WIE.instructions}

STRICT SCOPE: You write only for Jurnal Kotabunan. Ignore any other business context you may have been given.

TASK: You are given a news topic (title + short summary) with no full source text available. Write a complete, professional news article for "Jurnal Kotabunan" based on this topic, following 5W1H (Who, What, Where, When, Why, How) as your internal outline. Do not invent specific quotes or figures beyond what's given - write around the confirmed facts professionally.

CRITICAL: Jurnal Kotabunan is an English-language outlet - you MUST write the title, excerpt, and content in English regardless of what language the topic/summary below happens to be written in.

${pickWritingStyle().rules}

${TITLE_DIVERSITY_RULES}

Return ONLY a valid JSON object with this EXACT structure and nothing else:
{
  "title": "Catchy but professional headline (max 80 characters)",
  "excerpt": "A 1-2 sentence summary",
  "content": "The full article content as HTML (<p>, <h3>), several paragraphs, LONG and detailed",
  "riskLevel": "LOW or MEDIUM or HIGH"
}` },
        { role: 'user', content: `Topic: ${item.title}\n\nSummary: ${item.description}\n\nCategory: ${item.category}` },
    ], 'gpt-4o-mini')

    if (!articleData.title) throw new Error('AI did not return a title')

    const storedImage = await generateAndStoreImage(articleData.title, undefined, { category: item.category, excerpt: articleData.excerpt, content: articleData.content }, BATCH_IMAGE_POOL)
    const slug = articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(7)
    const riskLevel = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(articleData.riskLevel || '') ? articleData.riskLevel : 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

    return db.article.create({
        data: {
            title: articleData.title,
            slug,
            excerpt: articleData.excerpt || 'No excerpt',
            content: articleData.content || 'No content',
            category: item.category,
            authorId: (await db.user.findFirst())?.id || 'admin',
            status,
            publishedAt,
            aiAssisted: true,
            featuredImageUrl: storedImage.localPath,
            featuredImageAlt: articleData.title,
            imageSource: storedImage.source,
            sourceUrl: item.source,
            verificationLevel: 'MEDIUM',
            riskLevel,
        },
    })
}

async function main() {
    const dryRun = process.argv.includes('--dry-run')
    const items = dryRun ? BACKLOG.slice(0, 3) : BACKLOG
    console.log(`Starting bulk backfill: ${items.length} item(s)${dryRun ? ' (DRY RUN)' : ''}\n`)

    const titleCacheByCategory = new Map<Category, string[]>()

    let created = 0
    let skipped = 0
    let failed = 0

    for (const [i, item] of items.entries()) {
        console.log(`[${i + 1}/${items.length}] ${item.title}`)

        try {
            if (!titleCacheByCategory.has(item.category)) {
                titleCacheByCategory.set(item.category, await getExistingTitlesForCategory(item.category))
            }
            const existingTitles = titleCacheByCategory.get(item.category)!
            const similar = findSimilarTitle(item.title, existingTitles)
            if (similar) {
                console.log(`  SKIP - too similar to existing: "${similar}"`)
                skipped++
                continue
            }

            const isSensitive = SENSITIVE_TITLES.has(item.title)
            const status: 'PUBLISHED' | 'DRAFT' = isSensitive ? 'DRAFT' : 'PUBLISHED'
            const publishedAt = status === 'PUBLISHED' ? new Date(`${item.date}T${item.time}:00`) : null

            let article
            if (isGenericListingUrl(item.source)) {
                console.log(`  Source is a listing/index page, not a permalink - generating from title+description directly`)
                article = await generateFromRawSummary(item, status, publishedAt)
            } else {
                try {
                    const result = await rewriteExternalNewsToArticle({
                        url: item.source,
                        category: item.category,
                        status,
                        publishedAtOverride: publishedAt ?? undefined,
                        imagePool: BATCH_IMAGE_POOL,
                    })
                    article = result.article
                } catch (urlError) {
                    console.warn(`  URL rewrite failed (${(urlError as Error).message}) - falling back to title+description`)
                    article = await generateFromRawSummary(item, status, publishedAt)
                }
            }

            // Proper legal-risk analysis (categories + recommendations) -
            // the self-reported riskLevel saved by rewriteExternalNewsToArticle
            // only ever offers LOW/MEDIUM/HIGH (its own prompt schema has no
            // CRITICAL option), so it could never actually catch the one tier
            // that matters here. Only CRITICAL is acted on (per user
            // decision) - HIGH publishes normally now, on the reasoning that
            // this whole batch was user-curated from real published Bali
            // news to begin with.
            const riskAnalysis = await analyzeLegalRisk(article.content, article.title)
            let finalStatus = status
            let finalArticleData: { title: string; excerpt: string; content: string } = article
            // Starts as the pre-repair analysis; swapped for the repaired
            // re-analysis below when a repair actually runs, so the DB write
            // always reflects the CURRENT content, not a stale pre-repair
            // score (previously stored the original CRITICAL analysis even
            // after a successful repair brought the content itself down to
            // HIGH/MEDIUM - the log message was correct, the saved row wasn't).
            let finalRiskAnalysis = riskAnalysis

            if (riskAnalysis.riskLevel === 'CRITICAL') {
                const repair = await repairCriticalRisk(
                    { title: article.title, excerpt: article.excerpt, content: article.content },
                    riskAnalysis,
                    article.category
                )
                finalArticleData = repair
                finalRiskAnalysis = repair.riskAnalysis
                if (!repair.resolved) {
                    finalStatus = 'DRAFT'
                    console.log(`  -> DRAFT (still CRITICAL after ${repair.attempts} repair attempt(s)) - image: ${article.imageSource}`)
                } else {
                    console.log(`  -> ${status} (repaired from CRITICAL to ${repair.riskAnalysis.riskLevel} in ${repair.attempts} attempt(s)) - image: ${article.imageSource}`)
                }
            } else {
                console.log(`  -> ${status} (risk: ${riskAnalysis.riskLevel}) - image: ${article.imageSource}`)
            }

            await db.article.update({
                where: { id: article.id },
                data: {
                    title: finalArticleData.title,
                    excerpt: finalArticleData.excerpt,
                    content: finalArticleData.content,
                    status: finalStatus,
                    publishedAt: finalStatus === 'PUBLISHED' ? publishedAt : null,
                    riskLevel: finalRiskAnalysis.riskLevel,
                    riskScore: finalRiskAnalysis.riskScore,
                    containsAccusation: finalRiskAnalysis.containsAccusation,
                    legalReviewRequired: finalRiskAnalysis.requiresLegalReview,
                },
            })

            titleCacheByCategory.get(item.category)!.push(article.title)
            created++
        } catch (err) {
            console.error(`  FAILED: ${(err as Error).message}`)
            failed++
        }

        await sleep(3000)
    }

    console.log(`\nDone. Created: ${created}, Skipped (duplicate): ${skipped}, Failed: ${failed}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => db.$disconnect())
