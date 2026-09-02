'use client'

import { useLang } from '@/lib/use-lang'

const CATEGORY_LABELS = {
  en: {
    GOVERNMENT: 'Government',
    TOURISM: 'Tourism',
    INVESTMENT: 'Investment',
    INCIDENTS: 'Incidents',
    ENVIRONMENT: 'Environment',
    PANANG: 'Panang',
    INTERNATIONAL: 'International',
    TECHNOLOGY: 'Technology',
    OPINION: 'Opinion',
  },
  id: {
    GOVERNMENT: 'Pemerintahan',
    TOURISM: 'Pariwisata',
    INVESTMENT: 'Investasi',
    INCIDENTS: 'Insiden',
    ENVIRONMENT: 'Lingkungan Hidup',
    PANANG: 'Panang',
    INTERNATIONAL: 'Internasional',
    TECHNOLOGY: 'Teknologi',
    OPINION: 'Opini',
  },
} as const

export function CategoryLabel({ category }: { category: string }) {
  const lang = useLang()
  return <>{CATEGORY_LABELS[lang][category as keyof typeof CATEGORY_LABELS['en']] ?? category}</>
}
