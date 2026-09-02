// Minimal OpenAI-compatible /chat/completions client. Groq, OpenRouter and
// Z.ai all speak this exact protocol, so one implementation covers all
// three - the differences (base URL, key, model id) are just config passed
// in by fallback-router.ts.
//
// This exists because the whole AI pipeline (news-generator, legal-risk,
// rewrite-external-news, ...) is written against MyAI OS's custom gateway
// (see myaiClient.ts). When MYAI_API_KEY isn't set - the state during the
// historical seed, before MyAI OS is wired up - myaiClient falls back to
// this via fallback-router.ts, keeping every caller and every prompt
// unchanged.

export interface OAIMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface OAICompletionOptions {
    baseUrl: string
    apiKey: string
    model: string
    messages: OAIMessage[]
    /** Ask for `response_format: json_object`. Silently retried without it
     *  if the provider rejects that param (some models 400 on it). */
    json?: boolean
    maxTokens?: number
    temperature?: number
    /** Extra headers - OpenRouter likes HTTP-Referer / X-Title for
     *  attribution, harmless everywhere else. */
    headers?: Record<string, string>
    timeoutMs?: number
}

export interface OAICompletionResult {
    text: string
    model: string
    usage: { promptTokens: number; completionTokens: number }
}

export class OAIError extends Error {
    status: number
    /** true = worth trying another key / provider (rate limit, transient
     *  server error, network). false = a real problem with this request or
     *  this key (bad key, bad request) - don't hammer other keys with it. */
    retryable: boolean
    constructor(message: string, status: number, retryable: boolean) {
        super(message)
        this.name = 'OAIError'
        this.status = status
        this.retryable = retryable
    }
}

function isRetryableStatus(status: number): boolean {
    // 429 rate limit, 408 request timeout, 413 "request too large" (Groq
    // free tier counts prompt+max_tokens against a per-minute token cap and
    // 413s the whole request - another key/provider, or a smaller request,
    // can still succeed), 5xx server/proxy errors.
    return status === 429 || status === 408 || status === 413 || (status >= 500 && status <= 599)
}

// Groq's 413 body: "...Limit 8000, Requested 8079, please reduce...".
// Pull the numbers so we can shrink max_tokens and retry once before
// giving up on this key.
function parse413Budget(body: string): { limit: number; requested: number } | null {
    const m = body.match(/Limit\s+(\d+),\s*Requested\s+(\d+)/i)
    return m ? { limit: Number(m[1]), requested: Number(m[2]) } : null
}

async function callOnce(opts: OAICompletionOptions, useJson: boolean): Promise<OAICompletionResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 90_000)

    let res: Response
    try {
        res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${opts.apiKey}`,
                ...opts.headers,
            },
            body: JSON.stringify({
                model: opts.model,
                messages: opts.messages,
                temperature: opts.temperature ?? 0.7,
                max_tokens: opts.maxTokens ?? 8000,
                ...(useJson ? { response_format: { type: 'json_object' } } : {}),
            }),
            signal: controller.signal,
        })
    } catch (err) {
        clearTimeout(timeout)
        // Abort / DNS / connection reset - all worth retrying elsewhere.
        throw new OAIError(`network error: ${(err as Error).message}`, 0, true)
    }
    clearTimeout(timeout)

    if (!res.ok) {
        const body = (await res.text()).slice(0, 300)
        throw new OAIError(
            `${opts.model} @ ${hostOf(opts.baseUrl)} -> HTTP ${res.status}: ${body}`,
            res.status,
            isRetryableStatus(res.status),
        )
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content ?? ''
    if (!text.trim()) {
        // Some reasoning models spend the whole budget on hidden reasoning
        // and return empty content - treat as retryable so another
        // provider/model gets a shot.
        throw new OAIError(`${opts.model} returned empty content`, 0, true)
    }
    return {
        text,
        model: data?.model ?? opts.model,
        usage: {
            promptTokens: data?.usage?.prompt_tokens ?? 0,
            completionTokens: data?.usage?.completion_tokens ?? 0,
        },
    }
}

function hostOf(url: string): string {
    try {
        return new URL(url).host
    } catch {
        return url
    }
}

/**
 * One completion attempt against one provider+key.
 *  - If `json` is requested and the provider 400s on `response_format`
 *    specifically, retries once without it (JSON then salvaged by the
 *    caller's extractJson).
 *  - On 413 ("request too large"), shrinks max_tokens to fit the reported
 *    per-minute budget and retries once. If it still won't fit, the error
 *    propagates as retryable so fallback-router.ts moves to the next
 *    key/provider.
 * Any other failure propagates as an OAIError.
 */
export async function oaiComplete(opts: OAICompletionOptions): Promise<OAICompletionResult> {
    try {
        return await callOnce(opts, !!opts.json)
    } catch (err) {
        if (!(err instanceof OAIError)) throw err

        if (err.status === 400 && opts.json) {
            return callOnce(opts, false)
        }

        if (err.status === 413) {
            const budget = parse413Budget(err.message)
            const current = opts.maxTokens ?? 8000
            // Leave headroom for the prompt: target ~70% of the limit, or
            // just halve if we couldn't parse numbers. Floor at 1024 - below
            // that a long article isn't worth attempting here.
            const shrunk = budget
                ? Math.max(1024, Math.floor(budget.limit * 0.7) - 256)
                : Math.max(1024, Math.floor(current / 2))
            if (shrunk < current) {
                return callOnce({ ...opts, maxTokens: shrunk }, !!opts.json)
            }
        }

        throw err
    }
}
