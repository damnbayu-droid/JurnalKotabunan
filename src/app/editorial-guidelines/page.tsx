import { Metadata } from 'next'
import { LEGAL_PAGES_LAST_UPDATED } from '@/lib/site-config'

export const metadata: Metadata = {
    title: 'Editorial Guidelines - Jurnal Kotabunan',
    description: 'Editorial Guidelines and Ethics for Jurnal Kotabunan.',
    alternates: {
        canonical: '/editorial-guidelines',
    },
}

export default function EditorialGuidelinesPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Editorial Guidelines</h1>
            <p className="text-muted-foreground mb-8">Last Updated: {LEGAL_PAGES_LAST_UPDATED}</p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
                    <p>
                        Jurnal Kotabunan is dedicated to high-quality, independent journalism. These guidelines outline the principles that guide our reporting and editing.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Accuracy and Verification</h2>
                    <p>
                        We strive for accuracy in all our reporting. All facts must be verified before publication. When we make a mistake, we will correct it promptly and transparently.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. Independence and Integrity</h2>
                    <p>
                        We maintain editorial independence from advertisers, sponsors, and political interests. Our journalists are expected to avoid conflicts of interest.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Fairness and Balance</h2>
                    <p>
                        We aim to report fairly and provide a balanced view of complex issues. We give subjects of critical reporting an opportunity to respond.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Privacy and Sensationalism</h2>
                    <p>
                        We respect the privacy of individuals and avoid sensationalism. We do not publish gratuitous violence or explicit content.
                    </p>
                </section>
            </div>
        </div>
    )
}
