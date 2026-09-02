// Client for the MyAI OS gateway (https://console.myai.nexus).
//
// NOTE: this is NOT an OpenAI-compatible API despite superficial similarity.
// You send a `field` (task category) instead of a `model` - the gateway
// picks the underlying provider/model itself via internal tier routing
// (see GET /api/v1/models for the live tier config, which can change every
// ~12h). The response shape is also custom: { result, provider_used, ... },
// not OpenAI's { choices: [{ message }] }.
//
// `result` may come back wrapped in a ```json fenced code block even when
// the prompt asks for raw JSON, so JSON-expecting callers should use
// myaiCompleteJSON() rather than parsing `result` directly.
//
// FALLBACK (added 2026-09-03): when MYAI_API_KEY is not set, or a MyAI OS
// call fails and free providers ARE configured, every myaiComplete /
// myaiCompleteJSON call transparently routes through fallback-router.ts
// (Groq -> OpenRouter -> Z.ai). This lets the large historical-news seed
// run on free providers before MyAI OS is connected, with no change to any
// caller or prompt. `field` / `model` are MyAI-OS-only hints and are
// ignored on the fallback path (the router picks its own model per
// provider). Set MYAI_API_KEY later and everything reverts to MyAI OS with
// no code change.

import { fallbackTextComplete, fallbackConfigured, fallbackPing } from './fallback-router'
import type { OAIMessage } from './providers/openai-compat'

const MYAI_BASE_URL = process.env.MYAI_BASE_URL || 'https://console.myai.nexus/api/v1'

// The gateway's full field list is larger (OCR, visa docs, etc.) - only the
// ones this app actually uses are listed here.
export type MyaiField =
    | 'content_journalist'
    | 'reasoning_general'
    | 'chatbot'
    | 'structured_extraction'

// Per-agent task field. WIE (writer) and WUE (breaking news) both produce
// article copy, AUDY (compliance/moderation/legal-risk/tone) makes judgment
// calls rather than writing prose, AS (coordinator) just needs short
// conversational replies.
//
// NOTE: 'chatbot_general' was tried for AS but the gateway injects its own
// baked-in persona for that field (a visa/IT services assistant) that
// bleeds into responses regardless of our system prompt. Plain 'chatbot'
// stays neutral and follows our persona correctly.
//
// COST: checked GET /api/v1/models on the gateway (2026-08-25) - AUDY used
// to run on 'reasoning_general', whose tier-1 model is Claude Sonnet 4.5
// ($3/$15 per M tokens), by far the priciest field of the three. Moved AUDY
// to 'chatbot' (tier-1 GPT-4o-mini, $0.15/$0.60) to match WIE/WUE/AS's
// already-cheap-first setup. Claude still sits in 'chatbot's fallback chain
// (tier 2) as a safety net if GPT-4o-mini errors out - it's just no longer
// the default for every compliance check.
export const MYAI_FIELDS = {
    WIE: 'content_journalist',
    AUDY: 'chatbot',
    AS: 'chatbot',
    WUE: 'content_journalist',
} as const satisfies Record<string, MyaiField>

export type AgentKey = keyof typeof MYAI_FIELDS

export interface MyaiMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

interface MyaiResponse {
    field: string
    schema_version: string
    provider_used: string
    processed_at: string
    // Despite the name, this is NOT always a string: for plain-text prompts
    // some fields (e.g. content_journalist) wrap it as { response: "..." },
    // and for prompts that imply a JSON schema it comes back as that schema
    // already parsed into an object. See normalizeResult().
    result: unknown
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
}

// Collapses the gateway's inconsistent `result` shapes down to a single
// string: pass strings through, unwrap the { response: "..." } convention
// used for plain-text replies, and stringify anything else (e.g. an
// already-parsed JSON object) so callers always get text back.
function normalizeResult(result: unknown): string {
    if (typeof result === 'string') return result
    if (result && typeof result === 'object') {
        const maybeResponse = (result as Record<string, unknown>).response
        if (typeof maybeResponse === 'string') return maybeResponse
        return JSON.stringify(result)
    }
    return String(result)
}

// Pins a specific underlying model instead of letting the field's own tier
// routing pick one. Confirmed via direct testing (2026-08-26): `field` alone
// can get hijacked into a completely different schema/language on certain
// prompts (content_journalist returning Indonesian keys like "judul"/
// "artikel" instead of the requested English schema - most likely
// cross-contamination from another app sharing that field on the gateway).
// Sending `field` + `model` together makes the gateway honor the requested
// model directly (confirmed via `provider_used` in the response) and the
// hijacking stopped. `field` is still required by the gateway even when
// pinning a model, so this always sends both.
// The actual MyAI OS network call - only reached when MYAI_API_KEY is set.
async function myaiOsComplete(field: MyaiField, messages: MyaiMessage[], model?: string): Promise<string> {
    const res = await fetch(`${MYAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MYAI_API_KEY}`,
        },
        body: JSON.stringify(model ? { field, model, messages } : { field, messages }),
    })

    if (!res.ok) {
        // Cap the body - a gateway-level failure (WAF block, outage page, proxy
        // error) can return a full HTML page instead of JSON, and that raw
        // page used to end up verbatim in this Error's message, which then
        // surfaced as-is in admin UI error banners and blew up the layout.
        const body = (await res.text()).slice(0, 300)
        throw new Error(`MyAI OS request failed (${res.status}): ${body}`)
    }

    const data: MyaiResponse = await res.json()
    return normalizeResult(data.result)
}

// Single entry point for both myaiComplete and myaiCompleteJSON. Chooses
// MyAI OS or the free-provider fallback router, and knows whether the
// caller wants JSON (so the router can ask providers for json_object mode).
async function runCompletion(
    field: MyaiField,
    messages: MyaiMessage[],
    model: string | undefined,
    json: boolean,
): Promise<string> {
    const hasMyai = !!process.env.MYAI_API_KEY

    if (!hasMyai) {
        if (!fallbackConfigured()) {
            throw new Error(
                'No AI provider configured: set MYAI_API_KEY, or GROQ_API_KEY / OPENROUTER_API_KEY / ZAI_API_KEY for the fallback router.',
            )
        }
        return fallbackTextComplete(messages as OAIMessage[], { json })
    }

    try {
        return await myaiOsComplete(field, messages, model)
    } catch (err) {
        if (fallbackConfigured()) {
            console.warn(
                `[myaiClient] MyAI OS failed, using fallback router: ${(err as Error).message.slice(0, 160)}`,
            )
            return fallbackTextComplete(messages as OAIMessage[], { json })
        }
        throw err
    }
}

// `field` and `model` are honoured only when MyAI OS is the active provider;
// on the fallback path the router picks its own model (see file header).
export async function myaiComplete(field: MyaiField, messages: MyaiMessage[], model?: string): Promise<string> {
    return runCompletion(field, messages, model, false)
}

// The gateway wraps JSON in ```json fences even when asked for raw JSON,
// and sometimes appends extra prose commentary after the closing fence.
// Pull out just the JSON: prefer the fenced block if present, then find the
// first balanced {...} or [...] (string-literal aware, so braces inside
// quoted text don't throw off the bracket count).
function extractJson(raw: string): string {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const text = fenced ? fenced[1] : raw

    const start = text.search(/[[{]/)
    if (start === -1) return text.trim()

    const open = text[start]
    const close = open === '{' ? '}' : ']'
    let depth = 0
    let inString = false
    let escaped = false
    for (let i = start; i < text.length; i++) {
        const ch = text[i]
        if (inString) {
            if (escaped) escaped = false
            else if (ch === '\\') escaped = true
            else if (ch === '"') inString = false
            continue
        }
        if (ch === '"') { inString = true; continue }
        if (ch === open) depth++
        else if (ch === close) {
            depth--
            if (depth === 0) return text.slice(start, i + 1)
        }
    }
    return text.slice(start).trim()
}

export async function myaiCompleteJSON<T = any>(field: MyaiField, messages: MyaiMessage[], model?: string): Promise<T> {
    const raw = await runCompletion(field, messages, model, true)
    return JSON.parse(extractJson(raw))
}

export async function myaiPing(): Promise<void> {
    if (!process.env.MYAI_API_KEY) {
        // No MyAI OS - report on the fallback router instead so health
        // checks stay meaningful during the seed.
        return fallbackPing()
    }
    const res = await fetch(`${MYAI_BASE_URL}/models`)
    if (!res.ok) throw new Error(`MyAI OS ping failed (${res.status})`)
}
