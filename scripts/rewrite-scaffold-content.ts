/**
 * Jurnal Kotabunan — Scaffold-Label Content Rewriter
 *
 * Problem: articles generated before the news-generator.ts prompt fix
 * literally printed their own internal writing-structure labels as visible
 * headings ("LEAD (The Hook)", "THE FACTS (Body)", "KEY QUOTES",
 * "BACKGROUND/CONTEXT", "OPPOSING VIEWS", "CONCLUSION/LOOKING AHEAD", ...) -
 * it reads like a filled-in worksheet instead of a real news article.
 *
 * Fix: send each affected article's existing content back through the AI
 * with the corrected style rules, asking it to rewrite it as continuous,
 * professional prose - same facts/quotes/names, no scaffold labels. A JSON
 * backup of the original content is written first so this is reversible.
 *
 * Usage:
 *   npx tsx scripts/rewrite-scaffold-content.ts          # AUDIT only (read-only)
 *   npx tsx scripts/rewrite-scaffold-content.ts --run    # AUDIT + rewrite one-by-one
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { myaiCompleteJSON } from '../src/lib/ai/myaiClient'
import { pickWritingStyle } from '../src/lib/ai/journalism-style'

const RUN_MODE = process.argv.includes('--run')
const db = new PrismaClient()

const SCAFFOLD_LABELS = [
  'LEAD (The Hook)',
  'THE FACTS (Body)',
  'KEY QUOTES',
  'BACKGROUND/CONTEXT',
  'OPPOSING VIEWS',
  'CONCLUSION/LOOKING AHEAD',
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  console.log('='.repeat(72))
  console.log(`📰 Jurnal Kotabunan Scaffold-Label Content Rewriter — mode: ${RUN_MODE ? 'REWRITE 🛠️' : 'AUDIT ONLY 🔍'}`)
  console.log('='.repeat(72))

  const articles = await db.article.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, slug: true, title: true, content: true },
  })

  const affected = articles.filter((a) => SCAFFOLD_LABELS.some((l) => a.content.includes(l)))
  console.log(`\nArtikel PUBLISHED: ${articles.length}`)
  console.log(`Terkena label scaffold literal: ${affected.length}\n`)

  if (affected.length === 0) {
    console.log('Tidak ada yang perlu diperbaiki.')
    return
  }

  affected.forEach((a, i) => console.log(`  ${i + 1}. "${a.title.slice(0, 65)}"`))

  if (!RUN_MODE) {
    console.log('\n💡 Jalankan ulang dengan --run untuk menulis ulang SEMUA artikel di atas:')
    console.log('   npx tsx scripts/rewrite-scaffold-content.ts --run')
    return
  }

  // --- backup before touching anything ---
  const backupPath = path.join(process.cwd(), 'scripts', `content-backup-${Date.now()}.json`)
  await fs.writeFile(backupPath, JSON.stringify(affected, null, 2))
  console.log(`\n💾 Backup ditulis ke: ${backupPath}\n`)

  let done = 0
  let failed = 0

  for (let i = 0; i < affected.length; i++) {
    const a = affected[i]
    console.log(`▶ [${i + 1}/${affected.length}] "${a.title.slice(0, 60)}"`)

    try {
      const result = await myaiCompleteJSON<{ content?: string }>('content_journalist', [
        {
          role: 'system',
          content: `You are a senior editor at Jurnal Kotabunan rewriting a draft that a junior AI writer produced with visible internal planning labels still in the text. Rewrite it into a clean, professional news article - same facts, quotes, names, and numbers, just restructured as real prose.

${pickWritingStyle().rules}

Return ONLY a valid JSON object: { "content": "The rewritten article as HTML (<p>, <h3> sparingly)" }`,
        },
        {
          role: 'user',
          content: `Title: ${a.title}\n\nDraft with scaffold labels still visible:\n${a.content}`,
        },
      ])

      if (!result.content || result.content.length < 200) {
        throw new Error('AI returned empty/too-short content')
      }

      await db.article.update({ where: { id: a.id }, data: { content: result.content } })
      done++
      console.log('   ✅ rewritten & saved')
    } catch (error) {
      failed++
      console.error(`   ❌ failed: ${error instanceof Error ? error.message : error}`)
    }

    await sleep(1500)
  }

  console.log('\n' + '='.repeat(72))
  console.log(`🏁 SELESAI: ${done} ditulis ulang | ${failed} gagal (dari ${affected.length})`)
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
