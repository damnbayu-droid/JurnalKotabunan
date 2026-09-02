/**
 * Jurnal Kotabunan — Migrate local article/ad images to cloud storage
 *
 * Masalah: sebelum perbaikan ini, image-service.ts menyimpan foto artikel
 * ke public/uploads/articles/ (disk lokal). Folder itu di-gitignore, jadi
 * TIDAK PERNAH ter-push ke GitHub -> TIDAK PERNAH ada di build Vercel ->
 * setiap foto artikel 404 di production (ditemukan 2026-09-01 lewat
 * screenshot jurnal.kotabunan.com yang foto-fotonya broken). Sekarang
 * generateAndStoreImage()/persistImage() sudah diubah untuk upload ke
 * Supabase Storage (+ Vercel Blob fallback) - tapi itu cuma berlaku untuk
 * foto BARU. Script ini memindahkan +170 file YANG SUDAH ADA di disk lokal
 * (satu-satunya salinannya, karena tidak pernah masuk git) ke cloud storage
 * yang sama, lalu update setiap Article.featuredImageUrl (dan referensi
 * inline <img> di dalam Article.content) yang masih menunjuk ke path lokal.
 *
 * WAJIB dijalankan dari mesin yang masih punya folder public/uploads/
 * (laptop ini) - begitu dipindah, source file lokalnya sudah tidak ada
 * salinan lain di mana pun.
 *
 * Usage:
 *   bun scripts/migrate-images-to-cloud-storage.ts          # DRY RUN (baca saja)
 *   bun scripts/migrate-images-to-cloud-storage.ts --run    # upload + update DB
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { uploadImage } from '../src/lib/storage/upload-image'

const RUN_MODE = process.argv.includes('--run')
const db = new PrismaClient()

const DIRS = [
    { local: path.join(process.cwd(), 'public', 'uploads', 'articles'), prefix: '/uploads/articles' },
    { local: path.join(process.cwd(), 'public', 'uploads', 'ads'), prefix: '/uploads/ads' },
    { local: path.join(process.cwd(), 'public', 'uploads', 'proofs'), prefix: '/uploads/proofs' },
]

function contentTypeFor(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase()
    if (ext === '.png') return 'image/png'
    if (ext === '.webp') return 'image/webp'
    if (ext === '.gif') return 'image/gif'
    if (ext === '.webm') return 'video/webm'
    if (ext === '.mp4') return 'video/mp4'
    if (ext === '.pdf') return 'application/pdf'
    return 'image/jpeg'
}

async function main() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.BLOB_READ_WRITE_TOKEN) {
        console.error(
            'SUPABASE_SERVICE_ROLE_KEY dan BLOB_READ_WRITE_TOKEN dua-duanya kosong di .env - isi minimal salah satu dulu sebelum jalankan script ini.'
        )
        process.exit(1)
    }

    // local filename (basename) -> new cloud URL
    const urlMap = new Map<string, string>()
    let totalFiles = 0
    let uploaded = 0
    let failed = 0

    for (const { local, prefix } of DIRS) {
        let files: string[]
        try {
            files = await fs.readdir(local)
        } catch {
            console.log(`(lewati, folder tidak ada: ${local})`)
            continue
        }
        console.log(`\n=== ${prefix} - ${files.length} file ===`)
        totalFiles += files.length

        for (const fileName of files) {
            const localPath = `${prefix}/${fileName}`
            if (!RUN_MODE) {
                console.log(`[DRY RUN] would upload: ${localPath}`)
                continue
            }
            const buffer = await fs.readFile(path.join(local, fileName))
            const contentType = contentTypeFor(fileName)
            // Keep the folder structure inside the bucket too (ads/, proofs/)
            // so it matches what new uploads write going forward.
            const storageFileName = prefix === '/uploads/articles' ? fileName : `${prefix.split('/').pop()}/${fileName}`
            const result = await uploadImage(buffer, contentType, storageFileName)
            if (!result) {
                console.error(`  GAGAL upload: ${localPath}`)
                failed++
                continue
            }
            urlMap.set(localPath, result.url)
            uploaded++
            console.log(`  OK (${result.provider}): ${localPath} -> ${result.url}`)
        }
    }

    console.log(`\n--- Upload selesai: ${uploaded}/${totalFiles} berhasil, ${failed} gagal ---`)

    if (!RUN_MODE) {
        console.log('\nDRY RUN selesai - tidak ada file di-upload, tidak ada DB yang diubah.')
        console.log('Jalankan ulang dengan --run untuk benar-benar migrasi.')
        return
    }

    if (urlMap.size === 0) {
        console.log('Tidak ada file berhasil di-upload, DB tidak disentuh.')
        return
    }

    // --- Update DB: featuredImageUrl + inline <img> references in content ---
    console.log('\n=== Update database ===')
    const articles = await db.article.findMany({
        select: { id: true, title: true, featuredImageUrl: true, content: true },
    })

    let articlesUpdated = 0
    for (const article of articles) {
        let newFeaturedUrl = article.featuredImageUrl
        let newContent = article.content
        let changed = false

        if (article.featuredImageUrl && urlMap.has(article.featuredImageUrl)) {
            newFeaturedUrl = urlMap.get(article.featuredImageUrl)!
            changed = true
        }

        for (const [localPath, cloudUrl] of urlMap) {
            if (newContent.includes(localPath)) {
                newContent = newContent.split(localPath).join(cloudUrl)
                changed = true
            }
        }

        if (changed) {
            await db.article.update({
                where: { id: article.id },
                data: { featuredImageUrl: newFeaturedUrl, content: newContent },
            })
            articlesUpdated++
            console.log(`  Updated: "${article.title.slice(0, 60)}"`)
        }
    }

    // --- Update Ad table (media.ts stored ad creatives under /uploads/ads) ---
    const ads = await db.ad.findMany({ select: { id: true, mediaUrl: true } })
    let adsUpdated = 0
    for (const ad of ads) {
        if (urlMap.has(ad.mediaUrl)) {
            await db.ad.update({ where: { id: ad.id }, data: { mediaUrl: urlMap.get(ad.mediaUrl)! } })
            adsUpdated++
        }
    }

    // --- Update Invoice.proofUrl (media.ts stored proofs under /uploads/proofs) ---
    const invoices = await db.invoice.findMany({ select: { id: true, proofUrl: true } })
    let invoicesUpdated = 0
    for (const invoice of invoices) {
        if (invoice.proofUrl && urlMap.has(invoice.proofUrl)) {
            await db.invoice.update({ where: { id: invoice.id }, data: { proofUrl: urlMap.get(invoice.proofUrl)! } })
            invoicesUpdated++
        }
    }

    console.log(
        `\n--- DB selesai: ${articlesUpdated} artikel, ${adsUpdated} iklan, ${invoicesUpdated} invoice di-update ---`
    )
    console.log('\nSelesai. File lokal di public/uploads/ TIDAK dihapus otomatis oleh script ini -')
    console.log('cek dulu situsnya beres, baru hapus manual kalau mau (aman, sudah ada di cloud storage).')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => db.$disconnect())
