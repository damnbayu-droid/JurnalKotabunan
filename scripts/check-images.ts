/**
 * Jurnal Kotabunan — Featured Image Auditor & Repair Tool
 *
 * Checks every article's featured image EXACTLY like a browser would:
 * HTTP status + content-type + image magic-bytes verification.
 *
 * Usage:
 *   bun scripts/check-images.ts           # audit only (read-only, safe)
 *   bun scripts/check-images.ts --fix     # audit + repair broken/missing images one-by-one
 */
import { PrismaClient } from '@prisma/client'

const FIX_MODE = process.argv.includes('--fix')
const db = new PrismaClient()

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasImageMagicBytes(buf: Uint8Array): boolean {
  if (buf.length < 4) return false
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  // GIF: GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true
  // WEBP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  )
    return true
  return false
}

interface CheckResult {
  ok: boolean
  reason: string
}

/** Download the beginning of the image and verify it is really an image. */
async function checkImageUrl(url: string, timeoutMs = 15000): Promise<CheckResult> {
  if (!url || !url.trim()) return { ok: false, reason: 'MISSING (no URL)' }

  try {
    new URL(url)
  } catch {
    return { ok: false, reason: 'INVALID URL FORMAT' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'image/*,image/apng,image/webp,*/*;q=0.8',
        Range: 'bytes=0-2047',
      },
    })

    if (!res.ok && res.status !== 206) {
      return { ok: false, reason: `HTTP ${res.status}` }
    }

    const contentType = res.headers.get('content-type') || ''
    const buf = new Uint8Array(await res.arrayBuffer())

    if (contentType.startsWith('image/') || hasImageMagicBytes(buf)) {
      return { ok: true, reason: `OK (${contentType.split(';')[0] || 'via magic-bytes'})` }
    }

    return {
      ok: false,
      reason: `NOT AN IMAGE (content-type="${contentType || 'unknown'}", http ${res.status})`,
    }
  } catch (err: any) {
    const msg =
      err?.name === 'AbortError'
        ? `TIMEOUT after ${timeoutMs}ms`
        : String(err?.message || err || 'FETCH ERROR').slice(0, 80)
    return { ok: false, reason: msg }
  } finally {
    clearTimeout(timer)
  }
}

function extractKeywords(title: string): string {
  const ignored = [
    'kotabunan', 'the', 'and', 'for', 'with', 'announces', 'faces', 'rising',
    'amid', 'from', 'into', 'after', 'over', 'amongs', 'new', 'says', 'said',
  ]
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .filter((w) => w.length > 3 && !ignored.includes(w))
  return (words.slice(0, 2).join(',') || 'kotabunan,news')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// Repair candidates (every candidate is VERIFIED before touching the database)
// ---------------------------------------------------------------------------

async function tryPollinations(title: string): Promise<string | null> {
  const cleanTitle = title.substring(0, 60).replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

  const prompts = [
    `journalistic photo, ${cleanTitle}, kotabunan north sulawesi indonesia, realistic photography, natural light`,
    `${cleanTitle}`,
  ]

  for (let i = 0; i < prompts.length; i++) {
    const seed = Math.floor(Math.random() * 100000)
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompts[i])}?width=1200&height=800&nologo=true&seed=${seed}`
    process.stdout.write(`      ⏳ Pollinations attempt ${i + 1}/2 (seed=${seed})... `)
    const result = await checkImageUrl(url, 45000) // AI generation can be slow
    console.log(result.ok ? '✅ valid' : `❌ ${result.reason}`)
    if (result.ok) return url
  }
  return null
}

async function tryLoremFlickr(title: string): Promise<string | null> {
  const keywords = extractKeywords(title)
  const lock = Math.floor(Math.random() * 100000)
  const url = `https://loremflickr.com/1200/800/${keywords}?lock=${lock}`
  process.stdout.write(`      ⏳ LoremFlickr fallback (kw="${keywords}")... `)
  const result = await checkImageUrl(url, 20000)
  console.log(result.ok ? '✅ valid' : `❌ ${result.reason}`)
  return result.ok ? url : null
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70))
  console.log(`🖼️  Jurnal Kotabunan Image Checker — mode: ${FIX_MODE ? 'AUDIT + FIX 🛠️' : 'AUDIT ONLY 🔍'}`)
  console.log('='.repeat(70))

  const articles = await db.article.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      featuredImageUrl: true,
      imageSource: true,
      createdAt: true,
    },
  })

  console.log(`\nFound ${articles.length} articles in database.\n`)

  interface Row {
    idx: number
    id: string
    title: string
    slug: string
    status: string
    oldUrl: string | null
    oldSource: string | null
    result: CheckResult
  }

  const rows: Row[] = []
  const urlCache = new Map<string, CheckResult>()

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i]
    let result: CheckResult

    if (!a.featuredImageUrl) {
      result = { ok: false, reason: 'MISSING (no URL)' }
    } else if (urlCache.has(a.featuredImageUrl)) {
      result = urlCache.get(a.featuredImageUrl)!
      console.log(
        `[${i + 1}/${articles.length}] ♻️  cached → ${result.ok ? '✅' : '❌'} "${a.title.slice(0, 48)}"`
      )
    } else {
      process.stdout.write(`[${i + 1}/${articles.length}] 🔎 checking "${a.title.slice(0, 48)}"... `)
      result = await checkImageUrl(a.featuredImageUrl)
      urlCache.set(a.featuredImageUrl, result)
      console.log(result.ok ? `✅ ${result.reason}` : `❌ ${result.reason}`)
    }

    rows.push({
      idx: i + 1,
      id: a.id,
      title: a.title,
      slug: a.slug,
      status: a.status,
      oldUrl: a.featuredImageUrl,
      oldSource: a.imageSource,
      result,
    })
  }

  const broken = rows.filter((r) => !r.result.ok)
  const okCount = rows.length - broken.length

  // ------------------------------ Summary ---------------------------------
  console.log('\n' + '='.repeat(70))
  console.log(`📊 SUMMARY: ${rows.length} checked | ✅ ${okCount} OK | ❌ ${broken.length} broken`)
  console.log('='.repeat(70))

  if (broken.length > 0) {
    console.log('\nBroken articles:')
    broken.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.status}] "${r.title.slice(0, 60)}"`)
      console.log(`     Reason : ${r.result.reason}`)
      console.log(`     URL    : ${(r.oldUrl || '(empty)').slice(0, 100)}`)
      console.log(`     Source : ${r.oldSource || '-'}`)
    })
  }

  // -------------------------------- Fix -----------------------------------
  if (!FIX_MODE) {
    if (broken.length > 0) {
      console.log('\n💡 Run again with --fix to repair them one-by-one:')
      console.log('   bun scripts/check-images.ts --fix')
    } else {
      console.log('\n🎉 All images are healthy. Nothing to repair.')
    }
    return
  }

  if (broken.length === 0) {
    console.log('\n🎉 All images are healthy. Nothing to repair.')
    return
  }

  console.log(`\n🛠️  REPAIRING ${broken.length} article(s), one-by-one...\n`)

  let fixed = 0
  let failed = 0

  for (const row of broken) {
    console.log(`\n▶ [FIX ${fixed + failed + 1}/${broken.length}] "${row.title.slice(0, 60)}"`)

    let newUrl = await tryPollinations(row.title)

    if (!newUrl) {
      newUrl = await tryLoremFlickr(row.title)
    }

    if (!newUrl) {
      failed++
      console.log('      💔 All providers failed — leaving this article untouched.')
      continue
    }

    try {
      await db.article.update({
        where: { id: row.id },
        data: {
          featuredImageUrl: newUrl,
          imageSource: 'AI-Generated Illustration',
        },
      })
      fixed++
      console.log(`      💾 Database updated.`)
      console.log(`         old: ${(row.oldUrl || '(empty)').slice(0, 90)}`)
      console.log(`         new: ${newUrl.slice(0, 90)}...`)
    } catch (e) {
      failed++
      console.error('      ❌ DB UPDATE FAILED:', e)
    }

    await sleep(800) // be gentle with rate limits
  }

  console.log('\n' + '='.repeat(70))
  console.log(`🏁 REPAIR FINISHED: ${fixed} fixed, ${failed} failed, ${okCount} were already OK`)
  console.log('='.repeat(70))

  if (failed > 0) {
    console.log('⚠️  Some articles could not be repaired (all providers down). Re-run later.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
