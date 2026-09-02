import { SITE_NAME, SITE_URL, SITE_DOMAIN, COMPANY_NAME, COMPANY_SHORT_NAME } from '@/lib/site-config'

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  featuredImageUrl: string | null
  featuredImageAlt: string | null
  publishedAt: Date | null
  updatedAt?: Date | null
  author?: { name: string | null } | null
}

interface ArticleJsonLdProps {
  article: Article
}

// Jurnal Kotabunan operates under (is a division of) PT Indonesia Oncharge
// Advertising - expressed via schema.org's parentOrganization property so
// it's machine-readable wherever the publisher/organization is declared.
const PARENT_ORGANIZATION = {
  '@type': 'Organization',
  name: COMPANY_NAME,
  alternateName: COMPANY_SHORT_NAME,
}

const KOTABUNAN_ADDRESS = {
  '@type': 'PostalAddress',
  addressLocality: 'Kotabunan',
  addressRegion: 'Sulawesi Utara',
  addressCountry: 'ID',
}

// Google's structured data spec requires `image` to be a fully-qualified
// absolute URL - featuredImageUrl is stored as a site-relative path
// (e.g. "/uploads/articles/foo.jpg"), which Next.js's own metadata API
// auto-resolves against metadataBase for og:image, but a hand-written
// JSON-LD <script> gets no such help and needs this done explicitly.
function toAbsoluteUrl(url: string): string {
  return url.startsWith('http') ? url : `${SITE_URL}${url}`
}

export function ArticleJsonLd({ article }: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    // `image` is a REQUIRED field for Google News/Top Stories eligibility -
    // fall back to the site default OG image rather than an empty array so
    // an article with no featured image doesn't silently lose rich-result
    // eligibility entirely.
    image: [toAbsoluteUrl(article.featuredImageUrl || '/og-image.jpg')],
    datePublished: article.publishedAt?.toISOString(),
    dateModified: (article.updatedAt ?? article.publishedAt)?.toISOString(),
    author: {
      '@type': 'Person',
      name: article.author?.name || `Tim ${SITE_NAME}`,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      parentOrganization: PARENT_ORGANIZATION,
      address: KOTABUNAN_ADDRESS,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon-512.png`,
        width: 512,
        height: 512,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/article/${article.slug}`,
    },
    articleSection: article.category,
    inLanguage: 'id',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function WebsiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    parentOrganization: PARENT_ORGANIZATION,
    address: KOTABUNAN_ADDRESS,
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Kotabunan, Bolaang Mongondow Timur, Sulawesi Utara',
    },
    sameAs: [
      'https://facebook.com/jurnalkotabunan',
      'https://twitter.com/jurnalkotabunan',
      'https://instagram.com/jurnalkotabunan',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: `info@${SITE_DOMAIN}`,
      areaServed: 'ID',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
