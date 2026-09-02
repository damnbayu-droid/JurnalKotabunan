import { db } from '@/lib/db'
import { ArticleCard } from '@/components/article/article-card'
import { Search as SearchIcon } from 'lucide-react'

export const metadata = {
  title: 'Search - Jurnal Kotabunan',
  // Every ?q= variant canonicalizes to the bare /search page - individual
  // search-result URLs are thin/duplicate content and shouldn't compete
  // with real article pages in the index.
  alternates: {
    canonical: '/search',
  },
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

const PAGE_SIZE = 30

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const query = (q || '').trim()

  const articles = query
    ? await db.article.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { excerpt: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { publishedAt: 'desc' },
        take: PAGE_SIZE,
        include: { author: { select: { name: true } } },
      })
    : []

  // Powers the admin Metrics panel's "Most Searched" indicator - one row
  // per real search performed. Didn't exist before 2026-09-02 (search
  // queries weren't tracked at all). Best-effort: a logging failure should
  // never break the actual search page.
  if (query) {
    await db.searchQuery.create({ data: { query, resultCount: articles.length } }).catch((err) => {
      console.error('Failed to log search query:', err)
    })
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <SearchIcon className="h-7 w-7" />
          Search
        </h1>
        {query ? (
          <p className="mt-2 text-muted-foreground">
            {articles.length} result{articles.length === 1 ? '' : 's'} for &quot;{query}&quot;
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">Type something in the search box to find articles.</p>
        )}
      </div>

      {query && articles.length === 0 && (
        <p className="py-16 text-center text-muted-foreground">
          No articles found for &quot;{query}&quot;. Try a different title, word, or keyword.
        </p>
      )}

      {articles.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}
