import { NextResponse } from 'next/server'

import { generateNewsArticles } from '@/lib/ai/news-generator'
import { db } from '@/lib/db'

// This endpoint is called by Vercel Cron or external schedulers
// Runs daily at 6 AM WITA (Kotabunan local time, UTC+8)
export async function GET(request: Request) {
    try {
        // Verify cron secret for security (Vercel Cron sets this header)
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get settings
        const settings = await db.aiSettings.findFirst()
        const count = settings?.dailyLimit || 3
        const autoPublish = settings?.autoPublish ?? false

        console.log(`[CRON] Starting daily news generation (Count: ${count}, Auto-Publish: ${autoPublish})...`)

        // Get admin user to author the articles
        const adminUser = await db.user.findFirst({
            where: { role: 'ADMIN' }
        })

        if (!adminUser) {
            throw new Error('No admin user found')
        }

        // Generate articles
        // Note: The generator currently defaults to PUBLISHED. 
        // We could pass an override or update the generator to handle status.
        const articles = await generateNewsArticles(count, adminUser.id)

        console.log(`[CRON] Successfully generated ${articles.length} articles`)

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            count: articles.length,
            articles: articles.map(a => ({
                id: a.id,
                title: a.title,
                category: a.category,
            })),
        })
    } catch (error) {
        console.error('[CRON] Error generating daily news:', error)
        return NextResponse.json(
            {
                error: 'Failed to generate daily news',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
