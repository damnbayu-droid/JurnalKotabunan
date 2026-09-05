/**
 * SEO fix: 112/116 seeded articles have titles well over the ~60-character
 * safe display length for Google/Bing search results (avg 81, max 132).
 * For every article whose title exceeds the threshold, ask the AI to:
 *   - compress the title to <=60 chars (punchy, no fact changes)
 *   - fold the specific details that no longer fit (names, numbers,
 *     locations) into a longer excerpt, so nothing gets LOST, just moved
 * Slug is regenerated from the new title (safe - site isn't live/indexed
 * yet) and de-duplicated against existing slugs.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/shorten-titles.ts            # dry run
 *   npx tsx --env-file=.env scripts/shorten-titles.ts --write
 *   npx tsx --env-file=.env scripts/shorten-titles.ts --write --limit 5
 */

import { db } from '@/lib/db'
import { myaiCompleteJSON } from '@/lib/ai/myaiClient'

const TITLE_MAX = 60
const ARGV = process.argv.slice(2)
const WRITE = ARGV.includes('--write')
const LIMIT = Number((ARGV.find((a) => a.startsWith('--limit='))?.split('=')[1]) || (ARGV.includes('--limit') ? ARGV[ARGV.indexOf('--limit') + 1] : 0)) || 0

function slugify(title: string): string {
    return title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 90)
}

function contentSnippet(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400)
}

function buildPrompt(title: string, excerpt: string, content: string): string {
    return `Kamu editor SEO untuk Jurnal Kotabunan (media berita Kotabunan, Bolaang Mongondow Timur, Sulawesi Utara).

Judul artikel ini terlalu panjang untuk tampil baik di hasil pencarian Google/Bing (batas aman ~60 karakter).

Judul lama (${title.length} karakter): "${title}"
Ringkasan lama: "${excerpt}"
Cuplikan isi artikel (untuk konteks fakta, jangan diubah): "${contentSnippet(content)}"

TUGAS:
1. Buat JUDUL BARU dalam Bahasa Indonesia, MAKSIMAL 60 KARAKTER (usahakan 45-60), padat dan jelas, tetap mengandung inti berita. Jangan clickbait, jangan mengubah atau menambah fakta apa pun.
2. Buat RINGKASAN BARU (180-260 karakter) yang memuat detail spesifik (angka, nama, lokasi, tanggal) yang tadinya ada di judul panjang tapi sekarang terpotong - jangan sampai informasi itu hilang, pindahkan ke sini.

Kembalikan HANYA JSON tanpa komentar apa pun:
{"title": "...", "excerpt": "..."}`
}

async function shortenOne(title: string, excerpt: string, content: string): Promise<{ title: string; excerpt: string }> {
    let out = await myaiCompleteJSON<{ title: string; excerpt: string }>('chatbot', [
        { role: 'system', content: 'Kamu editor SEO Bahasa Indonesia. Keluarkan HANYA JSON valid.' },
        { role: 'user', content: buildPrompt(title, excerpt, content) },
    ], 'gpt-4o-mini')

    if (!out?.title) throw new Error('model returned no title')
    if (out.title.length > TITLE_MAX) {
        // One retry with the overshoot called out explicitly.
        const retry = await myaiCompleteJSON<{ title: string; excerpt: string }>('chatbot', [
            { role: 'system', content: 'Kamu editor SEO Bahasa Indonesia. Keluarkan HANYA JSON valid.' },
            {
                role: 'user',
                content: buildPrompt(title, excerpt, content) +
                    `\n\nCATATAN: draf sebelumnya "${out.title}" (${out.title.length} karakter) masih lebih dari 60 karakter. Padatkan lagi, WAJIB ≤ 60 karakter.`,
            },
        ], 'gpt-4o-mini')
        if (retry?.title && retry.title.length <= TITLE_MAX + 5) out = retry
    }
    return { title: out.title.slice(0, TITLE_MAX + 10), excerpt: out.excerpt || excerpt }
}

async function main() {
    const all = await db.article.findMany({
        select: { id: true, title: true, excerpt: true, content: true, slug: true },
        orderBy: { publishedAt: 'asc' },
    })
    const targets = all.filter((a) => a.title.length > TITLE_MAX).slice(0, LIMIT || undefined)
    const existingSlugs = new Set(all.map((a) => a.slug))

    console.log(`${all.length} artikel total, ${all.filter((a) => a.title.length > TITLE_MAX).length} punya judul > ${TITLE_MAX} karakter. Memproses ${targets.length}.`)
    if (!WRITE) {
        console.log('DRY RUN. Contoh:')
        targets.slice(0, 3).forEach((a) => console.log(`  [${a.title.length}] ${a.title}`))
        console.log('Jalankan dengan --write untuk eksekusi.')
        return
    }

    let done = 0, failed = 0
    for (const [i, a] of targets.entries()) {
        try {
            const { title, excerpt } = await shortenOne(a.title, a.excerpt, a.content)
            let slug = slugify(title)
            if (slug !== a.slug) {
                let n = 1
                const base = slug
                while (existingSlugs.has(slug)) slug = `${base}-${++n}`
            }
            existingSlugs.delete(a.slug)
            existingSlugs.add(slug)

            await db.article.update({ where: { id: a.id }, data: { title, excerpt, slug } })
            done++
            console.log(`[${i + 1}/${targets.length}] ✅ (${a.title.length}->${title.length}) ${title}`)
        } catch (err) {
            failed++
            console.error(`[${i + 1}/${targets.length}] ❌ ${a.title.slice(0, 60)} :: ${(err as Error).message.slice(0, 140)}`)
        }
    }
    console.log(`\nDONE. shortened=${done} failed=${failed}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
