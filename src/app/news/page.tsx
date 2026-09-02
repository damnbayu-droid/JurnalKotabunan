import { Fragment } from 'react'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArticleCard } from '@/components/article/article-card'
import { Badge } from '@/components/ui/badge'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'

export const metadata = {
  title: 'All News - Jurnal Kotabunan',
  description: 'Browse every published article on Jurnal Kotabunan, filterable by category.',
  alternates: {
    canonical: '/news',
  },
}

const PAGE_SIZE = 20

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'GOVERNMENT', label: 'Pemerintahan' },
  { value: 'TOURISM', label: 'Pariwisata' },
  { value: 'INVESTMENT', label: 'Investasi' },
  { value: 'INCIDENTS', label: 'Insiden' },
  { value: 'ENVIRONMENT', label: 'Lingkungan Hidup' },
  { value: 'PANANG', label: 'Panang' },
  { value: 'INTERNATIONAL', label: 'Internasional' },
  { value: 'TECHNOLOGY', label: 'Teknologi' },
  { value: 'OPINION', label: 'Opini' },
]

interface NewsPageProps {
  searchParams: Promise<{ page?: string; category?: string }>
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { page: pageParam, category: categoryParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1)
  const category = categoryParam && CATEGORIES.some((c) => c.value === categoryParam) ? categoryParam : undefined

  const where = { status: 'PUBLISHED' as const, ...(category ? { category: category as any } : {}) }

  const [articles, total] = await Promise.all([
    db.article.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: { name: true } } },
    }),
    db.article.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hrefFor = (p: number) => `/news?${new URLSearchParams({ ...(category ? { category } : {}), page: String(p) })}`

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">All News</h1>
        <p className="mt-2 text-muted-foreground">{total} article{total === 1 ? '' : 's'} published on Jurnal Kotabunan.</p>
      </div>

      {/* Category filter */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/news">
          <Badge variant={!category ? 'default' : 'outline'} className="cursor-pointer px-3 py-1.5 text-sm">
            All
          </Badge>
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.value} href={`/news?category=${c.value}`}>
            <Badge variant={category === c.value ? 'default' : 'outline'} className="cursor-pointer px-3 py-1.5 text-sm">
              {c.label}
            </Badge>
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No articles found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className="mt-10">
          <PaginationContent>
            {page > 1 && (
              <PaginationItem>
                <PaginationPrevious href={hrefFor(page - 1)} />
              </PaginationItem>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink href={hrefFor(p)} isActive={p === page}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                </Fragment>
              ))}
            {page < totalPages && (
              <PaginationItem>
                <PaginationNext href={hrefFor(page + 1)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
