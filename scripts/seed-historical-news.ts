/**
 * One-off: turn seedrisetjurnalkotabunan 2.md (the historical-news research
 * doc) into published articles.
 *
 * - Parses the per-Field markdown tables.
 * - For each dated entry, generates a full Bahasa Indonesia article from the
 *   doc's own title + summary + verification note + source links (NOT by
 *   fetching the URLs - the doc was built to be written from).
 * - publishedAt AND createdAt are set to the entry's real date.
 * - No images (backfill later via scripts/regenerate-images.ts).
 * - Idempotent: an entry whose slug already exists is skipped, so re-runs
 *   only fill gaps.
 *
 * SKIPPED on purpose:
 *   - Panang section 6a (colonial/oral-history rows, several single-blog
 *     sourced and explicitly "bukan untuk ditulis seolah fakta").
 *   - Opini section (no entry meets the real-social-media-link bar).
 *   - Rows whose "Catatan Verifikasi" says only a headline was found /
 *     content unverified - writing a full article there would be fabrication.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/seed-historical-news.ts            # dry run (parse only)
 *   npx tsx --env-file=.env scripts/seed-historical-news.ts --write    # generate + insert
 *   npx tsx --env-file=.env scripts/seed-historical-news.ts --write --limit 3
 *   npx tsx --env-file=.env scripts/seed-historical-news.ts --write --only PANANG,ENVIRONMENT
 */

import { readFileSync } from 'node:fs'
import { db } from '@/lib/db'
import { myaiCompleteJSON } from '@/lib/ai/myaiClient'
import { analyzeLegalRisk } from '@/lib/ai/legal-risk'
import type { Category, RiskLevel } from '@prisma/client'

const DOC = 'seedrisetjurnalkotabunan 2.md'
const ARGV = process.argv.slice(2)
const WRITE = ARGV.includes('--write')
function flagVal(name: string): string {
    const eq = ARGV.find((a) => a.startsWith(`${name}=`))
    if (eq) return eq.split('=').slice(1).join('=')
    const idx = ARGV.indexOf(name)
    return idx >= 0 ? (ARGV[idx + 1] ?? '') : ''
}
const LIMIT = Number(flagVal('--limit')) || 0
const ONLY = flagVal('--only').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)

const FIELD_TO_CATEGORY: Record<string, Category> = {
    'PEMERINTAH': 'GOVERNMENT',
    'INVESTASI': 'INVESTMENT',
    'PARIWISATA': 'TOURISM',
    'INSIDEN': 'INCIDENTS',
    'LINGKUNGAN HIDUP': 'ENVIRONMENT',
    'PANANG': 'PANANG',
    'INTERNASIONAL': 'INTERNATIONAL',
    'TEKNOLOGI': 'TECHNOLOGY',
    // OPINI intentionally omitted - no usable entries.
}

// Legal-risk screening only for the beats that carry attributed allegations.
const SCREEN_CATEGORIES = new Set<Category>(['PANANG', 'ENVIRONMENT', 'INCIDENTS'])

const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
    jul: 6, agu: 7, ags: 7, sep: 8, okt: 9, nov: 10, des: 11,
}

interface Entry {
    field: string
    category: Category
    title: string
    summary: string
    dateRaw: string
    date: Date
    location: string
    sources: string[]
    note: string
}

function parseDate(raw: string, fallbackMonthYear: string): Date | null {
    const s = raw.toLowerCase().replace(/[()±]/g, ' ').replace(/perkiraan|dimuat|kejadian|retrospektif/g, ' ')
    // "20 feb 2025" | "11-12 feb 2026" | "29 apr–1 mei 2025" | "25-26 okt 2022"
    let m = s.match(/(\d{1,2})\s*[-–]\s*\d{1,2}\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/)
        || s.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s*[-–]\s*\d{1,2}\s+[a-z]{3}[a-z]*\.?\s+(\d{4})/)
        || s.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/)
    if (m) {
        const day = Number(m[1]); const mon = MONTHS[m[2]]; const year = Number(m[3])
        if (mon !== undefined) return new Date(Date.UTC(year, mon, Math.min(Math.max(day, 1), 28), 3, 0, 0))
    }
    // "q4 2022" / "sepanjang 2024" / "2024"
    m = s.match(/q([1-4])\s+(\d{4})/)
    if (m) return new Date(Date.UTC(Number(m[2]), (Number(m[1]) - 1) * 3 + 1, 15, 3, 0, 0))
    m = s.match(/\b(20\d{2})\b/)
    if (m) return new Date(Date.UTC(Number(m[1]), 6, 1, 3, 0, 0))
    // fall back to the "Bulan/Tahun" column, e.g. "Feb 2025" / "Agu 2026 (KANDIDAT...)"
    const f = fallbackMonthYear.toLowerCase().match(/([a-z]{3})[a-z]*\.?\s+(20\d{2})/)
    if (f && MONTHS[f[1]] !== undefined) return new Date(Date.UTC(Number(f[2]), MONTHS[f[1]], 15, 3, 0, 0))
    return null
}

function extractUrls(cell: string): string[] {
    const urls = [...cell.matchAll(/\((https?:\/\/[^)\s]+)\)/g)].map((x) => x[1])
    return [...new Set(urls)]
}

const SKIP_NOTE = /hanya judul|belum terkonfirmasi|belum diverifikasi lebih jauh|tidak memenuhi syarat|kandidat lemah|riset gagal|0 entri/i

function parseDoc(): Entry[] {
    const text = readFileSync(DOC, 'utf8')
    const lines = text.split('\n')
    const entries: Entry[] = []

    let field = ''
    let category: Category | null = null
    let inHistorySection = false // Panang 6a
    let header: string[] = []

    for (const line of lines) {
        const fieldMatch = line.match(/^##\s+\d+\.\s+Field:\s+([A-Z][A-Z ]*[A-Z])/)
        if (fieldMatch) {
            field = fieldMatch[1].trim()
            category = FIELD_TO_CATEGORY[field] ?? null
            inHistorySection = false
            header = []
            continue
        }
        if (/^###\s+6a\./.test(line)) { inHistorySection = true; header = []; continue }
        if (/^###\s+6[bc]/.test(line)) { inHistorySection = false; header = []; continue }
        if (/^###\s/.test(line)) { header = []; continue }

        if (!category || inHistorySection) continue
        if (!line.trim().startsWith('|')) { continue }

        const cells = line.split('|').slice(1, -1).map((c) => c.trim())
        if (cells.every((c) => /^-*:?-*$/.test(c))) continue // |---|---| separator
        if (!header.length) { header = cells.map((c) => c.toLowerCase()); continue }

        const col = (name: string) => {
            const i = header.findIndex((h) => h.includes(name))
            return i >= 0 ? (cells[i] ?? '') : ''
        }
        const title = col('judul').replace(/\*\*/g, '').trim()
        const summary = col('ringkasan').replace(/\*\*/g, '').trim()
        if (!title || !summary) continue

        const dateRaw = col('tanggal') || col('periode')
        const monthYear = col('bulan') || col('periode')
        const note = col('catatan verifikasi') || col('catatan')
        if (SKIP_NOTE.test(note) || SKIP_NOTE.test(title) || SKIP_NOTE.test(monthYear)) continue

        const date = parseDate(dateRaw || monthYear, monthYear)
        if (!date || isNaN(date.getTime())) continue
        if (date.getUTCFullYear() < 2021 || date > new Date()) continue

        const sources = [...extractUrls(col('link sumber utama')), ...extractUrls(col('link tambahan'))]
        entries.push({
            field, category, title, summary, dateRaw: dateRaw || monthYear, date,
            location: col('tag lokasi') || 'Kotabunan / Boltim', sources, note,
        })
    }
    // De-dupe: same title appearing under multiple Fields (e.g. the Mar 2023
    // PT ASA shutdown shows in Investasi + Lingkungan + Panang). Keep the
    // most specific category (PANANG > ENVIRONMENT > INVESTMENT > others).
    const rank: Record<string, number> = { PANANG: 5, ENVIRONMENT: 4, INCIDENTS: 3, INVESTMENT: 2, GOVERNMENT: 1, TOURISM: 1, INTERNATIONAL: 1, TECHNOLOGY: 1, OPINION: 0 }
    const byKey = new Map<string, Entry>()
    for (const e of entries) {
        const key = e.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80)
        const cur = byKey.get(key)
        if (!cur || (rank[e.category] ?? 0) > (rank[cur.category] ?? 0)) byKey.set(key, e)
    }
    return [...byKey.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
}

function slugify(title: string): string {
    return title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 90)
}

const CATEGORY_ID: Record<Category, string> = {
    GOVERNMENT: 'Pemerintahan', TOURISM: 'Pariwisata', INVESTMENT: 'Investasi',
    INCIDENTS: 'Insiden', ENVIRONMENT: 'Lingkungan Hidup', PANANG: 'Panang',
    INTERNATIONAL: 'Internasional', TECHNOLOGY: 'Teknologi', OPINION: 'Opini',
}

const GLOSSARY = `GLOSARIUM (pakai nama lengkap ini, JANGAN menebak kepanjangan lain):
- PT ASA = PT Arafura Surya Alam (pemegang IUP tambang emas Blok Doup, Kotabunan).
- Boltim = Kabupaten Bolaang Mongondow Timur. Bolmong = Kabupaten Bolaang Mongondow (kabupaten berbeda).
- UNTR = PT United Tractors Tbk (Grup Astra). PSAB / J Resources = PT J Resources Asia Pasifik Tbk.
- Doup / Blok Doup = blok tambang emas di kawasan Panang-Benteng, Kecamatan Kotabunan.
- eks-HGU Kobondian (ejaan lain: Kobandian/Kebondian) = bekas Hak Guna Usaha ~100 ha di Kotabunan yang jadi sengketa lahan.
- WPR = Wilayah Pertambangan Rakyat. PETI = Penambangan Tanpa Izin. AMDAL = Analisis Mengenai Dampak Lingkungan.
- Bupati Boltim 2025-2030: Oskar Manoppo (Wabup: Argo Sumaiku). Bupati sebelumnya (2020-2025): Sam Sachrul Mamonto.
- WALHI = Wahana Lingkungan Hidup Indonesia. LAKRI, GMPK, AMTI, MDT = organisasi/gerakan masyarakat sipil.
Jika sebuah singkatan tidak ada di daftar ini dan tidak dijelaskan di bahan riset, tulis singkatannya apa adanya tanpa menebak kepanjangannya.`

function buildPrompt(e: Entry): string {
    const dateStr = e.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })
    const sensitive = e.category === 'PANANG' || e.category === 'ENVIRONMENT'
    return `Kamu jurnalis senior Jurnal Kotabunan (jurnal.kotabunan.com), media berita Kecamatan Kotabunan & Kabupaten Bolaang Mongondow Timur (Boltim), Sulawesi Utara.

${GLOSSARY}

Tulis SATU artikel berita berbahasa Indonesia baku berdasarkan bahan riset terverifikasi di bawah. Ini bukan opini; ini berita hard-news / feature berdasarkan fakta yang sudah dikumpulkan tim riset.

BAHAN RISET:
- Kategori: ${CATEGORY_ID[e.category]}
- Judul kerja: ${e.title}
- Ringkasan fakta: ${e.summary}
- Tanggal peristiwa: ${dateStr}
- Lokasi: ${e.location}
- Catatan verifikasi tim riset: ${e.note || '—'}
- Sumber: ${e.sources.join(' ; ') || '—'}

ATURAN:
1. Bahasa Indonesia baku sepenuhnya. Jika ada kutipan yang jelas memakai dialek Melayu Manado, pertahankan apa adanya di dalam tanda kutip dan atribusikan ke penuturnya; narasi tetap baku.
2. JANGAN mengarang fakta, angka, nama, atau kutipan yang tidak ada di bahan riset. Kamu boleh menambahkan konteks umum yang wajar dan tidak kontroversial (latar belakang wilayah, kronologi umum, penjelasan istilah) tanpa membuat klaim baru.
3. ${sensitive
        ? 'ISU SENSITIF. Setiap tuduhan/klaim WAJIB diatribusikan ("menurut...", "diduga", "mengklaim", "pihak X menyatakan") — tidak boleh ditulis sebagai fakta final. Sertakan bahwa pihak yang dituding belum tentu memberi tanggapan bila catatan riset menyebut demikian. Netral dan berimbang.'
        : 'Tulis lugas, akurat, dan berimbang.'}
4. Panjang: MINIMAL 900 kata. Kembangkan: latar belakang, kronologi, data/angka yang ada, minimal dua sudut pandang atau narasumber bila bahan memungkinkan, dampak bagi warga, dan langkah/agenda lanjutan. Jangan menambah kata hanya untuk memenuhi panjang — kalau bahan tipis, perdalam konteks daerah, bukan mengarang.
5. Paragraf pertama = lead 5W1H yang kuat. Gunakan HTML <p> untuk paragraf dan <h3> untuk subjudul bila perlu (jangan <h1>/<h2>).
6. Judul akhir maksimal 90 karakter, spesifik, tidak clickbait.

Kembalikan HANYA objek JSON valid (nama field dalam bahasa Inggris, isi dalam bahasa Indonesia), tanpa komentar apa pun sebelum/sesudah:
{
  "title": "...",
  "excerpt": "ringkasan 1-2 kalimat",
  "content": "artikel HTML lengkap, panjang, mendetail",
  "riskLevel": "LOW | MEDIUM | HIGH"
}`
}

function wordCount(html: string): number {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
}

async function generate(e: Entry): Promise<{ title: string; excerpt: string; content: string; riskLevel: string }> {
    const sys = 'Kamu jurnalis Indonesia pemenang penghargaan. Tulis Bahasa Indonesia baku. Keluarkan HANYA JSON valid.'
    let out = await myaiCompleteJSON<{ title: string; excerpt: string; content: string; riskLevel: string }>(
        'chatbot', [{ role: 'system', content: sys }, { role: 'user', content: buildPrompt(e) }], 'gpt-4o-mini',
    )
    if (wordCount(out.content || '') < 800) {
        const retry = await myaiCompleteJSON<typeof out>('chatbot', [
            { role: 'system', content: sys },
            { role: 'user', content: buildPrompt(e) + '\n\nCATATAN: draf sebelumnya terlalu pendek. Tulis ulang jauh lebih panjang dan mendalam, MINIMAL 950 kata, tambah konteks daerah dan kronologi — tetap tanpa mengarang fakta baru.' },
        ], 'gpt-4o-mini')
        if (wordCount(retry.content || '') > wordCount(out.content || '')) out = retry
    }
    return out
}

async function main() {
    let entries = parseDoc()
    if (ONLY.length) entries = entries.filter((e) => ONLY.includes(e.category))
    if (LIMIT) entries = entries.slice(0, LIMIT)

    const byCat = entries.reduce<Record<string, number>>((a, e) => (a[e.category] = (a[e.category] || 0) + 1, a), {})
    console.log(`Parsed ${entries.length} usable entries:`, byCat)
    console.log(`Range: ${entries[0]?.date.toISOString().slice(0, 10)} .. ${entries.at(-1)?.date.toISOString().slice(0, 10)}`)
    if (!WRITE) {
        console.log('\nDRY RUN. Sample:')
        for (const e of entries.slice(0, 8)) console.log(`  ${e.date.toISOString().slice(0, 10)} [${e.category}] ${e.title}`)
        console.log('\nRun with --write to generate + insert.')
        return
    }

    const author = await db.user.upsert({
        where: { email: 'redaksi@jurnal.kotabunan.com' },
        update: {},
        create: { email: 'redaksi@jurnal.kotabunan.com', name: 'Redaksi Jurnal Kotabunan', role: 'EDITOR' },
    })

    let done = 0, skipped = 0, failed = 0
    for (const [i, e] of entries.entries()) {
        const baseSlug = slugify(e.title)
        try {
            if (await db.article.findFirst({ where: { slug: { startsWith: baseSlug } }, select: { id: true } })) {
                skipped++; console.log(`[${i + 1}/${entries.length}] skip (exists): ${e.title}`); continue
            }
            const g = await generate(e)
            if (!g?.title || !g?.content) throw new Error('model returned no title/content')

            let riskLevel = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(g.riskLevel) ? g.riskLevel : 'LOW') as RiskLevel
            let riskScore = 0, containsAccusation = false, legalReviewRequired = false
            if (SCREEN_CATEGORIES.has(e.category)) {
                try {
                    const r = await analyzeLegalRisk(g.content, g.title)
                    riskLevel = r.riskLevel; riskScore = r.riskScore
                    containsAccusation = r.containsAccusation; legalReviewRequired = r.requiresLegalReview
                } catch (err) { console.warn('   legal-risk skipped:', (err as Error).message.slice(0, 100)) }
            }

            let slug = baseSlug, n = 1
            while (await db.article.findUnique({ where: { slug }, select: { id: true } })) slug = `${baseSlug}-${++n}`

            await db.article.create({
                data: {
                    title: g.title.slice(0, 200), slug,
                    excerpt: (g.excerpt || e.summary).slice(0, 300),
                    content: g.content,
                    category: e.category,
                    status: 'PUBLISHED',
                    aiAssisted: true,
                    riskLevel, riskScore, containsAccusation, legalReviewRequired,
                    verificationLevel: 'MEDIUM',
                    sourceUrl: e.sources[0] || null,
                    authorId: author.id,
                    publishedAt: e.date,
                    createdAt: e.date,
                    updatedAt: e.date,
                },
            })
            done++
            console.log(`[${i + 1}/${entries.length}] ✅ ${e.date.toISOString().slice(0, 10)} [${e.category}] ${wordCount(g.content)}w  ${g.title}`)
        } catch (err) {
            failed++
            console.error(`[${i + 1}/${entries.length}] ❌ ${e.title} :: ${(err as Error).message.slice(0, 160)}`)
        }
    }
    console.log(`\nDONE. created=${done} skipped=${skipped} failed=${failed}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
