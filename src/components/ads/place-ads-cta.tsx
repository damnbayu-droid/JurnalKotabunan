'use client'

import Link from 'next/link'
import { Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLang } from '@/lib/use-lang'

const translations = {
  en: {
    heading: 'Want to advertise on Jurnal Kotabunan?',
    body: 'Reach readers across Kotabunan - sign up as an advertiser, starting at affordable rates.',
    cta: 'Place Ads',
  },
  id: {
    heading: 'Ingin memasang iklan di Jurnal Kotabunan?',
    body: 'Jangkau pembaca Kotabunan - daftar sebagai pengiklan, mulai dari harga terjangkau.',
    cta: 'Pasang Iklan',
  },
}

/** Pure promo banner (no DB query) inviting anyone to advertise - sits right above the footer on every page. */
export function PlaceAdsCTA() {
  const lang = useLang()
  const t = translations[lang]

  return (
    <section className="border-y bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary shrink-0" />
          <div>
            <p className="font-semibold">{t.heading}</p>
            <p className="text-sm text-muted-foreground">{t.body}</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/ads">{t.cta}</Link>
        </Button>
      </div>
    </section>
  )
}
