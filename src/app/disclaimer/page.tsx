import { Metadata } from 'next'
import { LEGAL_PAGES_LAST_UPDATED, COMPANY_NAME } from '@/lib/site-config'

export const metadata: Metadata = {
    title: 'Disclaimer - Jurnal Kotabunan',
    description: 'Disclaimer for Jurnal Kotabunan.',
    alternates: {
        canonical: '/disclaimer',
    },
}

export default function DisclaimerPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Disclaimer</h1>
            <p className="text-muted-foreground mb-8">Last Updated: {LEGAL_PAGES_LAST_UPDATED}</p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. AI-Assisted Content</h2>
                    <p>
                        Jurnal Kotabunan uses AI technology to assist with drafting articles, translating and summarizing source
                        material, and generating illustrative imagery, under the review and editorial control of our team
                        before publication. Every article passes through an automated legal-risk and accuracy review, and
                        may still be reviewed or edited by an editor, before it is published. AI-generated illustrative
                        images are clearly created to depict a story&apos;s subject matter and are not photographs of the
                        actual events described unless explicitly credited to a photographer or source outlet.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Accuracy of Information</h2>
                    <p>
                        While we make every effort to verify facts before publication, news is a developing product and
                        information may change or be updated as a story unfolds. Jurnal Kotabunan makes no warranty as to the
                        completeness, reliability, or accuracy of any article at any given time. If you believe an article
                        contains an error, please see our correction process below.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. Not Legal, Financial, or Travel Advice</h2>
                    <p>
                        Content published on Jurnal Kotabunan, including coverage of regulations, investment opportunities, or
                        travel conditions, is provided for general informational purposes only and does not constitute
                        legal, financial, immigration, or travel advice. Readers should consult a qualified professional or
                        the relevant government authority before making decisions based on our reporting.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. External Links</h2>
                    <p>
                        Our articles may link to or cite external sources and third-party websites for context or
                        attribution. Jurnal Kotabunan does not control and is not responsible for the content, accuracy, or
                        privacy practices of any external site.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. User-Submitted Content</h2>
                    <p>
                        Reports and tips submitted through our Submit Report page are treated as unverified information
                        until independently confirmed by our editorial process. Publishing a submitted report, or acting on
                        it, is at our sole editorial discretion.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">6. Corrections</h2>
                    <p>
                        We correct factual errors promptly once verified. To report a suspected error, please contact us
                        at{' '}
                        <a href="mailto:info@jurnal.kotabunan.com" className="text-primary hover:underline">
                            info@jurnal.kotabunan.com
                        </a>{' '}
                        with the article link and a description of the issue.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">7. Publisher</h2>
                    <p>Jurnal Kotabunan is published by {COMPANY_NAME}.</p>
                </section>
            </div>
        </div>
    )
}
