import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function validateImageUrl(url: string): Promise<boolean> {
    if (!url) return false
    if (url.includes('ibb.co')) return false // Force replace
    if (url.includes('placehold.co')) return false // Prefer better images
    if (url.includes('loremflickr')) return true // Assume valid if we just set it

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const res = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
            }
        })

        clearTimeout(timeoutId)

        if (res.status === 403 || res.status === 530) return false
        if (!res.ok) return false

        const contentType = res.headers.get('content-type')
        return contentType?.startsWith('image/') || false
    } catch (error) {
        return false
    }
}

function extractKeywords(title: string): string {
    const ignored = ['kotabunan', 'the', 'and', 'for', 'with', 'announces', 'faces', 'rising']
    return title.toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .split(' ')
        .filter(w => w.length > 3 && !ignored.includes(w))
        .slice(0, 2)
        .join(',') || 'kotabunan,news'
}

async function main() {
    console.log('🚀 Starting Force Repair (v2 - with Fallback)...')

    // 1. Get ALL articles to be safe
    const articles = await db.article.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' }
    })

    console.log(`Found ${articles.length} articles to check.`)

    let fixedCount = 0
    let skippedCount = 0

    for (const article of articles) {
        process.stdout.write(`Checking: "${article.title.substring(0, 30)}..." `)

        const isValid = await validateImageUrl(article.featuredImageUrl || '')

        if (isValid) {
            console.log('✅ OK')
            skippedCount++
            continue
        }

        console.log('❌ BROKEN -> Repairing...')

        const cleanTitle = article.title.substring(0, 50).replace(/[^a-zA-Z0-9 ]/g, '')
        const seed = Math.floor(Math.random() * 100000)

        // 1. Try Pollinations First (maybe different params work?)
        let newImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanTitle)}?nologo=true&seed=${seed}`

        // Check if Pollinations is reachable
        const isPollinationsWorking = await validateImageUrl(newImage)

        if (!isPollinationsWorking) {
            // 2. Fallback to LoremFlickr (Context Aware)
            const keywords = extractKeywords(article.title)
            // cache buster with random id
            newImage = `https://loremflickr.com/800/600/${keywords}?lock=${seed}`
            console.log(`   -> Fallback to LoremFlickr: ${keywords}`)
        } else {
            console.log(`   -> Pollinations URL valid.`)
        }

        try {
            await db.article.update({
                where: { id: article.id },
                data: {
                    featuredImageUrl: newImage,
                    imageSource: isPollinationsWorking ? 'AI-Generated Illustration' : 'Stock Photo (LoremFlickr)'
                }
            })
            fixedCount++
            await new Promise(r => setTimeout(r, 500))
        } catch (e) {
            console.error('Failed to update db:', e)
        }
    }

    console.log('\n==========================================')
    console.log(`🎉 Finished!`)
    console.log(`Checked: ${articles.length}`)
    console.log(`Fixed:   ${fixedCount}`)
    console.log('==========================================')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
