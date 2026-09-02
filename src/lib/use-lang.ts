'use client'

export type Lang = 'en' | 'id'

/**
 * Site language. Jurnal Kotabunan is Indonesian-only, so this always
 * returns 'id'. Kept as a hook (not a constant) so the many components
 * that call it - and the `LangText` component - don't need to change.
 */
export function useLang(): Lang {
  return 'id'
}
