/**
 * Jurnal Kotabunan — Deterministic Scaffold-Heading Stripper
 *
 * The AI rewrite pass (rewrite-scaffold-content.ts) turned out unreliable:
 * for a lot of articles it just echoed the same "<h3>LEAD (The Hook)</h3>"
 * style labels back unchanged despite explicit instructions to remove them.
 *
 * These 7 label strings are always exact, always wrapped in their own
 * <h3>...</h3>, and never legitimate editorial content on their own - so
 * instead of trusting the model again, just delete the heading elements
 * outright. The <p> paragraphs around them already contain the real prose,
 * so the article reads as continuous flowing text afterward (which is
 * normal for a real AP-style piece - most don't use subheads at all).
 *
 * Usage:
 *   npx tsx scripts/strip-scaffold-headings.ts          # AUDIT only
 *   npx tsx scripts/strip-scaffold-headings.ts --run    # AUDIT + fix
 */
import { PrismaClient } from '@prisma/client'

const RUN_MODE = process.argv.includes('--run')
const db = new PrismaClient()

const LABELS = [
  'LEAD \\(The Hook\\)',
  'THE FACTS \\(Body\\)',
  'KEY QUOTES',
  'BACKGROUND/CONTEXT',
  'IMPACT',
  'OPPOSING VIEWS',
  'CONCLUSION/LOOKING AHEAD',
]

// Matches "<h3[ ...]>LABEL</h3>" (any heading level, optional attrs/whitespace)
const HEADING_RE = new RegExp(
  `\\s*<h[1-6][^>]*>\\s*(?:${LABELS.join('|')})\\s*</h[1-6]>\\s*`,
  'gi'
)

async function main() {
  const articles = await db.article.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true, content: true },
  })

  const affected = articles.filter((a) => HEADING_RE.test(a.content))
  // reset lastIndex after .test() with the global flag
  HEADING_RE.lastIndex = 0

  console.log(`Artikel PUBLISHED: ${articles.length}`)
  console.log(`Masih ada heading scaffold literal: ${affected.length}\n`)
  affected.forEach((a, i) => console.log(`  ${i + 1}. "${a.title.slice(0, 65)}"`))

  if (!RUN_MODE) {
    console.log('\n💡 Jalankan ulang dengan --run untuk menghapus heading di atas.')
    return
  }

  let fixed = 0
  for (const a of affected) {
    const cleaned = a.content.replace(HEADING_RE, '')
    await db.article.update({ where: { id: a.id }, data: { content: cleaned } })
    fixed++
    console.log(`✅ "${a.title.slice(0, 60)}"`)
  }

  console.log(`\n🏁 SELESAI: ${fixed} artikel dibersihkan.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
