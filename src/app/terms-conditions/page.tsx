import { Metadata } from 'next'
import { LEGAL_PAGES_LAST_UPDATED } from '@/lib/site-config'

export const metadata: Metadata = {
    title: 'Terms & Conditions - Jurnal Kotabunan',
    description: 'Terms and Conditions for using Jurnal Kotabunan.',
    alternates: {
        canonical: '/terms-conditions',
    },
}

export default function TermsConditionsPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>
            <p className="text-muted-foreground mb-8">Last Updated: {LEGAL_PAGES_LAST_UPDATED}</p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using Jurnal Kotabunan, you agree to comply with and be bound by these Terms & Conditions. If you do not agree, please do not use our site.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Use of Content</h2>
                    <p>
                        All content on Jurnal Kotabunan, including text, images, and videos, is for informational purposes only. You may not reproduce, distribute, or use our content for commercial purposes without our prior written consent.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. User Conduct</h2>
                    <p>
                        You agree not to use our website for any unlawful purpose or to post any content that is defamatory, obscene, or infringing on intellectual property rights.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Disclaimer of Warranties</h2>
                    <p>
                        Jurnal Kotabunan is provided "as is" without any warranties, express or implied. We do not guarantee the accuracy or completeness of any information on our site.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Limitation of Liability</h2>
                    <p>
                        Jurnal Kotabunan shall not be liable for any damages arising out of or in connection with your use of our website.
                    </p>
                </section>
            </div>
        </div>
    )
}
