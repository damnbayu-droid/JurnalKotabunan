import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateNewsArticles } from '@/lib/ai/news-generator'
import type { Category } from '@prisma/client'

/**
 * Real trigger for the admin "Smart Schedule" card (src/components/admin/
 * schedule-card.tsx). Runs every 10 minutes via Vercel Cron (see
 * vercel.json).
 *
 * BUG FIXED (2026-09-02): ScheduleConfig rows were saved with a `time`
 * field but NOTHING ever read it to decide when to generate - the only
 * code path that touched ScheduleConfig (src/app/api/ai/assistant/route.ts,
 * action:'schedule') was unreachable from any UI (grepped the whole
 * codebase - no client ever sends that action) and even if it were
 * reachable, it ignored `time` entirely and called generateNewsArticles()
 * with no category, so `selectRandomCategory()` picked randomly regardless
 * of which category the check thought was under-covered. This is a real,
 * from-scratch replacement, not a patch of that dead code.
 */

const SITE_TZ = 'Asia/Makassar' // WITA, UTC+8, no DST - matches Kotabunan (North Sulawesi) local time

function getBaliNow(): { hhmm: string; dateStr: string; minutesSinceMidnight: number } {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: SITE_TZ,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]))
    const hour = parseInt(parts.hour, 10)
    const minute = parseInt(parts.minute, 10)
    return {
        hhmm: `${parts.hour}:${parts.minute}`,
        dateStr: `${parts.year}-${parts.month}-${parts.day}`,
        minutesSinceMidnight: hour * 60 + minute,
    }
}

function parseHHMM(value: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
    if (!match) return null
    const h = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    if (h > 23 || m > 59) return null
    return h * 60 + m
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { hhmm, dateStr, minutesSinceMidnight } = getBaliNow()
    const results: { id: string; label: string; time: string; ran: boolean; reason?: string; count?: number }[] = []

    try {
        const schedules = await db.scheduleConfig.findMany({ where: { isActive: true } })

        for (const schedule of schedules) {
            if (schedule.lastRunDate === dateStr) {
                results.push({ id: schedule.id, label: schedule.label, time: schedule.time, ran: false, reason: 'already ran today' })
                continue
            }

            const scheduleMinutes = parseHHMM(schedule.time)
            if (scheduleMinutes === null) {
                results.push({ id: schedule.id, label: schedule.label, time: schedule.time, ran: false, reason: 'invalid time format' })
                continue
            }

            // Due if the scheduled time has passed within the last 10 minutes
            // (this cron's own interval) - catches it on the very next tick
            // without needing per-minute cron granularity.
            const diff = minutesSinceMidnight - scheduleMinutes
            if (diff < 0 || diff >= 10) {
                results.push({ id: schedule.id, label: schedule.label, time: schedule.time, ran: false, reason: `not due yet (now ${hhmm})` })
                continue
            }

            // Mark as run BEFORE generating (not after) so a slow generation
            // straddling two cron ticks can't double-trigger the same slot.
            await db.scheduleConfig.update({ where: { id: schedule.id }, data: { lastRunDate: dateStr } })

            try {
                const settings = await db.aiSettings.findFirst()
                const autoPublish = settings?.autoPublish ?? false
                const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } })
                if (!adminUser) throw new Error('No admin user found to author scheduled articles')

                const articles = await generateNewsArticles(
                    schedule.slots,
                    adminUser.id,
                    autoPublish ? 'PUBLISHED' : 'DRAFT',
                    (schedule.category as Category | null) ?? undefined
                )
                results.push({ id: schedule.id, label: schedule.label, time: schedule.time, ran: true, count: articles.length })
            } catch (genError) {
                console.error(`[schedule-check] Generation failed for schedule "${schedule.label}":`, genError)
                results.push({ id: schedule.id, label: schedule.label, time: schedule.time, ran: false, reason: 'generation error' })
            }
        }

        return NextResponse.json({ success: true, baliTime: hhmm, results })
    } catch (error) {
        console.error('[schedule-check] Error:', error)
        return NextResponse.json({ error: 'Schedule check failed', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 })
    }
}
