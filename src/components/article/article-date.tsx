'use client'

import { useLang } from '@/lib/use-lang'
import { SITE_TZ } from '@/lib/date'

/**
 * Formats a date in the reader's chosen language (was hardcoded to id-ID
 * regardless of toggle). Always in WITA (Bali time), not the visitor's own
 * browser timezone - this is an editorial "published on X" date, and a
 * reader in a different timezone should still see the Bali calendar day
 * the article actually went out on, same as everyone else.
 */
export function ArticleDate({ date }: { date: Date | string | null | undefined }) {
  const lang = useLang()
  if (!date) return null
  const d = new Date(date)
  return (
    <>
      {d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: SITE_TZ,
      })}
    </>
  )
}
