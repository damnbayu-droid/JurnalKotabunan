import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { myaiCompleteJSON, MYAI_FIELDS } from '@/lib/ai/myaiClient'
import { AGENT_PERSONAS } from '@/lib/ai/gemini-client'
import { generateAndStoreImage } from '@/lib/images/image-service'
import { TITLE_DIVERSITY_RULES, pickWritingStyle } from '@/lib/ai/journalism-style'
import { getSession } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        if (!session || (session.role !== 'ADMIN' && session.role !== 'EDITOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { category, autoPublish } = await req.json()

        // 1. Simulate "Viral Discovery" by asking AI to hallucinate/browse valid trends
        // In production, we'd fetch Google Trends RSS or Twitter API.
        // Here, we ask the model what is trending in Kotabunan and North Sulawesi right now.

        // NOTE: uses AUDY's field (reasoning_general), not WUE's - short pick
        // tasks like this got hijacked by the gateway's own baked-in
        // business context under content_journalist, reasoning_general
        // stayed on-topic and schema-compliant across repeated tries.
        const trendPick = await myaiCompleteJSON<{ headline?: string }>(MYAI_FIELDS.AUDY, [
            {
                role: "system", content: `You are a trend watcher for Jurnal Kotabunan, an Indonesian-language news outlet covering Kotabunan and Bolaang Mongondow Timur, North Sulawesi, Indonesia. The "headline" you return must be in Bahasa Indonesia.
TASK: Identify one realistic, highly probable VIRAL news topic specific to Kotabunan or Bolaang Mongondow Timur right now. It must be about one of: Tourism, Traffic, Culture, or Investment in the region.
Return ONLY a valid JSON object with this EXACT structure and nothing else:
{
  "headline": "A short, specific Kotabunan news topic headline (max 15 words)"
}`
            },
            { role: "user", content: category ? `Find a viral Kotabunan topic in category: ${category}` : "Find any viral Kotabunan topic." }
        ])
        const trendingTopic = trendPick.headline || "Kotabunan Tourism Surge"

        // 2. Generate Article based on this trend
        // 'chatbot' + gpt-4o-mini pinned, not MYAI_FIELDS.WUE
        // (content_journalist) - confirmed that field is the same
        // hijacked/broken one as WIE (returns empty {} or a different
        // schema/language), same fix already applied to news-generator.ts/
        // rewrite-external-news.ts/process-raw-data.
        const articleData = await myaiCompleteJSON<{ title: string; excerpt?: string; content?: string; riskLevel?: string }>('chatbot', [
            {
                role: "system", content: `${AGENT_PERSONAS.WUE.instructions}

STRICT SCOPE: You write only for Jurnal Kotabunan. Ignore any other business context you may have been given (visa services, IT solutions, hotlinking images, etc.) - it does not apply here.

TASK: Write a detailed, factual news article about this trending Kotabunan topic, following 5W1H (Who, What, Where, When, Why, How) as your internal outline.

LANGUAGE: Write in natural, standard Bahasa Indonesia (Bahasa Indonesia baku), NOT English. Keep the JSON field names below in English but the "title"/"excerpt"/"content" values must be in Indonesian.

LENGTH: a substantial, fully developed report (aim for 900+ words) covering context, key facts, multiple perspectives, impact and next steps - not a thin summary.

Topic: "${trendingTopic}"

${pickWritingStyle().rules}

${TITLE_DIVERSITY_RULES}

CRITICAL: Return ONLY a valid JSON object with this EXACT structure and nothing else - no commentary before or after:
{
  "title": "Judul menarik namun profesional (maks 80 karakter)",
  "excerpt": "Ringkasan 1-2 kalimat",
  "content": "Isi artikel lengkap sebagai HTML (<p>, <h3>), beberapa paragraf, PANJANG dan mendetail",
  "riskLevel": "LOW or MEDIUM or HIGH"
}` },
            { role: "user", content: `Write the article about: ${trendingTopic}` }
        ], 'gpt-4o-mini')

        if (!articleData.title) {
            throw new Error('AI response did not include a title - the model deviated from the requested JSON schema. Try again.')
        }

        // 3. Generate Image (verified binary, stored locally — stable URL forever)
        const storedImage = await generateAndStoreImage(articleData.title, undefined, {
            category: category || 'LOCAL',
            excerpt: articleData.excerpt,
            content: articleData.content,
        })

        // 4. Save
        const slug = articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(7)

        // Map category if needed
        const cat = category || "LOCAL" // simplify

        const newArticle = await db.article.create({
            data: {
                title: articleData.title,
                slug: slug,
                excerpt: articleData.excerpt || "No excerpt",
                content: articleData.content || "No content",
                category: cat as any,
                authorId: (await db.user.findFirst())?.id || "admin",
                status: autoPublish ? 'PUBLISHED' : 'DRAFT',
                publishedAt: autoPublish ? new Date() : null,
                aiAssisted: true,
                featuredImageUrl: storedImage.localPath,
                featuredImageAlt: articleData.title,
                imageSource: storedImage.source,
                verificationLevel: 'LOW' // Viral is risky
            }
        })

        await db.aiActivityLog.create({
            data: {
                action: 'discover-viral',
                articleId: newArticle.id,
                success: true,
                metadata: { trendingTopic }
            }
        })

        return NextResponse.json({ success: true, article: newArticle })

    } catch (error: any) {
        console.error('Viral Discovery Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
