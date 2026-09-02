import { Metadata } from 'next'

// contact/page.tsx is a client component ('use client', for the form
// state), which can't export `metadata` itself - this sibling layout is
// the standard way to still give the route its own title/canonical.
export const metadata: Metadata = {
  title: 'Contact Us - Jurnal Kotabunan',
  description: 'Get in touch with the Jurnal Kotabunan editorial team.',
  alternates: {
    canonical: '/contact',
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
