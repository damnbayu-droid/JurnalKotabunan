import { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/site-config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} - Independent Investigative Journalism`,
    short_name: SITE_NAME,
    description: 'Independent investigative journalism platform for Kotabunan, Sulawesi Utara, Indonesia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#8b1a2e',
    icons: [
      { src: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
