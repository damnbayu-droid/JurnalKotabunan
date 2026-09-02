// Fallback text-completion router: used by myaiClient.ts whenever MyAI OS
// isn't the active provider (MYAI_API_KEY unset) or a MyAI OS call throws.
//
// WHY THIS EXISTS: the historical-news seed runs a very large batch of
// article generations, and the owner wants it done on free/cheap providers
// (Groq, OpenRouter) BEFORE MyAI OS is connected. Rather than rewrite every
// caller (news-generator, legal-risk, rewrite-external-news, discover-viral,
// process-raw-data, tone-control, moderation, image-prompt-reasoner), this
// router is slotted in behind myaiClient's existing myaiComplete /
// myaiCompleteJSON functions - prompts, JSON handling and call sites are
// all untouched.
//
// PROVIDER ORDER (default 'auto'):
//   1. Groq       - primary. Rotates across every GROQ_API_KEY*.
//                   MODEL CHOICE: Groq's free tier caps most models at
//                   8,000 tokens/MINUTE, counting prompt + max_tokens per
//                   request - our real news-generator prompt (journalism
//                   rules + title-diversity rules + persona) is ~3k tokens,
//                   so a long article won't fit and gets a 413. The
//                   groq/compound* models instead get 70,000 TPM (250 RPM),
//                   which comfortably fits a 1000+ word article per call,
//                   so that's the default. Set GROQ_MODEL=openai/gpt-oss-120b
//                   for higher quality on SHORT prompts only.
//   2. OpenRouter - free-tier models are a shared, aggressively
//                   rate-limited pool and often 429 instantly, so it's
//                   overflow only. Rotates across every OPENROUTER_API_KEY*.
//   3. Z.ai       - glm-4.5-flash is free but ~20-30s/call; last resort.
//                   (A funded Z.ai balance unlocks the fast glm-4.6 - set
//                   ZAI_MODEL=glm-4.6 then.)
//
// Override with AI_TEXT_PROVIDER=groq|openrouter|zai to pin one, or a
// comma list to reorder (e.g. "openrouter,groq").

import { oaiComplete, OAIError, type OAIMessage } from './providers/openai-compat'

interface ProviderConfig {
    name: 'groq' | 'openrouter' | 'zai'
    baseUrl: string
    /** default model for this provider; overridable per-env */
    model: string
    keys: string[]
    /** OpenRouter wants attribution headers; others ignore them */
    headers?: Record<string, string>
}

// Collect KEY, KEY1, KEY2, ... KEYn (any numeric suffix, sorted) plus the
// bare name. De-duped, blanks dropped. Mirrors the GEMINI_API_KEY1-5
// pattern already used in providers/gemini.ts.
function collectKeys(prefix: string): string[] {
    const out: string[] = []
    const bare = process.env[prefix]
    if (bare) out.push(bare.trim())
    for (const [k, v] of Object.entries(process.env)) {
        if (!v) continue
        const m = k.match(new RegExp(`^${prefix}(\\d+)$`))
        if (m) out.push(v.trim())
    }
    return [...new Set(out.filter(Boolean))]
}

function buildProviders(): ProviderConfig[] {
    return [
        {
            name: 'groq',
            baseUrl: 'https://api.groq.com/openai/v1',
            // compound-mini: 70k TPM (vs 8k for gpt-oss/qwen) - the only
            // Groq free model that fits our full prompt + a long article.
            model: process.env.GROQ_MODEL || 'groq/compound-mini',
            keys: collectKeys('GROQ_API_KEY'),
        },
        {
            name: 'openrouter',
            baseUrl: 'https://openrouter.ai/api/v1',
            model: process.env.OPENROUTER_MODEL || 'minimax/minimax-m3:free',
            keys: collectKeys('OPENROUTER_API_KEY'),
            headers: {
                'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://jurnal.kotabunan.com',
                'X-Title': 'Jurnal Kotabunan',
            },
        },
        {
            name: 'zai',
            baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4',
            model: process.env.ZAI_MODEL || 'glm-4.5-flash',
            keys: collectKeys('ZAI_API_KEY'),
        },
    ]
}

function orderedProviders(): ProviderConfig[] {
    const all = buildProviders().filter((p) => p.keys.length > 0)
    const pref = (process.env.AI_TEXT_PROVIDER || 'auto').toLowerCase().trim()
    if (pref === 'auto' || !pref) return all
    const want = pref.split(',').map((s) => s.trim()).filter(Boolean)
    const picked = want.flatMap((w) => all.filter((p) => p.name === w))
    // Anything not named still trails behind as a safety net.
    const rest = all.filter((p) => !picked.includes(p))
    return [...picked, ...rest]
}

/** True if at least one fallback provider has a usable key. */
export function fallbackConfigured(): boolean {
    return buildProviders().some((p) => p.keys.length > 0)
}

/** Human-readable summary for /api/system/health and startup logs. */
export function fallbackStatus(): string {
    const ps = buildProviders()
        .filter((p) => p.keys.length > 0)
        .map((p) => `${p.name}(${p.keys.length} key${p.keys.length > 1 ? 's' : ''}, ${p.model})`)
    return ps.length ? `fallback text providers: ${ps.join(' -> ')}` : 'no fallback text providers configured'
}

// Rotating start offset per provider so consecutive calls in a big batch
// don't all hammer key #1 first. Module-level = per server process.
const keyCursor: Record<string, number> = {}

export interface FallbackOptions {
    json?: boolean
    maxTokens?: number
    temperature?: number
}

/**
 * Try every configured provider in order; within each, try every key
 * starting from a rotating offset. Retryable failures (429 / 5xx / network
 * / empty completion) move to the next key, then the next provider.
 * Non-retryable failures (bad key, bad request) skip the rest of that
 * provider's keys. Throws only if everything is exhausted.
 */
export async function fallbackTextComplete(
    messages: OAIMessage[],
    opts: FallbackOptions = {},
): Promise<string> {
    const providers = orderedProviders()
    if (providers.length === 0) {
        throw new Error(
            'No AI text provider available: set MYAI_API_KEY, or GROQ_API_KEY / OPENROUTER_API_KEY / ZAI_API_KEY for the fallback router.',
        )
    }

    const errors: string[] = []

    for (const p of providers) {
        const start = keyCursor[p.name] ?? 0
        keyCursor[p.name] = (start + 1) % Math.max(p.keys.length, 1)

        for (let i = 0; i < p.keys.length; i++) {
            const key = p.keys[(start + i) % p.keys.length]
            try {
                const r = await oaiComplete({
                    baseUrl: p.baseUrl,
                    apiKey: key,
                    model: p.model,
                    messages,
                    json: opts.json,
                    // 6000 comfortably fits a 1000-1200 word article's
                    // completion; openai-compat shrinks this further if a
                    // provider still 413s.
                    maxTokens: opts.maxTokens ?? 6000,
                    temperature: opts.temperature,
                    headers: p.headers,
                })
                return r.text
            } catch (err) {
                const oe = err instanceof OAIError ? err : null
                const label = `${p.name}#${((start + i) % p.keys.length) + 1}`
                errors.push(`${label}: ${(err as Error).message}`)
                if (oe && !oe.retryable) {
                    // Bad key / bad request - the other keys on this
                    // provider will fail the same way. Move to next provider.
                    console.warn(`[fallback-router] ${label} non-retryable (${oe.status}), skipping ${p.name}`)
                    break
                }
                console.warn(`[fallback-router] ${label} failed, trying next: ${(err as Error).message.slice(0, 160)}`)
            }
        }
    }

    throw new Error(`All fallback text providers failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`)
}

/** Cheap reachability check for the first configured provider (health route). */
export async function fallbackPing(): Promise<void> {
    const p = orderedProviders()[0]
    if (!p) throw new Error('no fallback provider configured')
    const res = await fetch(`${p.baseUrl.replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${p.keys[0]}` },
    })
    if (!res.ok) throw new Error(`${p.name} /models -> HTTP ${res.status}`)
}
