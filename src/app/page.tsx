import { cache } from 'react'
import { db } from '@/lib/db'
import { ArticleCard } from '@/components/article/article-card'
import { CategorySection } from '@/components/article/category-section'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, FileText } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { AdSlot, AdMedia, getActiveAd } from '@/components/ads/ad-slot'
import { PopularNewsCarousel } from '@/components/home/popular-news-carousel'
import { SITE_TZ } from '@/lib/date'

export const revalidate = 60 // ISR: 60 seconds

// Wrapped in React's cache() so these only hit the DB once per request even
// though Next.js dev mode double-invokes Server Components - without this,
// the 10 queries below (Promise.all) each ran twice per page load, and
// under this project's connection_limit=1 pooled connection, the two
// independent runs of e.g. getActiveAd() could occasionally race and
// return different results between the two invocations, producing a real
// (if intermittent) hydration mismatch - confirmed by reproducing it
// ~1-in-5 to 1-in-20 loads even with completely static underlying data.
const getLatestArticles = cache(async () => {
  return db.article.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 50, // Increased to 50 for scrollable list
    include: {
      author: { select: { name: true } },
    },
  })
})

// Was ordered by viewCount first (most-viewed article, effectively frozen
// until something else out-viewed it) - switched to latest published so
// the hero photo/headline actually changes as new news comes in, per
// explicit request. No client-side rotation - this re-queries on every
// request past the `revalidate = 60` ISR window, same mechanism the rest
// of this page already relies on, so the hero simply reflects whatever
// was most recently published as of the last regeneration.
const getFeaturedArticle = cache(async () => {
  return db.article.findFirst({
    where: {
      status: 'PUBLISHED',
      riskLevel: { not: 'CRITICAL' }
    },
    orderBy: { publishedAt: 'desc' },
    include: {
      author: { select: { name: true } },
    },
  })
})

const getArticlesByCategory = cache(async (category: string) => {
  return db.article.findMany({
    where: {
      status: 'PUBLISHED',
      category: category as any,
    },
    orderBy: { publishedAt: 'desc' },
    take: 4,
    include: {
      author: { select: { name: true } },
    },
  })
})

// Replaces the old static "Trust Indicators" cards (100% Evidence-Based /
// Published Articles / Legal Review / Editorial Process) with a swipeable
// "Most Popular News" row - see PopularNewsCarousel. 10 items gives the
// auto-scroll loop enough content to feel like a real crawl rather than
// looping back after just 3-4 cards.
const getPopularArticlesForHome = cache(async () => {
  return db.article.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { viewCount: 'desc' },
    take: 10,
    select: {
      id: true, title: true, slug: true, category: true,
      featuredImageUrl: true, featuredImageAlt: true, viewCount: true,
    },
  })
})

export default async function HomePage() {
  const [
    latestArticles,
    featuredArticle,
    tourismArticles,
    investmentArticles,
    incidentArticles,
    localArticles,
    jobsArticles,
    opinionArticles,
    heroLeftAd,
    popularArticles,
  ] = await Promise.all([
    getLatestArticles(),
    getFeaturedArticle(),
    getArticlesByCategory('TOURISM'),
    getArticlesByCategory('INVESTMENT'),
    getArticlesByCategory('INCIDENTS'),
    getArticlesByCategory('LOCAL'),
    getArticlesByCategory('JOBS'),
    getArticlesByCategory('OPINION'),
    getActiveAd('HOME_HERO_LEFT', 'DESKTOP'),
    getPopularArticlesForHome(),
  ])

  // getFeaturedArticle() now picks the latest published article (see its
  // definition above), same source getLatestArticles() draws from - so
  // without this filter, the newest article would appear twice: once as
  // the giant hero, then again as the very first row of this sidebar list.
  const sidebarArticles = featuredArticle
    ? latestArticles.filter((article) => article.id !== featuredArticle.id)
    : latestArticles

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          {/* relative + no lg:flex-row: at lg+ the sidebar below is taken out of
              flow (absolute) and pinned to this container's height instead of
              being a flex sibling - see the sidebar's comment for why (fixed-height
              scroll areas kept winning the flex row's auto-height and overflowing
              past the hero column). At <lg both stay in normal flex-col flow. */}
          <div className="relative flex flex-col gap-6">
            {/* Ad rail + Featured Article image are grouped in their own row, nested
                inside a column with the below-hero banner - this way the row's
                only two items (rail, image) stretch to match each other exactly
                (default flex align-items: stretch), so the rail's bottom edge
                lines up EXACTLY with the featured image's bottom edge, and the
                below-hero banner sits underneath spanning the full width.
                lg:pr-[404px] reserves the absolutely positioned sidebar's space
                (380px width + the gap-6 that used to sit between them). */}
            <div className="flex-1 min-w-0 flex flex-col gap-6 lg:pr-[404px]">
              {/* Absolute positioning, not flex/grid stretch - both of those let the
                  rail's OWN ad creative (a real 160x600 "Wide Skyscraper" IAB format,
                  i.e. genuinely tall at its native aspect ratio) drive the shared
                  row's auto-height upward before any stretch is applied, so the row
                  ended up as tall as the ad itself instead of as tall as the
                  featured image. An absolutely positioned element with inset-y-0
                  is removed from normal flow entirely - it can't influence its
                  container's height, and top:0/bottom:0 forces ITS height to match
                  the container's height exactly, whatever that turns out to be.
                  The image below is the only thing in normal flow here, so it
                  alone determines this wrapper's height; lg:pl-[184px] (rail's
                  160px + the gap-6 that used to separate them) reserves the rail's
                  visual space without it participating in flow. */}
              <div className="relative">
              {heroLeftAd && (
                <div className="hidden lg:block absolute inset-y-0 left-0 w-[160px] overflow-hidden rounded-lg">
                  <AdMedia ad={heroLeftAd} fill />
                </div>
              )}

            {/* Featured Article image */}
            <div className={heroLeftAd ? 'lg:pl-[184px]' : ''}>
              {featuredArticle ? (
                <Link href={`/article/${featuredArticle.slug}`} className="group block">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted shadow-lg">
                    {featuredArticle.featuredImageUrl ? (
                      <Image
                        src={featuredArticle.featuredImageUrl}
                        alt={featuredArticle.featuredImageAlt || featuredArticle.title}
                        fill
                        sizes="(min-width: 1024px) 800px, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        priority
                        // `priority` alone only tells Next to preload this
                        // image (skip lazy-loading) - it does NOT set the
                        // fetchpriority="high" attribute on the <img>/<link
                        // rel=preload> in this Next.js version (confirmed by
                        // reading node_modules/next/dist/shared/lib/get-img-
                        // props.js: fetchPriority is a fully separate prop,
                        // defaulting to undefined). Without it, the browser
                        // schedules this LCP image's fetch at the same
                        // priority as everything else on the page, instead
                        // of ahead of it - PageSpeed Insights flagged this
                        // exact gap on the hero/featured article image.
                        fetchPriority="high"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FileText className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="bg-primary/90 text-primary-foreground hover:bg-primary">
                          {categoryLabels[featuredArticle.category]}
                        </Badge>
                      </div>
                      <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 line-clamp-2 leading-tight">
                        {featuredArticle.title}
                      </h1>
                      <p className="text-white/80 line-clamp-2 mb-4 text-sm md:text-base max-w-2xl">
                        {featuredArticle.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs md:text-sm text-white/70">
                        <span className="font-medium text-white">{featuredArticle.author?.name || 'Jurnal Kotabunan Team'}</span>
                        <span>•</span>
                        <span>
                          {featuredArticle.publishedAt?.toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            timeZone: SITE_TZ,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="aspect-[16/9] rounded-lg bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">No articles yet</p>
                </div>
              )}
            </div>
              </div>
              <AdSlot position="HOME_HERO_BELOW" device="DESKTOP" className="w-full h-40 rounded-lg overflow-hidden shrink-0" fill />
            </div>

            {/* Sidebar - Latest News (Scrollable). At lg+, absolutely positioned
                (inset-y-0 right-0) against the relative row above instead of a
                flex sibling - a plain flex/grid sibling let this box's own fixed-
                height scroll area (h-[500px]) act as ITS natural/hypothetical
                size, which made the ROW's auto-height follow the sidebar instead
                of the hero column, so the sidebar rendered at its own full
                height and overflowed below the hero column's actual bottom edge.
                Absolute positioning removes it from that calculation entirely -
                inset-y-0 forces its height to match the row's real height
                (driven only by the hero column, now the row's only in-flow
                item), and the inner scroll area's lg:flex-1 lg:min-h-0 fills
                whatever that turns out to be. Below lg it stays in normal flow
                (stacked under the hero column) with its original fixed height. */}
            <div className="flex flex-col bg-background/50 rounded-lg border p-4 lg:absolute lg:inset-y-0 lg:right-0 lg:w-[380px]">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-background/50 backdrop-blur-sm py-2 z-10 border-b">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-primary">Breaking News</h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  {sidebarArticles.length} Updates
                </Badge>
              </div>

              <div className="overflow-y-auto h-[500px] lg:h-auto lg:flex-1 lg:min-h-0 pr-2 space-y-4 scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40">
                {sidebarArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="group block p-3 rounded-lg hover:bg-muted/80 transition-all border border-transparent hover:border-border"
                  >
                    <div className="flex gap-3">
                      <div className="relative w-20 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                        {article.featuredImageUrl ? (
                          <Image
                            src={article.featuredImageUrl}
                            alt={article.featuredImageAlt || article.title}
                            fill
                            sizes="80px"
                            className="object-cover transition-transform group-hover:scale-110"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                          {article.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm">
                            {categoryLabels[article.category]}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground">
                            {article.publishedAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: SITE_TZ })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {latestArticles.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    No breaking news at the moment.
                  </div>
                )}
              </div>

              <div className="mt-4 pt-2 border-t">
                <Link href="/news" className="w-full">
                  <Button variant="outline" className="w-full">See All News</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Most Popular News - replaces the old static "Trust Indicators"
          cards (100% Evidence-Based / Published Articles / Legal Review /
          Editorial Process) per explicit request: real engagement content,
          swipeable + auto-scrolling slowly, instead of static claims. */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Most Popular News
          </h2>
          <PopularNewsCarousel articles={popularArticles} />
        </div>
      </section>

      {/* Categories Feed */}
      <div className="space-y-8 py-8">
        {/* Tourism Section */}
        {tourismArticles.length > 0 && (
          <CategorySection
            title="Tourism & Travel"
            category="TOURISM"
            articles={tourismArticles}
            viewAllHref="/category/tourism"
          />
        )}

        {/* Investment Section */}
        {investmentArticles.length > 0 && (
          <CategorySection
            title="Investment & Economy"
            category="INVESTMENT"
            articles={investmentArticles}
            viewAllHref="/category/investment"
          />
        )}

        {/* Incidents Section */}
        {incidentArticles.length > 0 && (
          <CategorySection
            title="Incidents & Safety"
            category="INCIDENTS"
            articles={incidentArticles}
            viewAllHref="/category/incidents"
          />
        )}

        {/* Local Section */}
        {localArticles.length > 0 && (
          <CategorySection
            title="Local News & Community"
            category="LOCAL"
            articles={localArticles}
            viewAllHref="/category/local"
          />
        )}

        {/* Jobs Section */}
        {jobsArticles.length > 0 && (
          <CategorySection
            title="Jobs & Career"
            category="JOBS"
            articles={jobsArticles}
            viewAllHref="/category/jobs"
          />
        )}

        {/* Opinion Section */}
        {opinionArticles.length > 0 && (
          <CategorySection
            title="Opinion & Analysis"
            category="OPINION"
            articles={opinionArticles}
            viewAllHref="/category/opinion"
          />
        )}
      </div>

      {/* Submit Report CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-7xl px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Have Information?</h2>
              <p className="text-primary-foreground/80">
                Submit your report or information to our investigative team.
              </p>
            </div>
            <Link href="/submit-report">
              <Button variant="secondary" size="lg">
                Submit Report
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Independent Investigative Journalism</h2>
            <p className="text-muted-foreground mb-6">
              Jurnal Kotabunan is an independent investigative journalism platform focused on
              delivering evidence-based news with high journalistic ethics standards. We are committed
              to providing accurate, balanced, and accountable information.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/about">
                <Button variant="outline">About Us</Button>
              </Link>
              <Link href="/transparency">
                <Button variant="outline">Transparency</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

const categoryLabels: Record<string, string> = {
  TOURISM: 'Tourism',
  GOVERNMENT: 'Government',
  INVESTMENT: 'Investment',
  INCIDENTS: 'Incidents',
  LOCAL: 'Local',
  JOBS: 'Jobs',
  OPINION: 'Opinion',
}
