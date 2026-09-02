import { Metadata } from 'next'
import { LEGAL_PAGES_LAST_UPDATED, COMPANY_NAME } from '@/lib/site-config'

export const metadata: Metadata = {
    title: 'Cyber Media Guidelines - Jurnal Kotabunan',
    description: 'Jurnal Kotabunan\'s cyber media guidelines, adapted from the Indonesian Press Council standard for online news outlets.',
    alternates: {
        canonical: '/cyber-media-guidelines',
    },
}

export default function CyberMediaGuidelinesPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Cyber Media Guidelines</h1>
            <p className="text-muted-foreground mb-8">Last Updated: {LEGAL_PAGES_LAST_UPDATED}</p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                <section>
                    <p>
                        As an online news outlet, Jurnal Kotabunan additionally adapts the Indonesian Press Council&apos;s
                        Cyber Media Guidelines (Pedoman Pemberitaan Media Siber), which apply specifically to how news is
                        verified, corrected, and moderated on a digital platform.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Verification</h2>
                    <p>
                        Every article is checked against our evidence requirement before publication - each published
                        article must reference at least one verifiable source. Where a story is time-sensitive and full
                        verification is still in progress, this will be stated explicitly in the article rather than
                        presented as confirmed fact.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Corrections and Transparency of Edits</h2>
                    <p>
                        When a published article is found to contain a factual error, we correct it as soon as it is
                        verified. Substantive corrections to a story&apos;s facts are not made silently. To request a
                        correction, see our{' '}
                        <a href="/disclaimer" className="text-primary hover:underline">Disclaimer</a>.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. User Comments</h2>
                    <p>
                        Jurnal Kotabunan allows readers to comment on articles. Comments are user-generated content and do not
                        represent the views of Jurnal Kotabunan or its editorial team. Every comment is screened for hate
                        speech, defamation, and discriminatory (SARA) content, either automatically or by an editor,
                        before it becomes publicly visible; comments that violate this standard are rejected. We reserve
                        the right to remove any comment that violates Indonesian law or this standard.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Advertising Identification</h2>
                    <p>
                        Paid advertising placements on Jurnal Kotabunan are visually and structurally distinct from editorial
                        content - they are banner/display placements, never articles written to appear as independent
                        news coverage. See our{' '}
                        <a href="/transparency" className="text-primary hover:underline">Transparency</a> page for our
                        funding disclosure.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Publisher Identity</h2>
                    <p>
                        Jurnal Kotabunan is published by {COMPANY_NAME}. Our editorial contacts are listed on our{' '}
                        <a href="/contact" className="text-primary hover:underline">Contact</a> page, and our team is
                        listed on our{' '}
                        <a href="/editorial-team" className="text-primary hover:underline">Editorial Team</a> page.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">6. Source Protection</h2>
                    <p>
                        Consistent with our{' '}
                        <a href="/journalistic-code" className="text-primary hover:underline">Journalistic Code of
                        Ethics</a>, we protect the identity of confidential sources and do not disclose information
                        submitted through our Submit Report page beyond what is necessary for editorial verification.
                    </p>
                </section>
            </div>
        </div>
    )
}
