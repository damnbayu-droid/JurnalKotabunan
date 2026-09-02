import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ArticleCard } from '@/components/article/article-card'
import { Badge } from '@/components/ui/badge'
import { BreadcrumbJsonLd } from '@/components/seo/article-json-ld'
import { SITE_URL } from '@/lib/site-config'

interface CategoryPageProps {
  params: Promise<{ category: string }>
}

const validCategories: Record<string, string> = {
  government: 'GOVERNMENT',
  tourism: 'TOURISM',
  investment: 'INVESTMENT',
  incidents: 'INCIDENTS',
  environment: 'ENVIRONMENT',
  panang: 'PANANG',
  international: 'INTERNATIONAL',
  technology: 'TECHNOLOGY',
  opinion: 'OPINION',
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

const categoryDescriptions: Record<string, string> = {
  GOVERNMENT: 'Kebijakan Pemkab Bolaang Mongondow Timur dan Pemprov Sulawesi Utara, pernyataan Bupati dan Gubernur, regulasi, pelayanan publik, serta perkembangan dari Jakarta yang berdampak ke daerah.',
  TOURISM: 'Berita dan investigasi seputar pariwisata Kotabunan dan Sulawesi Utara.',
  INVESTMENT: 'Analisis dan laporan tentang investasi di Kotabunan dan Bolaang Mongondow Timur.',
  INCIDENTS: 'Laporan insiden dan peristiwa penting di Kotabunan dan Bolaang Mongondow Timur.',
  ENVIRONMENT: 'Kerusakan lahan dan lingkungan, konservasi, serta dampak korporasi terhadap lingkungan Kotabunan.',
  PANANG: 'Liputan kawasan tambang Panang: hak atas tanah (HGU), sejarah pertambangan, dinamika pemerintah-warga, dan masyarakat Panang. Setiap tudingan ditulis sebagai klaim beratribusi, bukan fakta final.',
  INTERNATIONAL: 'Perkembangan internasional yang relevan bagi Kotabunan, terutama harga emas dunia dan ekonomi penambang rakyat.',
  TECHNOLOGY: 'Teknologi pengolahan tambang, infrastruktur energi dan digital, serta inovasi di Bolaang Mongondow Timur.',
  OPINION: 'Suara warga: pernyataan langsung masyarakat yang dikutip dari unggahan media sosial publik, dengan tautan ke unggahan aslinya.',
}

export async function generateStaticParams() {
  return Object.keys(validCategories).map((category) => ({
    category,
  }))
}

async function getCategoryArticles(category: string) {
  return db.article.findMany({
    where: {
      status: 'PUBLISHED',
      category: category as any,
    },
    orderBy: { publishedAt: 'desc' },
    include: {
      author: { select: { name: true } },
    },
  })
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params
  const category = validCategories[categorySlug]

  if (!category) {
    return { title: 'Category not found' }
  }

  return {
    title: `${categoryLabels[category]} - Jurnal Kotabunan`,
    description: categoryDescriptions[category],
    alternates: {
      canonical: `/category/${categorySlug}`,
    },
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categorySlug } = await params
  const category = validCategories[categorySlug]

  if (!category) {
    notFound()
  }

  const articles = await getCategoryArticles(category)

  return (
    <div className="py-8">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: categoryLabels[category], url: `${SITE_URL}/category/${categorySlug}` },
        ]}
      />
      <div className="container mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-sm">
              Category
            </Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {categoryLabels[category]}
          </h1>
          <p className="text-muted-foreground">
            {categoryDescriptions[category]}
          </p>
        </div>

        {/* Articles Grid */}
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No articles in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
