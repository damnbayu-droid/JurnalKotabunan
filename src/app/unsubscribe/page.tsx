import { db } from '@/lib/db'
import { CheckCircle, XCircle } from 'lucide-react'

export const metadata = {
    title: 'Unsubscribe - Jurnal Kotabunan',
    robots: { index: false, follow: false },
}

interface UnsubscribePageProps {
    searchParams: Promise<{ id?: string }>
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
    const { id } = await searchParams

    let result: 'success' | 'not_found' | 'missing' = 'missing'
    if (id) {
        const subscriber = await db.subscriber.findUnique({ where: { id } })
        if (subscriber) {
            await db.subscriber.update({ where: { id }, data: { active: false } })
            result = 'success'
        } else {
            result = 'not_found'
        }
    }

    return (
        <div className="container mx-auto px-4 py-24 max-w-md text-center">
            {result === 'success' && (
                <>
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Berhasil Berhenti Berlangganan</h1>
                    <p className="text-muted-foreground">
                        Kamu tidak akan lagi menerima email berita baru dari Jurnal Kotabunan. Kamu bisa berlangganan lagi kapan saja lewat footer situs.
                    </p>
                </>
            )}
            {result === 'not_found' && (
                <>
                    <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Link Tidak Valid</h1>
                    <p className="text-muted-foreground">Tautan berhenti berlangganan ini tidak ditemukan atau sudah tidak berlaku.</p>
                </>
            )}
            {result === 'missing' && (
                <>
                    <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Link Tidak Lengkap</h1>
                    <p className="text-muted-foreground">Gunakan tautan berhenti berlangganan dari email yang kamu terima.</p>
                </>
            )}
        </div>
    )
}
