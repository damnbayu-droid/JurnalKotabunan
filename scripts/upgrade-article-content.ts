/**
 * Jurnal Kotabunan — Article Content Upgrade Pass
 *
 * The whole PUBLISHED backlog is well under the site's own stated standard
 * (avg ~294 words, longest only 491, vs. the "800-1200 word, AP-style"
 * spec) and a chunk of it still carries generic report-template headings
 * ("The Key Players", "Jurnal Kotabunan Analysis", "Chronology & Activities", ...)
 * that never got caught by the earlier exact-7-label scaffold cleanup.
 *
 * This does a full rewrite pass per article: same title/category/slug (so
 * URLs and SEO stay intact), same underlying facts, but written fresh to
 * the current NEWS_STYLE_RULES standard (length, no template headings,
 * natural quotes). A JSON backup of the original excerpt+content is written
 * first.
 *
 * Usage:
 *   npx tsx scripts/upgrade-article-content.ts          # AUDIT only
 *   npx tsx scripts/upgrade-article-content.ts --run    # AUDIT + upgrade
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { myaiCompleteJSON } from '../src/lib/ai/myaiClient'
import { pickWritingStyle } from '../src/lib/ai/journalism-style'

const RUN_MODE = process.argv.includes('--run')
const db = new PrismaClient()

function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ')
  return text.trim().split(/\s+/).filter(Boolean).length
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  console.log('='.repeat(72))
  console.log(`📰 Jurnal Kotabunan Article Content Upgrade — mode: ${RUN_MODE ? 'UPGRADE 🛠️' : 'AUDIT ONLY 🔍'}`)
  console.log('='.repeat(72))

  const articles = await db.article.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true, category: true, excerpt: true, content: true },
  })

  console.log(`\nArtikel PUBLISHED: ${articles.length}`)
  const below600 = articles.filter((a) => wordCount(a.content) < 600)
  console.log(`Di bawah standar (< 600 kata): ${below600.length}\n`)

  if (!RUN_MODE) {
    articles
      .map((a) => ({ title: a.title, words: wordCount(a.content) }))
      .sort((a, b) => a.words - b.words)
      .forEach((a, i) => console.log(`  ${i + 1}. ${a.words}w — "${a.title.slice(0, 60)}"`))
    console.log('\n💡 Jalankan ulang dengan --run untuk upgrade SEMUA artikel PUBLISHED:')
    console.log('   npx tsx scripts/upgrade-article-content.ts --run')
    return
  }

  const backupPath = path.join(process.cwd(), 'scripts', `content-upgrade-backup-${Date.now()}.json`)
  await fs.writeFile(backupPath, JSON.stringify(articles, null, 2))
  console.log(`💾 Backup ditulis ke: ${backupPath}\n`)

  let done = 0
  let failed = 0

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i]
    const before = wordCount(a.content)
    console.log(`▶ [${i + 1}/${articles.length}] (${before}w) "${a.title.slice(0, 55)}"`)

    try {
      const prompt = `You are a senior editor at Jurnal Kotabunan rewriting a thin, underdeveloped draft into a full professional news article.

Title (KEEP EXACTLY AS-IS - do not change it): ${a.title}
Category: ${a.category}

Existing draft (contains the core facts/story - use them, do not contradict them, but you may add standard, uncontroversial contextual detail a real reporter would include - e.g. background on Bali tourism/economy/government trends, plausible reactions, next steps):
${a.content}

${pickWritingStyle().rules}

Return ONLY a valid JSON object: { "excerpt": "A powerful 2-sentence summary", "content": "The full rewritten article as HTML (<p>, <h3> sparingly)" }`

      const result = await myaiCompleteJSON<{ excerpt?: string; content?: string }>('content_journalist', [
        {
          role: 'system',
          content: 'You are an award-winning journalist. Output strictly valid JSON.',
        },
        { role: 'user', content: prompt },
      ])

      if (!result.content || wordCount(result.content) < 400) {
        throw new Error(`AI returned too-short content (${result.content ? wordCount(result.content) : 0}w)`)
      }

      await db.article.update({
        where: { id: a.id },
        data: {
          content: result.content,
          excerpt: result.excerpt || a.excerpt,
        },
      })
      done++
      console.log(`   ✅ upgraded: ${before}w -> ${wordCount(result.content)}w`)
    } catch (error) {
      failed++
      console.error(`   ❌ failed: ${error instanceof Error ? error.message : error}`)
    }

    await sleep(1500)
  }

  console.log('\n' + '='.repeat(72))
  console.log(`🏁 SELESAI: ${done} di-upgrade | ${failed} gagal (dari ${articles.length})`)
  console.log('='.repeat(72))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
