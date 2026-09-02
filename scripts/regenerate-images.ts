/**
 * Jurnal Kotabunan — Featured Image Regenerator
 *
 * Masalah: banyak artikel published punya gambar DOUBLE (URL/file identik),
 * MIRIP (secara visual, walau file-nya beda) atau TIDAK SESUAI konten berita
 * (prompt generik "kotabunan,news").
 *
 * Solusi: audit SEMUA gambar published memakai 2 lapis deteksi -
 *   1) SHA1 exact-match (file benar-benar identik)
 *   2) dHash perceptual similarity (kemiripan visual walau file beda -
 *      generator sering hasilkan komposisi yang nyaris sama untuk kategori
 *      yang sama)
 * lalu regenerate CUMA yang kena flag (bukan semua artikel), pakai prompt
 * kaya konten (kategori + judul + kata kunci excerpt) via image-service
 * terpusat, dengan jaminan tidak menghasilkan duplikat baru.
 *
 * Usage:
 *   bun scripts/regenerate-images.ts          # AUDIT saja (read-only)
 *   bun scripts/regenerate-images.ts --run    # AUDIT + regenerate yang kena flag
 */
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { generateAndStoreImage, buildImagePrompt } from '../src/lib/images/image-service'
import { checkImageSafety } from '../src/lib/ai/providers/gemini'
import type { Category } from '@prisma/client'

const RUN_MODE = process.argv.includes('--run')
const db = new PrismaClient()

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'articles')
const PUBLIC_PREFIX = '/uploads/articles'
const MAX_ATTEMPTS = 3 // percobaan anti-duplikat per artikel
const POLITENESS_MS = 1200

// dHash Hamming distance out of 64 bits. <=8 is the commonly-used cutoff for
// "visually near-identical" (vs. exact byte match, which SHA1 already
// catches separately) - low enough to avoid flagging merely-same-category
// photos, high enough to catch generators repeating a near-identical
// composition.
const SIMILARITY_THRESHOLD = 8

/**
 * 64-bit difference-hash (dHash): shrink to 9x8 grayscale, then for each row
 * set 1 bit per pixel-pair based on whether brightness decreases left-to-
 * right. Two images with a small Hamming distance between their hashes look
 * visually similar, independent of exact file encoding/compression.
 */
async function perceptualHash(buffer: Buffer): Promise<bigint> {
  const { data } = await sharp(buffer)
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let hash = BigInt(0)
  let bit = BigInt(0)
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col]
      const right = data[row * 9 + col + 1]
      if (left > right) hash |= BigInt(1) << bit
      bit++
    }
  }
  return hash
}

function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b
  let count = 0
  while (xor > BigInt(0)) {
    count += Number(xor & BigInt(1))
    xor >>= BigInt(1)
  }
  return count
}

// Category/keyword/title-snippet prompt logic lives in image-service.ts
// (buildImagePrompt) now, shared with live generation - this script just
// adds a per-attempt "alternative angle" suffix on top for anti-duplicate
// retries.
function buildPrompt(category: Category, title: string, excerpt: string, variant: number): string {
  const angle = variant > 0 ? `, alternative editorial angle ${variant + 1}` : ''
  return `${buildImagePrompt(title, category, excerpt)}${angle}`
}

const sha1 = (buf: Buffer) => crypto.createHash('sha1').update(buf).digest('hex')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Hash semua file lokal existing → untuk deteksi & pencegahan duplikat. */
async function buildExistingHashSet(): Promise<Map<string, string>> {
  const map = new Map<string, string>() // hash -> publicPath
  try {
    const files = await fs.readdir(UPLOAD_DIR)
    for (const f of files) {
      try {
        const buf = await fs.readFile(path.join(UPLOAD_DIR, f))
        map.set(sha1(buf), `${PUBLIC_PREFIX}/${f}`)
      } catch { /* skip unreadable */ }
    }
  } catch { /* folder belum ada */ }
  return map
}

interface AuditRow {
  id: string
  title: string
  category: Category
  url: string | null
  kind: 'LOCAL' | 'HOTLINK' | 'MISSING'
  duplicateOf: string | null // judul artikel lain yang gambarnya identik/mirip
  duplicateKind: 'exact' | 'similar' | null
  nsfw: boolean
  nsfwReason: string | null
}

function classify(url: string | null): AuditRow['kind'] {
  if (!url || !url.trim()) return 'MISSING'
  return url.startsWith(PUBLIC_PREFIX) ? 'LOCAL' : 'HOTLINK'
}

async function main() {
  console.log('='.repeat(72))
  console.log(`🖼️  Jurnal Kotabunan Image Regenerator — mode: ${RUN_MODE ? 'REGENERATE 🛠️' : 'AUDIT ONLY 🔍'}`)
  console.log('='.repeat(72))

  const articles = await db.article.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, category: true, excerpt: true, featuredImageUrl: true },
  })
  console.log(`\nArtikel PUBLISHED: ${articles.length}\n`)

  // ------------------------------ FASE 1: AUDIT ----------------------------
  const rows: AuditRow[] = []
  const hashToTitle = new Map<string, string>()
  const urlToTitle = new Map<string, string>()
  const phashSeen: Array<{ title: string; phash: bigint }> = []
  const existingHashes = await buildExistingHashSet()
  console.log(`File lokal existing di ${PUBLIC_PREFIX}: ${existingHashes.size}\n`)
  console.log('🔎 Menghitung perceptual hash + cek NSFW tiap gambar lokal (dHash threshold ≤' + SIMILARITY_THRESHOLD + ', vision safety check via Gemini)...\n')

  for (let idx = 0; idx < articles.length; idx++) {
    const a = articles[idx]
    const row: AuditRow = {
      id: a.id, title: a.title, category: a.category,
      url: a.featuredImageUrl, kind: classify(a.featuredImageUrl), duplicateOf: null, duplicateKind: null,
      nsfw: false, nsfwReason: null,
    }

    // Duplikat berdasarkan URL identik antar artikel
    if (a.featuredImageUrl && urlToTitle.has(a.featuredImageUrl)) {
      row.duplicateOf = urlToTitle.get(a.featuredImageUrl)!
      row.duplicateKind = 'exact'
    } else if (a.featuredImageUrl) {
      urlToTitle.set(a.featuredImageUrl, a.title)
    }

    // Duplikat berdasarkan konten byte ATAU kemiripan visual, DAN cek NSFW (untuk gambar lokal)
    if (row.kind === 'LOCAL') {
      try {
        const buf = await fs.readFile(path.join(UPLOAD_DIR, path.basename(a.featuredImageUrl!)))
        const h = sha1(buf)
        if (!row.duplicateOf && hashToTitle.has(h)) {
          row.duplicateOf = hashToTitle.get(h)!
          row.duplicateKind = 'exact'
        }
        if (!hashToTitle.has(h)) hashToTitle.set(h, a.title)

        if (!row.duplicateOf) {
          const phash = await perceptualHash(buf)
          for (const seen of phashSeen) {
            if (hammingDistance(phash, seen.phash) <= SIMILARITY_THRESHOLD) {
              row.duplicateOf = seen.title
              row.duplicateKind = 'similar'
              break
            }
          }
          phashSeen.push({ title: a.title, phash })
        }

        // NSFW check jalan untuk SEMUA gambar lokal (bukan cuma yang belum
        // kena flag duplikat) - gambar-gambar ini di-generate SEBELUM gate
        // NSFW ada di pipeline, jadi status duplikat tidak menjamin aman.
        const mimeType = a.featuredImageUrl!.endsWith('.png') ? 'image/png' : 'image/jpeg'
        const safety = await checkImageSafety(buf, mimeType)
        if (!safety.safe) {
          row.nsfw = true
          row.nsfwReason = safety.reason
        }
      } catch { /* file hilang → akan terdeteksi sebagai rusak saat regen */ }
    }

    process.stdout.write(`\r   ${idx + 1}/${articles.length} dicek...`)
    rows.push(row)
  }
  console.log('')

  const stats = {
    total: rows.length,
    local: rows.filter((r) => r.kind === 'LOCAL').length,
    hotlink: rows.filter((r) => r.kind === 'HOTLINK').length,
    missing: rows.filter((r) => r.kind === 'MISSING').length,
    exactDup: rows.filter((r) => r.duplicateKind === 'exact').length,
    similarDup: rows.filter((r) => r.duplicateKind === 'similar').length,
    nsfw: rows.filter((r) => r.nsfw).length,
  }

  console.log('\n📊 AUDIT:')
  console.log(`   ✅ Lokal        : ${stats.local}`)
  console.log(`   🔗 Hotlink      : ${stats.hotlink}`)
  console.log(`   ⬛ Tanpa URL    : ${stats.missing}`)
  console.log(`   👯 Duplikat exact  : ${stats.exactDup}`)
  console.log(`   🪞 Mirip (visual)  : ${stats.similarDup}`)
  console.log(`   🔞 NSFW/tidak pantas : ${stats.nsfw}`)

  if (stats.exactDup + stats.similarDup > 0) {
    console.log('\n👥 Pasangan bermasalah (duplikat/mirip):')
    rows.filter((r) => r.duplicateOf).forEach((r, i) => {
      const tag = r.duplicateKind === 'exact' ? '🟰 identik' : '🪞 mirip'
      console.log(`   ${i + 1}. [${tag}] "${r.title.slice(0, 55)}"`)
      console.log(`      ≈ sama dengan: "${r.duplicateOf!.slice(0, 55)}"`)
    })
  }

  if (stats.nsfw > 0) {
    console.log('\n🔞 Gambar NSFW/tidak pantas (WAJIB diganti):')
    rows.filter((r) => r.nsfw).forEach((r, i) => {
      console.log(`   ${i + 1}. "${r.title.slice(0, 55)}"`)
      console.log(`      alasan: ${r.nsfwReason}`)
    })
  }

  const flaggedRows = rows.filter((r) => r.duplicateOf || r.nsfw)

  if (!RUN_MODE) {
    console.log(`\n💡 Jalankan ulang dengan --run untuk regenerate ${flaggedRows.length} gambar yang kena flag (exact + mirip + NSFW):`)
    console.log('   bun scripts/regenerate-images.ts --run')
    return
  }

  if (flaggedRows.length === 0) {
    console.log('\n✅ Tidak ada gambar duplikat/mirip/NSFW yang perlu diganti.')
    return
  }

  // --------------------------- FASE 2: REGENERATE ---------------------------
  console.log(`\n🛠️  REGENERATE ${flaggedRows.length} gambar yang kena flag (anti-duplikat aktif, max ${MAX_ATTEMPTS} percobaan/artikel)...\n`)

  const articleById = new Map(articles.map((a) => [a.id, a]))
  let done = 0, keptOldOnFail = 0, failed = 0

  for (let i = 0; i < flaggedRows.length; i++) {
    const row = flaggedRows[i]
    const meta = articleById.get(row.id)!
    const reasonTag = row.nsfw ? '🔞 nsfw' : row.duplicateKind === 'exact' ? '🟰 identik' : '🪞 mirip'
    console.log(`▶ [${i + 1}/${flaggedRows.length}] (${row.category}) [${reasonTag}] "${row.title.slice(0, 50)}"`)

    let finalPath: string | null = null
    let finalSource = ''

    for (let attempt = 0; attempt < MAX_ATTEMPTS && !finalPath; attempt++) {
      const prompt = buildPrompt(meta.category, meta.title, meta.excerpt, attempt)
      process.stdout.write(`   ⏳ percobaan ${attempt + 1}/${MAX_ATTEMPTS}... `)
      const stored = await generateAndStoreImage(meta.title, prompt)
      if (!stored.localPath) { console.log('❌ semua sumber gagal'); break }

      // Verifikasi ANTI-DUPLIKAT: hash file baru tidak boleh sama dengan
      // gambar artikel mana pun (existing maupun yang baru dibuat di run ini)
      const filePath = path.join(process.cwd(), 'public', stored.localPath.replace(/^\//, ''))
      const h = sha1(await fs.readFile(filePath))
      if (existingHashes.has(h)) {
        console.log(`👯 duplikat dari "${existingHashes.get(h)!.slice(0, 45)}" → coba lagi`)
        await fs.unlink(filePath).catch(() => {})
        continue
      }
      existingHashes.set(h, stored.localPath)
      finalPath = stored.localPath
      // NOTE: keep this field public-facing (it renders as the photo credit
      // under the article's featured image) - no internal/debug text like a
      // regen timestamp belongs in it. That info stays in this script's log.
      finalSource = stored.source
      console.log(`✅ unik → ${stored.localPath} (regen ${new Date().toISOString().slice(0, 10)})`)
    }

    if (!finalPath) {
      if (row.url) { keptOldOnFail++; console.log('   ↩︎ gambar lama dipertahankan (semua percobaan gagal)') }
      else { failed++; console.log('   💔 artikel tetap tanpa gambar') }
      continue
    }

    // Hapus file lama yang digantikan (hindari sampah orphan)
    if (row.kind === 'LOCAL' && row.url && row.url !== finalPath) {
      const oldFile = path.join(UPLOAD_DIR, path.basename(row.url))
      await fs.unlink(oldFile).catch(() => {})
    }

    await db.article.update({
      where: { id: row.id },
      data: { featuredImageUrl: finalPath, imageSource: finalSource },
    })
    done++
    console.log(`   💾 DB updated (old: ${(row.url || '-').slice(0, 60)})`)

    await sleep(POLITENESS_MS)
  }

  console.log('\n' + '='.repeat(72))
  console.log(`🏁 SELESAI: ${done} diganti | ${keptOldOnFail} dipertahankan | ${failed} gagal total`)
  console.log('='.repeat(72))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
