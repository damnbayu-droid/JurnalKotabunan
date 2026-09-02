import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { persistImage, splitIntoParagraphBlocks } from '@/lib/images/image-service'

const MAX_IMAGES_PER_ARTICLE = 3
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15MB - generous ceiling for a photo before WebP conversion
const WEBP_MAX_WIDTH = 1600 // good visual quality without an oversized file
const WEBP_QUALITY = 82

type Position = 'top' | 'middle' | 'bottom'

function countExistingImages(featuredImageUrl: string | null, content: string): number {
    const inContent = (content.match(/<img\b/gi) || []).length
    return inContent + (featuredImageUrl ? 1 : 0)
}

/** Splices a <figure><img></figure> block into the article's HTML at a paragraph boundary. */
function insertAtPosition(content: string, figureHtml: string, position: 'middle' | 'bottom'): string {
    const blocks = splitIntoParagraphBlocks(content)
    if (blocks.length === 0) return content + figureHtml

    const index = position === 'middle' ? Math.floor(blocks.length / 2) : blocks.length - 1
    blocks.splice(index, 0, figureHtml)
    return blocks.join('')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession()
        if (!session || (session.role !== 'ADMIN' && session.role !== 'EDITOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const article = await db.article.findUnique({ where: { id } })
        if (!article) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 })
        }

        const formData = await req.formData()
        const file = formData.get('file')
        const position = formData.get('position') as Position | null

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'file is required' }, { status: 400 })
        }
        if (!position || !['top', 'middle', 'bottom'].includes(position)) {
            return NextResponse.json({ error: "position must be 'top', 'middle', or 'bottom'" }, { status: 400 })
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 })
        }
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
        }

        // The 3-photo cap only makes sense for 'middle'/'bottom' - those
        // ADD a new <img> into the content on every call. 'top' REPLACES
        // the one dedicated featuredImageUrl slot - it never increases the
        // photo count, so it must never be blocked by this check. Bug found
        // 2026-09-02: this ran unconditionally, so once an article reached
        // 3 photos (featuredImageUrl + 2 content images), the admin could
        // never update/replace the featured photo again either - the "Foto
        // Utama" button just always failed with "already has the maximum",
        // even though replacing it wouldn't have added a photo at all.
        if (position !== 'top') {
            const existingCount = countExistingImages(article.featuredImageUrl, article.content)
            if (existingCount >= MAX_IMAGES_PER_ARTICLE) {
                return NextResponse.json(
                    { error: `Article already has the maximum of ${MAX_IMAGES_PER_ARTICLE} photos` },
                    { status: 400 }
                )
            }
        }

        const inputBuffer = Buffer.from(await file.arrayBuffer())
        const webpBuffer = await sharp(inputBuffer)
            .resize({ width: WEBP_MAX_WIDTH, withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer()

        const localPath = await persistImage(webpBuffer, 'image/webp', article.title)

        if (position === 'top') {
            const updated = await db.article.update({
                where: { id },
                data: {
                    featuredImageUrl: localPath,
                    featuredImageAlt: article.title,
                    imageSource: 'Manual Upload',
                },
            })
            return NextResponse.json({ success: true, localPath, article: updated })
        }

        const alt = article.title.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        const figureHtml = `<figure class="my-6"><img src="${localPath}" alt="${alt}" loading="lazy" /><figcaption>Manual Upload</figcaption></figure>`
        const newContent = insertAtPosition(article.content, figureHtml, position)

        const updated = await db.article.update({
            where: { id },
            data: { content: newContent },
        })

        return NextResponse.json({ success: true, localPath, article: updated })
    } catch (error) {
        console.error('Upload image error:', error)
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }
}
