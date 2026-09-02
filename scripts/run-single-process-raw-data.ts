/**
 * One-off runner mirroring src/app/api/ai/process-raw-data/route.ts's
 * pipeline (raw text/press-release -> Jurnal Kotabunan article), invoked
 * directly instead of through the authenticated admin HTTP endpoint.
 *
 * Usage: bun scripts/run-single-process-raw-data.ts <path-to-text-or-md-file>
 */
import fs from 'fs/promises'
import { db } from '../src/lib/db'
import { myaiCompleteJSON } from '../src/lib/ai/myaiClient'
import { generateAndStoreImage } from '../src/lib/images/image-service'
import { TITLE_DIVERSITY_RULES, pickWritingStyle } from '../src/lib/ai/journalism-style'
import type { Category } from '@prisma/client'

const filePath = process.argv[2]
if (!filePath) {
    console.error('Usage: bun scripts/run-single-process-raw-data.ts <path-to-text-or-md-file>')
    process.exit(1)
}

async function main() {
    const content = await fs.readFile(filePath, 'utf-8')
    console.log('-> Membaca file sumber...')

    const result = await myaiCompleteJSON<{
        title: string; slug: string; excerpt: string; content: string; category: string; riskLevel: string
    }>('chatbot', [
        {
            role: 'system',
            content: `You are a senior editor at Jurnal Kotabunan. You are given raw data, notes, or a press release.
            Your task is to transform this into a professional, journalistic news article, using the 5W1H standard (Who, What, Where, When, Why, How) as your internal outline only.

            ${pickWritingStyle().rules}

            ${TITLE_DIVERSITY_RULES}

            CRITICAL: Regardless of what language the raw data below is written in (it may be
            Indonesian), you MUST write the article in English and respond with EXACTLY these
            JSON field names in English - never translate/rename them (e.g. never "judul",
            "artikel", "ringkasan", "isi"). Return ONLY a valid JSON object with this EXACT flat
            structure - no nested objects, no commentary before or after:
            {
                "title": "A captivating, journalistic headline",
                "slug": "kebab-case-slug-optimized-for-seo",
                "excerpt": "A concise summary (max 160 chars)",
                "content": "The full article content in HTML format. Use <p>, <h3> (sparingly), <ul>, <li>. Do not use <h1> or <h2>.",
                "category": "One of: TOURISM, INVESTMENT, INCIDENTS, LOCAL, JOBS, OPINION",
                "riskLevel": "LOW or MEDIUM or HIGH"
            }

            Tone: Professional, Objective, Informative.
            Language: English.`,
        },
        { role: 'user', content: `Write a news article based on the following information:\n${content}` },
    ], 'gpt-4o-mini')

    if (!result.title || !result.slug) {
        throw new Error('AI response did not include a title/slug - the model deviated from the requested JSON schema.')
    }
    console.log('-> Artikel telah dikerjakan...')

    const category = result.category as Category
    const riskLevel = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(result.riskLevel) ? result.riskLevel : 'LOW') as
        'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

    const storedImage = await generateAndStoreImage(result.title, undefined, {
        category,
        excerpt: result.excerpt,
        content: result.content,
    })
    console.log('-> Foto telah digenerate...')

    const admin = await db.user.findFirst({ where: { role: { in: ['ADMIN', 'EDITOR'] } } })

    const article = await db.article.create({
        data: {
            title: result.title,
            slug: `${result.slug}-${Date.now().toString(36)}`,
            excerpt: result.excerpt,
            content: result.content,
            category,
            featuredImageUrl: storedImage.localPath,
            featuredImageAlt: result.title,
            imageSource: storedImage.source,
            aiAssisted: true,
            riskLevel,
            // Published directly per user's standing policy (publish
            // everything except CRITICAL, no need to ask each time - see
            // memory newsbali_publish_policy_non_critical.md), backdated to
            // 2024-12-10 per explicit user request (close to the actual
            // signing date in the press release, 2024-12-07).
            status: riskLevel === 'CRITICAL' ? 'DRAFT' : 'PUBLISHED',
            authorId: admin?.id || (await db.user.findFirst())!.id,
            publishedAt: riskLevel === 'CRITICAL' ? null : new Date('2024-12-10T09:00:00Z'),
        },
    })

    await db.aiActivityLog.create({
        data: {
            action: 'process-raw-data',
            category,
            articleId: article.id,
            success: true,
            metadata: { sourceLength: content.length, sourceFile: filePath },
        },
    })

    console.log('\n=== DONE ===')
    console.log('id:', article.id)
    console.log('slug:', article.slug)
    console.log('title:', article.title)
    console.log('category:', article.category)
    console.log('riskLevel:', article.riskLevel)
    console.log('featuredImageUrl:', article.featuredImageUrl)
}

main()
    .catch((err) => {
        console.error('FAILED:', err)
        process.exit(1)
    })
    .finally(() => db.$disconnect())
