import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Clock, User, Eye, FileText } from 'lucide-react'
import { SITE_TZ } from '@/lib/date'

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  featuredImageUrl: string | null
  featuredImageAlt: string | null
  publishedAt: Date | null
  viewCount: number
  aiAssisted: boolean
  author?: { name: string | null } | null
}

interface ArticleCardProps {
  article: Article
  variant?: 'default' | 'compact'
}

const categoryLabels: Record<string, string> = {
  GOVERNMENT: 'Pemerintahan',
  TOURISM: 'Pariwisata',
  INVESTMENT: 'Investasi',
  INCIDENTS: 'Insiden',
  ENVIRONMENT: 'Lingkungan Hidup',
  PANANG: 'Panang',
  INTERNATIONAL: 'Internasional',
  TECHNOLOGY: 'Teknologi',
  OPINION: 'Opini',
}

export function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  if (variant === 'compact') {
    return (
      <Link href={`/article/${article.slug}`} className="group block">
        <div className="flex gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
          <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
            {article.featuredImageUrl ? (
              <Image
                src={article.featuredImageUrl}
                alt={article.featuredImageAlt || article.title}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {article.publishedAt?.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: SITE_TZ,
                })}
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/article/${article.slug}`} className="group block h-full">
      <article className="h-full flex flex-col rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {article.featuredImageUrl ? (
            <Image
              src={article.featuredImageUrl}
              alt={article.featuredImageAlt || article.title}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              {categoryLabels[article.category] || article.category}
            </Badge>
          </div>
        </div>
        <div className="flex-1 flex flex-col p-4">
          <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {article.excerpt}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{article.author?.name || 'Jurnal Kotabunan Team'}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{article.viewCount}</span>
              </div>
              <span>
                {article.publishedAt?.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  timeZone: SITE_TZ,
                })}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
