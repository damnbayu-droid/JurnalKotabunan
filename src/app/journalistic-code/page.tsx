import { Metadata } from 'next'
import { LEGAL_PAGES_LAST_UPDATED } from '@/lib/site-config'

export const metadata: Metadata = {
    title: 'Journalistic Code of Ethics - Jurnal Kotabunan',
    description: 'Jurnal Kotabunan\'s journalistic code of ethics, adapted from the Indonesian Press Council standard.',
    alternates: {
        canonical: '/journalistic-code',
    },
}

export default function JournalisticCodePage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Journalistic Code of Ethics</h1>
            <p className="text-muted-foreground mb-8">Last Updated: {LEGAL_PAGES_LAST_UPDATED}</p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                <section>
                    <p>
                        Jurnal Kotabunan operates under Indonesian press law and adapts the Indonesian Press Council&apos;s
                        (Dewan Pers) national Journalistic Code of Ethics (Kode Etik Jurnalistik) to our own editorial
                        process. This code applies to every article published under the Jurnal Kotabunan name, regardless of
                        whether it was drafted with AI assistance.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Independence and Good Faith</h2>
                    <p>
                        Jurnal Kotabunan reports independently and in good faith, producing news that is accurate, balanced,
                        and does not carry ill intent. Editorial decisions on what to cover and how are not influenced by
                        advertisers, sponsors, or political interests.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Professional Fact-Gathering</h2>
                    <p>
                        We obtain and report information through legitimate, professional means: verifying claims,
                        crediting original sources, and citing published evidence for factual assertions. Every article on
                        Jurnal Kotabunan is required to reference at least one piece of supporting evidence before it can be
                        published.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. Accuracy, Balance, and No Presumption of Guilt</h2>
                    <p>
                        We verify facts before publication, present news in a balanced way, do not mix fact with opinion
                        that could be misleading, and apply the presumption of innocence - individuals are not
                        characterized as guilty of a crime before a competent legal process has determined so.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. No Fabrication, Defamation, or Obscenity</h2>
                    <p>
                        Jurnal Kotabunan does not publish fabricated, slanderous, or obscene news, and does not name or imply
                        specific accusations against private individuals without a documented, verifiable basis. Every
                        article is screened through an automated legal-risk assessment before publication precisely to
                        catch unsubstantiated accusations before they reach print.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Protection of Victims and Minors</h2>
                    <p>
                        We do not identify victims of sexual crimes and do not name minors involved in a crime, whether as
                        a perpetrator or a victim.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">6. Right of Reply and Correction</h2>
                    <p>
                        Subjects of critical reporting have the right to respond, and factual errors are corrected
                        promptly once verified. See our{' '}
                        <a href="/disclaimer" className="text-primary hover:underline">Disclaimer</a> for how to submit a
                        correction request.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">7. Protection of Sources</h2>
                    <p>
                        We protect the confidentiality of sources who request it, including tips submitted through our{' '}
                        <a href="/submit-report" className="text-primary hover:underline">Submit Report</a> page.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">8. Discrimination</h2>
                    <p>
                        We do not publish news that discriminates on the basis of ethnicity, religion, race, gender,
                        national origin, or disability, and do not sensationalize matters of religion (SARA) or physical
                        difference.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">9. Conflicts of Interest</h2>
                    <p>
                        Our team does not accept payment or favors, in any form, in exchange for shaping the content or
                        outcome of a report.
                    </p>
                </section>
            </div>
        </div>
    )
}
