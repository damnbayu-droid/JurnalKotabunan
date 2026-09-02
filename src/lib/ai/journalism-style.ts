// Shared writing-style contract for every AI news-generation entry point
// (news-generator, rewrite-external-news, discover-viral, process-raw-data,
// bulk-backfill-content).
//
// Centralised because the previous per-route prompts told the model to
// literally print its own internal structure labels ("LEAD (The Hook)",
// "KEY QUOTES", "BACKGROUND/CONTEXT", ...) as headings in the published
// article - it followed that instruction exactly, which is why articles
// read like a filled-in worksheet instead of a real news story.

// ---------------------------------------------------------------------------
// Title diversity - a user audit of the 49-article Feb-Aug 2026 backfill
// batch found headlines leaning on the same handful of templates ("X Faces
// Y", "Kotabunan Sees Rise in X") repeatedly. This is injected into every prompt
// that asks the model for a title, alongside the existing topic-level
// avoid-list (findSimilarTitle/getExistingTitlesForCategory in
// news-generator.ts, which stops REPEATED TOPICS - this stops repeated
// SENTENCE SHAPE even across genuinely different topics).
// ---------------------------------------------------------------------------
export const TITLE_DIVERSITY_RULES = `
HEADLINE VARIETY (follow these to avoid every headline sounding the same shape):
1. Before writing the headline, silently pick ONE structural approach from this list and commit to it - do not default to the same one every time:
   a) Direct statement of the news ("Governor Signs New Visa Rules")
   b) Number/statistic lead ("64 Flights Cancelled as Tensions Disrupt Manado Routes")
   c) Place-first framing ("In Kotabunan, a Flood Warning Becomes a Traffic Crisis")
   d) Consequence/impact lead, stating the effect before the cause ("Hotel Bookings Drop After New Visa Rule")
   e) Action-verb-first, present tense, no subject preamble ("Blocks", "Seizes", "Reveals", "Grounds")
   f) Question framing, used sparingly - only when the story genuinely centers on an open question
   g) Contrast/tension framing ("Tourists Flock In as Locals Push Back")
2. Vary sentence length deliberately: mix short punchy headlines (6-8 words) with longer descriptive ones (12-15 words) - do not let every headline land at the same length.
3. Never open two consecutive headlines with the same word (especially "Kotabunan", "New", "Government", "Tourists") - if the natural draft starts that way, restructure it.
4. Ban these overused generic templates outright - if your draft matches one, rewrite it: "X Faces Y", "Kotabunan Sees Rise/Surge in X", "New Policy on X", "X: What You Need to Know", "The Truth About X", "X Amid Y".
5. Prefer concrete nouns over abstractions: a specific place, agency, number, or person's title beats a vague category word ("tourism sector" -> "Sam Ratulangi Airport"; "officials" -> "the Tourism Ministry").
6. Vary the verb: don't default to "Announces", "Introduces", or "Faces" - use precise verbs the story actually supports (blocks, deports, grounds, disburses, doubles, stalls, reverses).
7. Lead with the most surprising or specific detail in the story, not the broadest category it belongs to.
8. Avoid stacking more than one colon or dash per headline - pick one framing device, not several at once.
9. Don't editorialize with adjectives the reporting doesn't support ("Shocking", "Massive", "Historic") - let the concrete fact carry the weight instead.
10. When the story has a clear number (percentage, rupiah figure, count of people/flights/days), consider leading with it rather than burying it.
11. When two different articles in the same run cover the same broad topic (e.g. two tourism-arrivals stories), make sure their headlines emphasize DIFFERENT angles of that topic, not the same one reworded.
12. Avoid "-ing" gerund openers as a default crutch ("Rising Prices Hit..." used repeatedly) - mix in finite-verb constructions instead.
13. Use active voice by default; passive voice only when the actor is genuinely unknown or irrelevant to the story.
14. Don't pad with filler qualifiers ("In a Move That...", "In What Officials Call...") - get to the specific fact.
15. For OPINION/analysis pieces, it's fine (and often better) to use a colon-framed label + claim ("Editorial: Kotabunan's Real Scandal Is What Nobody Checked") rather than forcing a hard-news structure onto commentary.
16. Vary where the location sits in the sentence - not always "Kotabunan [verb] [thing]"; sometimes the location belongs at the end or middle.
17. Avoid repeating the exact same key noun from the short description verbatim in the headline - paraphrase at least one central term.
18. Don't use the same punctuation pattern (e.g. always ending in a period-less declarative) across a run of articles - headlines can end plainly, but avoid mechanical uniformity in how the very last word/phrase resolves.
19. If the story involves a named individual, consider leading with their role or the action, not always their nationality label first ("Norwegian Woman Deported..." repeated pattern - vary between name/role-first and action-first).
20. Prefer specific institution names (KEK Bitung, Sam Ratulangi International Airport, Sam Ratulangi University) over generic references ("a new zone", "the airport", "a university") whenever the source material supports it.
21. Avoid stock transition words as headline openers ("Meanwhile,", "Amid growing..., ") - open directly on the news.
22. When the story is genuinely about a trend over time, it's fine to use "X Percent" or "X-Year High/Low" framing - but don't use it as the ONLY numeric framing pattern across a batch.
23. Keep headlines under roughly 90 characters, but within that budget, let length vary naturally with the story's complexity rather than always maximizing it.
24. Double-check your own draft headline against the last few you've written in this session (if visible in context) - if the sentence shape matches, rewrite using a different approach from list item 1.
25. The short description (excerpt) should NOT just restate the headline in slightly longer words - it should add a genuinely new piece of information (a number, a name, a consequence) not present in the headline itself.
`.trim()

// ---------------------------------------------------------------------------
// Writing style rotation - previously one fixed style (AP/Reuters inverted
// pyramid) applied to literally every article regardless of topic, which is
// part of why a batch of many articles in a row reads monotone. pickWritingStyle()
// round-robins through these (module-level counter, same pattern as
// image-service.ts's GENERATOR_POOL rotation) so consecutive articles don't
// land on the same style purely by chance.
// ---------------------------------------------------------------------------

interface WritingStyle {
    name: string
    rules: string
}

const SHARED_FORMATTING_RULES = `
- The "Inverted Pyramid" and "5W1H" (Who, What, Where, When, Why, How) are internal structuring guidance for YOU, the writer, regardless of which style below you're using. NEVER print them, or any other planning/section label, as visible text in the article. Forbidden as headings or labels - none of these, or anything with the same generic/report-template flavor, may appear anywhere in the output: "LEAD", "THE FACTS", "KEY QUOTES", "BACKGROUND/CONTEXT", "IMPACT", "OPPOSING VIEWS", "CONCLUSION", "Jurnal Kotabunan Analysis", "Main Data & Facts", "The Key Players", "Chronology & Activities", "Public & Economic Impact", "Key Takeaways". A real news article never announces its own structure and never reads like a corporate report or a listicle.
- Subheadings are optional. Use at most 2-4, only in pieces long enough to need them. Each must be a short, specific, content-derived phrase, never a generic scaffolding word.
- Formatting: HTML only. Use <p> for every paragraph and <h3> for the rare subheading. No markdown syntax (no **, ##, etc.) anywhere in the output.
- LENGTH IS MANDATORY, NOT A SUGGESTION: write a minimum of 600 words and aim for 800-1000. That means at least 8-10 substantial paragraphs (3-5 sentences each) covering the lead, supporting facts with specific numbers/names/places, background, and consequences/next steps. A 3-paragraph article is a FAILED response.
- QUOTES - FABRICATION IS FORBIDDEN, NO EXCEPTIONS: only use a quote that is explicitly present in the source material you were given (word-for-word or a faithful paraphrase clearly marked as such), attributed to whoever the source actually attributes it to. NEVER invent a quote and attribute it to a real, named, identifiable person (a government official, executive, celebrity, or anyone else) who did not actually say it in the source material - this is a fabrication that can defame a real person and is a hard legal/editorial violation, not a style choice. If the source material contains no quotable statement from anyone, write the entire article without a single quote rather than inventing one - a quote-free article is correct; a fabricated quote is not. It is fine to describe what an authority/agency DID ("the Ministry announced...", "immigration authorities imposed...") without ever quoting a specific person who wasn't quoted in the source.
`.trim()

export const WRITING_STYLES: WritingStyle[] = [
    {
        name: 'inverted_pyramid',
        rules: `
WRITING STYLE: Inverted Pyramid (Associated Press / Reuters house style).
- Lead paragraph packs the single most important fact first - who, what, where, when, in one or two sentences a reader could stop after and still understand the core news.
- Each following paragraph descends in importance: supporting facts, then quotes, then background, then broader context/consequences last.
- Tone: neutral, factual, third-person, minimal adjectives. If the source material has a real quote, weave it naturally into the prose ("... said [the actual name/title from the source]."), never under a "Quotes" heading. Never invent the name in that example - it is illustrative of PLACEMENT only, not a name to reuse.
${SHARED_FORMATTING_RULES}
`.trim(),
    },
    {
        name: 'narrative_feature',
        rules: `
WRITING STYLE: Narrative Feature (magazine-style, still 100% factual).
- Open with a single concrete scene, moment, or image from the story - a specific person doing a specific thing at a specific place - before widening out to the news itself in paragraph 2-3. Do NOT lead with the driest summary fact; let the scene carry the opening.
- Keep descriptive, sensory detail throughout (sounds, sights, specific settings) woven around the hard facts, not replacing them - this is still a news article, not fiction, so every scene-setting detail must be something a reporter could plausibly have observed or been told.
- Quotes can run slightly longer and more conversational in tone than the inverted-pyramid style, placed where they land naturally in the narrative flow rather than stacked early.
- Close with a forward-looking or reflective final beat rather than a flat "in conclusion" style ending.
${SHARED_FORMATTING_RULES}
`.trim(),
    },
    {
        name: 'data_driven_analytical',
        rules: `
WRITING STYLE: Data-Driven Analytical (explanatory, evidence-first).
- Lead with the single most important number, percentage, or figure in the story, stated precisely, before naming who's behind it or why it matters.
- Structure the body around evidence: each paragraph should introduce a specific data point, comparison, or trend, then explain its significance - avoid vague characterizations ("significant growth") without the number attached.
- Include at least one direct comparison (year-over-year, versus a target, versus a neighboring region/sector) to give the reader a frame of reference for the numbers.
- Tone: explanatory and precise rather than dramatic - the goal is a reader walking away understanding exactly what changed and by how much, not just that something changed.
${SHARED_FORMATTING_RULES}
`.trim(),
    },
    {
        name: 'on_ground_reportage',
        rules: `
WRITING STYLE: On-the-Ground Reportage (reporter-at-the-scene voice).
- Write as if the reporter is physically present at the location described, grounding the piece in specific, named places (streets, neighborhoods, buildings) from the first paragraph.
- If the source material contains a quote, weave it in earlier and more frequently than the other styles - within the first 3 paragraphs if possible, from whoever the source actually quotes (directly affected residents/workers read especially well in this style, not just an official spokesperson). If the source has no quote at all, do not invent one - carry the same on-the-ground sensory detail through unquoted observational prose instead.
- Include local color and specific sensory/observational detail (what a location looks/sounds like right now) as texture around the facts, not as decoration replacing them.
- Keep sentences slightly shorter and more direct than the narrative-feature style - this is urgent, immediate reporting, not a slow-build magazine piece.
${SHARED_FORMATTING_RULES}
`.trim(),
    },
]

let writingStyleIndex = 0
export function pickWritingStyle(): WritingStyle {
    const style = WRITING_STYLES[writingStyleIndex % WRITING_STYLES.length]
    writingStyleIndex++
    return style
}
