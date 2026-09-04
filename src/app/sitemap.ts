import { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { SITE_URL } from '@/lib/site-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // 1. Static, content-bearing routes only - /login and /register have no
    // SEO value and were previously listed here at priority 1 (same as the
    // homepage), which wastes crawl budget on pages Google should never
    // rank anyway.
    const staticRoutes = [
        { route: '', priority: 1.0, changeFrequency: 'hourly' as const },
        { route: '/news', priority: 0.9, changeFrequency: 'hourly' as const },
        { route: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
        { route: '/editorial-team', priority: 0.4, changeFrequency: 'monthly' as const },
        { route: '/contact', priority: 0.3, changeFrequency: 'monthly' as const },
        { route: '/transparency', priority: 0.4, changeFrequency: 'monthly' as const },
        { route: '/submit-report', priority: 0.3, changeFrequency: 'monthly' as const },
        { route: '/ads', priority: 0.4, changeFrequency: 'monthly' as const },
        { route: '/editorial-guidelines', priority: 0.3, changeFrequency: 'monthly' as const },
        { route: '/journalistic-code', priority: 0.3, changeFrequency: 'monthly' as const },
        { route: '/cyber-media-guidelines', priority: 0.3, changeFrequency: 'monthly' as const },
        { route: '/disclaimer', priority: 0.3, changeFrequency: 'monthly' as const },
        { route: '/privacy-policy', priority: 0.2, changeFrequency: 'monthly' as const },
        { route: '/terms-conditions', priority: 0.2, changeFrequency: 'monthly' as const },
    ].map(({ route, priority, changeFrequency }) => ({
        url: `${SITE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
    }))

    // 2. Dynamic Articles
    const articles = await db.article.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
    })

    const articleRoutes = articles.map((article) => ({
        url: `${SITE_URL}/article/${article.slug}`,
        lastModified: article.updatedAt,
        changeFrequency: 'weekly' as const,
        // Freshly published articles get a small priority boost - they're
        // the pages most likely to be actively searched for right now.
        priority: article.publishedAt && Date.now() - article.publishedAt.getTime() < 3 * 24 * 3600 * 1000 ? 0.9 : 0.7,
    }))

    // 3. Category Routes - kept in sync with validCategories in
    // src/app/category/[category]/page.tsx (9 categories after the
    // LOCAL/JOBS -> ENVIRONMENT/PANANG/INTERNATIONAL/TECHNOLOGY enum
    // change). This list previously still had 'local'/'jobs' (both now
    // 404 - not in validCategories) and was missing the 4 new slugs, so
    // crawlers never found those category pages at all.
    const categories = ['government', 'tourism', 'investment', 'incidents', 'environment', 'panang', 'international', 'technology', 'opinion']
    const categoryRoutes = categories.map((cat) => ({
        url: `${SITE_URL}/category/${cat}`,
        lastModified: new Date(),
        changeFrequency: 'hourly' as const,
        priority: 0.85,
    }))

    return [...staticRoutes, ...categoryRoutes, ...articleRoutes]
}
