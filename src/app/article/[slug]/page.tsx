import { cache } from 'react'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'

import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Clock,
  Eye,
  Shield,
  TrendingUp,
  MessageCircle
} from 'lucide-react'
import Link from 'next/link'
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/article-json-ld'
import { SITE_URL, SITE_NAME } from '@/lib/site-config'
import { CommentSection } from '@/components/article/comment-section'
import { EvidenceList } from '@/components/article/evidence-list'
import { ArticleCard } from '@/components/article/article-card'
import { ArticleActions } from '@/components/article/article-actions'
import { ShareMenu } from '@/components/article/share-menu'
import { AdSlot, AdMedia, getActiveAd } from '@/components/ads/ad-slot'
import { LangText } from '@/components/i18n/lang-text'
import { CategoryLabel } from '@/components/i18n/category-label'
import { ArticleDate } from '@/components/article/article-date'
import type { Category } from '@prisma/client'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

// Wrapped in React's cache() - this is called once from generateMetadata()
// and again from the page component itself, and Next.js dev mode
// additionally double-invokes Server Components. Without request-level
// memoization each real page view could trigger this query 2-4x, and under
// this project's connection_limit=1 pooled connection, independent runs
// occasionally raced and returned inconsistent results between passes -
// the same root cause already found and patched around (in a narrower,
// ad-rail-only way) by the comment near the ad rail JSX below.
const getArticle = cache(async (slug: string) => {
  return db.article.findUnique({
    where: { slug, status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, name: true, email: true } },
      evidences: true,
      comments: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { name: true, avatar: true } },
        },
      },
    },
  })
})

async function incrementViewCount(articleId: string) {
  await db.article.update({
    where: { id: articleId },
    data: { viewCount: { increment: 1 } },
  })
}

const ALL_CATEGORIES: Category[] = ['GOVERNMENT', 'TOURISM', 'INVESTMENT', 'INCIDENTS', 'ENVIRONMENT', 'PANANG', 'INTERNATIONAL', 'TECHNOLOGY', 'OPINION']

/**
 * Like real newsrooms do: below the article, one backlink per OTHER
 * category (not just "more like this") so readers cross-navigate the whole
 * site instead of getting stuck in one topic. Skips a category entirely if
 * it has no published article yet, rather than showing a broken/empty card.
 */
const getOtherCategoryArticles = cache(async (excludeId: string, excludeCategory: Category) => {
  const otherCategories = ALL_CATEGORIES.filter((c) => c !== excludeCategory)

  const results = await Promise.all(
    otherCategories.map((category) =>
      db.article.findFirst({
        where: { status: 'PUBLISHED', category, id: { not: excludeId } },
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true, title: true, slug: true, excerpt: true, category: true,
          featuredImageUrl: true, featuredImageAlt: true, publishedAt: true,
          viewCount: true, aiAssisted: true, author: { select: { name: true } },
        },
      })
    )
  )

  return results.filter((a): a is NonNullable<typeof a> => a !== null)
})

/**
 * Replaces the old "Risk Level / Verification / Supporting Evidence" cards
 * (removed 2026-09-02) - those showed internal editorial/legal metadata
 * that's meaningless to readers and, worse, always read "0 of 0 evidence
 * verified" / "0 documents" (confirmed: literally every one of the 128
 * published articles has zero Evidence rows - AI-generated content never
 * populates that table), which undermines trust rather than building it.
 * Real, useful data instead: the 3 most-viewed articles site-wide
 * (viewCount - see the Metrics panel work), clickable straight to the
 * article.
 */
const getPopularArticles = cache(async (excludeId: string) => {
  return db.article.findMany({
    where: { status: 'PUBLISHED', id: { not: excludeId } },
    orderBy: { viewCount: 'desc' },
    take: 3,
    select: {
      id: true, title: true, slug: true, excerpt: true, category: true,
      featuredImageUrl: true, featuredImageAlt: true, publishedAt: true,
      viewCount: true, aiAssisted: true, author: { select: { name: true } },
    },
  })
})

// Bing (and Google similarly) flags meta descriptions outside a 25-160
// char range as an SEO error ("Meta Description too long or too short") -
// confirmed live via Bing Webmaster Tools. article.excerpt is AI-generated
// with no length cap: 65 of 128 published articles exceeded 160 chars.
// Truncated only here, at the meta-tag boundary - the full excerpt still
// displays as-is everywhere else on the page (article header, cards, etc.).
function truncateForMetaDescription(text: string, max = 155): string {
  if (text.length <= max) return text
  const truncated = text.slice(0, max)
  const lastSpace = truncated.lastIndexOf(' ')
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : max)}...`
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    return { title: 'Article not found' }
  }

  const metaDescription = truncateForMetaDescription(article.excerpt)

  // Always fall back to the site's default OG image rather than an empty
  // array - an article with no featured image (should be rare after the
  // storage fix, but e.g. mid-generation failures) would otherwise share
  // with NO image preview at all on WhatsApp/Facebook/etc, which is worse
  // than showing the generic Jurnal Kotabunan card.
  const ogImageUrl = article.featuredImageUrl || `${SITE_URL}/og-image.jpg`
  const canonicalUrl = `${SITE_URL}/article/${article.slug}`

  return {
    title: article.title,
    description: metaDescription,
    alternates: {
      canonical: `/article/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: metaDescription,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: 'en_US',
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt?.toISOString(),
      section: article.category.charAt(0) + article.category.slice(1).toLowerCase(),
      authors: [article.author?.name || 'Jurnal Kotabunan Team'],
      images: [
        {
          url: ogImageUrl,
          // Matches the site's standard featured-image size (see the
          // "Rekomendasi ukuran" hint in admin's upload/crop flow) - giving
          // WhatsApp/Facebook/LinkedIn explicit dimensions lets them render
          // the large card immediately instead of having to fetch+measure
          // the image themselves first.
          width: 1200,
          height: 675,
          alt: article.featuredImageAlt || article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: metaDescription,
      images: [ogImageUrl],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) {
    notFound()
  }

  // Increment view count
  await incrementViewCount(article.id)

  const otherCategoryArticles = await getOtherCategoryArticles(article.id, article.category)
  const popularArticles = await getPopularArticles(article.id)
  const [leftAd, leftBottomAd, rightTopAd, rightBottomAd] = await Promise.all([
    getActiveAd('ARTICLE_LEFT', 'DESKTOP'),
    getActiveAd('ARTICLE_LEFT_BOTTOM', 'DESKTOP'),
    getActiveAd('ARTICLE_RIGHT_TOP', 'DESKTOP'),
    getActiveAd('ARTICLE_RIGHT_BOTTOM', 'DESKTOP'),
  ])

  return (
    <>
      <ArticleJsonLd article={article} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          {
            name: article.category.charAt(0) + article.category.slice(1).toLowerCase(),
            url: `${SITE_URL}/category/${article.category.toLowerCase()}`,
          },
          { name: article.title, url: `${SITE_URL}/article/${article.slug}` },
        ]}
      />

      <article className="py-8">
        <div className="container mx-auto max-w-7xl px-4">
        <div className="flex gap-6 justify-center">
        {/* Left ad rail - 2 stacked slots (mirrors the right rail below), only
            reserved when at least one has an ad. Renders leftAd/leftBottomAd
            (already fetched above) directly via AdMedia instead of <AdSlot>,
            which would re-run its own independent query for the same data -
            two separate queries for one fact was producing an intermittent
            hydration mismatch between this check and the render. */}
        {(leftAd || leftBottomAd) && (
          <div className="hidden lg:flex lg:flex-col gap-6 w-[160px] shrink-0 sticky top-24 self-start">
            {leftAd && (
              <div className="hidden md:flex w-full justify-center items-center overflow-hidden">
                <AdMedia ad={leftAd} />
              </div>
            )}
            {leftBottomAd && (
              <div className="hidden md:flex w-full justify-center items-center overflow-hidden">
                <AdMedia ad={leftBottomAd} />
              </div>
            )}
          </div>
        )}

        <div className="max-w-4xl w-full min-w-0">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground"><LangText en="Home" id="Beranda" /></Link>
            <span className="mx-2">/</span>
            <Link
              href={`/category/${article.category.toLowerCase()}`}
              className="hover:text-foreground"
            >
              <CategoryLabel category={article.category} />
            </Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{article.title.slice(0, 50)}...</span>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  <CategoryLabel category={article.category} />
                </Badge>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Shield className="h-3 w-3" />
                  <LangText en="Verified" id="Terverifikasi" />
                </Badge>
              </div>
              <ShareMenu articleId={article.id} title={article.title} url={`${SITE_URL}/article/${article.slug}`} />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              {article.title}
            </h1>

            <p className="text-lg text-muted-foreground mb-6">
              {article.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{article.author?.name || <LangText en="Jurnal Kotabunan Team" id="Tim Jurnal Kotabunan" />}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  <ArticleDate date={article.publishedAt} />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{article.viewCount} views</span>
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {article.featuredImageUrl && (
            <figure className="mb-8">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
                <Image
                  src={article.featuredImageUrl}
                  alt={article.featuredImageAlt || article.title}
                  fill
                  sizes="(min-width: 1024px) 896px, 100vw"
                  className="object-cover"
                  priority
                />
              </div>
              {article.imageSource && (
                <figcaption className="mt-2 text-sm text-muted-foreground text-center">
                  <LangText en="Source" id="Sumber" />: {article.imageSource}
                </figcaption>
              )}
            </figure>
          )}

          {/* Article Content */}
          <div
            className="prose prose-neutral dark:prose-invert max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Source Reference - shown for articles rewritten from an
              external source (article.sourceUrl), so readers can verify
              against the original reporting. rel=nofollow since this is
              attribution, not an editorial endorsement/backlink. */}
          {article.sourceUrl && (
            <p className="mb-8 text-sm text-muted-foreground border-l-2 pl-4">
              <LangText en="Source" id="Sumber" />:{' '}
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="underline hover:text-foreground break-all"
              >
                {article.sourceUrl}
              </a>
            </p>
          )}

          <AdSlot position="IN_ARTICLE" className="my-8" />

          <Separator className="my-8" />

          {/* Evidence Section */}
          {article.evidences.length > 0 && (
            <>
              <EvidenceList evidences={article.evidences} />
              <Separator className="my-8" />
            </>
          )}

          {/* Artikel Terpopuler - replaces the old Risk Level / Verification
              / Supporting Evidence cards (internal editorial metadata that
              meant nothing to readers and always read "0 of 0 verified" -
              see getPopularArticles() comment above). Real engagement data
              instead: the 3 most-viewed articles site-wide, clickable. */}
          {popularArticles.length > 0 && (
            <div className="mb-8 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium"><LangText en="Most Popular" id="Artikel Terpopuler" /></span>
              </div>
              <div className="divide-y">
                {popularArticles.map((a) => (
                  <ArticleCard key={a.id} article={a} variant="compact" />
                ))}
              </div>
            </div>
          )}

          {/* Share Actions */}
          <ArticleActions articleId={article.id} slug={article.slug} title={article.title} excerpt={article.excerpt} initialLikeCount={article.likeCount} />

          <Separator className="my-8" />

          {/* Baca Juga - one backlink per other category, so readers cross-navigate the site */}
          {otherCategoryArticles.length > 0 && (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-6">
                  <LangText en="Read Also from Other Categories" id="Baca Juga dari Kategori Lain" />
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherCategoryArticles.map((related) => (
                    <ArticleCard key={related.id} article={related} />
                  ))}
                </div>
              </div>
              <Separator className="my-8" />
            </>
          )}

          {/* Comments Section */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="h-5 w-5" />
              <h2 className="text-xl font-semibold">
                <LangText en="Comments" id="Komentar" /> ({article.comments.length})
              </h2>
            </div>
            <CommentSection
              articleId={article.id}
              comments={article.comments}
            />
          </div>
        </div>

        {/* Right ad rail - 2 stacked slots, only reserved when at least one has an ad.
            Same reasoning as the left rail: render the already-fetched ads
            directly rather than letting <AdSlot> re-query independently. */}
        {(rightTopAd || rightBottomAd) && (
          <div className="hidden lg:flex lg:flex-col gap-6 w-[300px] shrink-0 sticky top-24 self-start">
            {rightTopAd && (
              <div className="hidden md:flex w-full justify-center items-center overflow-hidden">
                <AdMedia ad={rightTopAd} />
              </div>
            )}
            {rightBottomAd && (
              <div className="hidden md:flex w-full justify-center items-center overflow-hidden">
                <AdMedia ad={rightBottomAd} />
              </div>
            )}
          </div>
        )}
        </div>
        </div>
      </article>
    </>
  )
}
