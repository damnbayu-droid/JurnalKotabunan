import { Metadata } from 'next'
import { LEGAL_PAGES_LAST_UPDATED } from '@/lib/site-config'

export const metadata: Metadata = {
    title: 'Privacy Policy - Jurnal Kotabunan',
    description: 'Privacy Policy for Jurnal Kotabunan.',
    alternates: {
        canonical: '/privacy-policy',
    },
}

export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last Updated: {LEGAL_PAGES_LAST_UPDATED}</p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
                    <p>
                        Jurnal Kotabunan is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
                    <p>
                        We may collect personal information such as your name and email address when you subscribe to our newsletter or submit a report. We also automatically collect usage data such as your IP address and browser type.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. How We Use Your Information</h2>
                    <p>
                        We use your information to provide and improve our services, communicate with you, and ensure the security of our platform. We do not sell your personal data to third parties.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Cookies</h2>
                    <p>
                        We use cookies to enhance your browsing experience. You can choose to disable cookies through your browser settings.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at privacy@jurnal.kotabunan.com.
                    </p>
                </section>
            </div>
        </div>
    )
}
