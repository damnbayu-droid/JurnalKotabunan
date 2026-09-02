import { myaiComplete } from '@/lib/ai/myaiClient'

// AI Reasoner for image prompts - previously buildImagePrompt() (see
// image-service.ts) was a purely deterministic template built from just the
// title + a short excerpt snippet, never the article content itself, which
// is a big part of why images across a batch felt visually similar (same
// category -> same boilerplate visual phrase, same randomized composition
// pool). This reads title + excerpt + a slice of the actual content, has
// the model reason about what the story is really about, and asks it to
// commit to ONE visual style (rotated, not left to the model's own
// tendency to default to the same style) so a run of many images doesn't
// all look like the same genre of photo.

const IMAGE_VISUAL_STYLES = [
    'photojournalism, natural available light, sharp focus, shot on a press camera',
    'documentary reportage, slightly grainy, candid unposed moment, muted natural colors',
    'cinematic wide establishing shot, dramatic depth of field, golden or blue hour lighting',
    'illustrative editorial art, painterly digital illustration style, bold simplified shapes',
    'aerial/drone perspective, high vantage point, geometric composition',
    'macro human-interest detail shot, shallow depth of field on hands/faces/objects, intimate framing',
]

let visualStyleIndex = 0
function nextVisualStyle(): string {
    const style = IMAGE_VISUAL_STYLES[visualStyleIndex % IMAGE_VISUAL_STYLES.length]
    visualStyleIndex++
    return style
}

/** Strips HTML and takes roughly the first 25% of an article's plain text, capped for prompt-length/cost reasons. */
function contentSlice(content: string): string {
    const plain = content
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    const quarter = Math.floor(plain.length * 0.28)
    return plain.slice(0, Math.min(quarter, 700))
}

/**
 * Some model responses leak a reasoning/summary sentence before the actual
 * prompt despite being told not to (observed in testing: a narrative
 * paragraph, blank line, then the real "Capture a scene..." prompt). Strip
 * that leaked preamble by preferring the paragraph that actually contains
 * the required "Kotabunan, North Sulawesi, Indonesia" phrase, since the
 * leaked reasoning paragraph typically doesn't include it.
 */
function extractPromptText(raw: string): string {
    const cleaned = raw.trim().replace(/^["']|["']$/g, '')
    const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    if (paragraphs.length <= 1) return cleaned
    const withPhrase = paragraphs.filter((p) => /Kotabunan.*Indonesia/i.test(p))
    return withPhrase.length ? withPhrase[withPhrase.length - 1] : paragraphs[paragraphs.length - 1]
}

export interface ReasonedImagePromptInput {
    title: string
    excerpt?: string
    content: string
    category?: string
}

/**
 * Reads title + excerpt + a content slice, has the AI reason out the story's
 * core visual subject and 2-3 concrete story-specific details, and returns
 * one ready-to-use image-generation prompt in a rotated visual style. Never
 * throws - returns null on any failure so the caller falls back to the
 * deterministic buildImagePrompt() template (see image-service.ts).
 */
export async function buildReasonedImagePrompt(input: ReasonedImagePromptInput): Promise<string | null> {
    try {
        const visualStyle = nextVisualStyle()
        const snippet = contentSlice(input.content)

        const raw = await myaiComplete('chatbot', [
            {
                role: 'system',
                content: `You are a photo editor for a Kotabunan (North Sulawesi, Indonesia) news outlet. Read a news story's headline, summary, and an excerpt of its body text. Identify the single most visually concrete subject of the story and 2-3 specific details (a place, an object, an action, or a mood) that are unique to THIS story - not generic stock-photo keywords for its category. Then write exactly one image-generation prompt (60-100 words) for an editorial photograph illustrating this specific story, in this visual style: ${visualStyle}.

The prompt must:
- Ground the image in the concrete details you identified, not just the category.
- Include: "Kotabunan, North Sulawesi, Indonesia", the visual style described above, and this safety clause verbatim: "fully clothed, professional attire, tasteful composition, appropriate for a general-audience news outlet, no nudity, no sexual content".
- Never mention real named individuals by name (describe roles/actions instead, not identities).
- NEVER default to a person reading, holding, or looking at a newspaper - this is a stock-photo cliche that shows up so often it makes every story look identical, especially for abstract/analytical stories (opinion, analysis) that don't have an obvious concrete subject. For those, use something else grounded in the story's actual topic instead: a symbolic object, a relevant location, an abstract/artistic composition, a silhouette, an aerial view - anything but a person with a newspaper.

CRITICAL: Do your identification/reasoning step silently. Do NOT write it out. Your entire response must be nothing but the final prompt itself - no preamble, no "Here is my analysis", no summary paragraph before it, no quotation marks, no explanation, no markdown. The very first word of your response must be the first word of the image description.`,
            },
            {
                role: 'user',
                content: `Category: ${input.category || 'GOVERNMENT'}\nHeadline: ${input.title}\nSummary: ${input.excerpt || ''}\nBody excerpt: ${snippet}`,
            },
        ], 'gpt-4o-mini')

        const prompt = extractPromptText(raw)
        return prompt.length > 20 ? prompt.slice(0, 600) : null
    } catch (error) {
        console.warn('Image prompt reasoner failed, falling back to template prompt:', error)
        return null
    }
}
