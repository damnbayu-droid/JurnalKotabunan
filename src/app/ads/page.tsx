import { db } from '@/lib/db'
import { AdsOrderFlow } from '@/components/ads/ads-order-flow'

export const metadata = {
  title: 'Advertise on Jurnal Kotabunan - Ad Sizes & Pricing',
  description: 'Check available ad slot sizes and prices, and place your ad order directly.',
  alternates: {
    canonical: '/ads',
  },
}

export const revalidate = 60

async function getPricedSlots() {
  return db.adSlot.findMany({
    where: { pricePerDay: { not: null } },
    orderBy: { pricePerDay: 'asc' },
  })
}

export default async function AdsPage() {
  const slots = await getPricedSlots()

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Place Ads</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Check available slot sizes and prices, pick your dates, and place your order directly - no separate account needed.
        </p>
      </div>

      <AdsOrderFlow slots={slots} />
    </div>
  )
}
