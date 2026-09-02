import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

// Constants for View Counts
const VIEWS_PHASE_1_MIN = 75
const VIEWS_PHASE_1_MAX = 246
const VIEWS_PHASE_2_MIN = 263
const VIEWS_PHASE_2_MAX = 648
const VIEWS_PHASE_3_MIN = 664
const VIEWS_PHASE_3_MAX = 1480

function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// Helper to generate a date range
function getDaysArray(start: Date, end: Date) {
    const arr = []
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        arr.push(new Date(dt))
    }
    return arr
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { startDate = '2025-12-01', generate = false } = await req.json()

        // Safety check: Only allow if explicitly requested
        if (!generate) {
            return NextResponse.json({ message: 'Dry run. Set generate: true to execute.' })
        }

        const start = new Date(startDate)
        const end = new Date()
        const days = getDaysArray(start, end)

        let createdCount = 0

        // Dummy Content Templates
        const templates = [
            { title: "Tourism Boom in Kotabunan", category: "TOURISM" },
            { title: "New Investment Opportunities", category: "INVESTMENT" },
            { title: "Perkembangan Pasar Lokal", category: "GOVERNMENT" },
            { title: "Traffic Incident Report", category: "INCIDENTS" },
            { title: "Analisis Ketenagakerjaan", category: "INVESTMENT" },
            { title: "Community Opinion", category: "OPINION" }
        ]

        for (const day of days) {
            // Create 1 article for each category per day
            for (const t of templates) {
                // Calculate Age in Days
                const ageInDays = Math.floor((end.getTime() - day.getTime()) / (1000 * 3600 * 24))

                let viewCount = 0
                // Phase 1 (< 7 days)
                if (ageInDays < 7) {
                    viewCount = getRandomInt(VIEWS_PHASE_1_MIN, VIEWS_PHASE_1_MAX)
                }
                // Phase 2 (7 - 30 days)
                else if (ageInDays < 30) {
                    viewCount = getRandomInt(VIEWS_PHASE_2_MIN, VIEWS_PHASE_2_MAX)
                }
                // Phase 3 (> 30 days)
                else {
                    viewCount = getRandomInt(VIEWS_PHASE_3_MIN, VIEWS_PHASE_3_MAX)
                }

                // Create Article
                await db.article.create({
                    data: {
                        title: `${t.title} - ${day.toLocaleDateString('en-GB')}`,
                        slug: `archive-${t.category.toLowerCase()}-${day.getTime()}-${Math.random().toString(36).substring(7)}`,
                        excerpt: `Historical data archive for ${day.toLocaleDateString()}.`,
                        content: `<p>This is an archived article from ${day.toLocaleDateString()}. Content has been preserved for historical records.</p>`,
                        category: t.category as any,
                        status: 'PUBLISHED',
                        publishedAt: day,
                        createdAt: day,
                        viewCount: viewCount,
                        featuredImageUrl: `https://placehold.co/600x400?text=${t.category}+Archive`, // Placeholder for backfill
                        featuredImageAlt: "Archived News",
                        imageSource: "Jurnal Kotabunan Archive",
                        author: {
                            connectOrCreate: {
                                where: { email: 'archive@jurnal.kotabunan.com' },
                                create: { email: 'archive@jurnal.kotabunan.com', name: 'System Archive', role: 'ADMIN' }
                            }
                        }
                    }
                })
                createdCount++
            }
        }

        return NextResponse.json({ success: true, created: createdCount, message: `Backfilled ${createdCount} articles from ${startDate} to today.` })
    } catch (error) {
        console.error('Backfill Error:', error)
        return NextResponse.json({ success: false, error: 'Backfill failed' }, { status: 500 })
    }
}
