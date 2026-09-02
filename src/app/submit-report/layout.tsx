import { Metadata } from 'next'

// submit-report/page.tsx is a client component ('use client', for the form
// state), which can't export `metadata` itself - this sibling layout is
// the standard way to still give the route its own title/canonical.
export const metadata: Metadata = {
  title: 'Submit a Report - Jurnal Kotabunan',
  description: 'Submit a tip or report to the Jurnal Kotabunan editorial team.',
  alternates: {
    canonical: '/submit-report',
  },
}

export default function SubmitReportLayout({ children }: { children: React.ReactNode }) {
  return children
}
