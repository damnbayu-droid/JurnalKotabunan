// Persistent memory for the newsroom AI agents, backed by Supabase's
// pgvector extension. DIY alternative to a hosted context/memory service:
// embeddings are generated locally with a small transformer model (no
// external API call, no extra server), stored in the `agent_memories`
// table, and retrieved by cosine similarity.
//
// Prisma Client can't read/write the `vector` column through its normal
// API (it's declared `Unsupported("vector(384)")` in schema.prisma), so
// every access here goes through $queryRawUnsafe/$executeRawUnsafe.

import { db } from '@/lib/db'
import type { AgentKey } from '@/lib/ai/myaiClient'

const EMBEDDING_DIMENSIONS = 384

let embedderPromise: Promise<(text: string) => Promise<number[]>> | null = null

// Lazily loads the embedding pipeline once per server process and reuses
// it across calls - loading the model on every request would be far too
// slow.
async function getEmbedder(): Promise<(text: string) => Promise<number[]>> {
    if (!embedderPromise) {
        embedderPromise = (async () => {
            const { pipeline } = await import('@xenova/transformers')
            // Multilingual model - Jurnal Kotabunan's editorial content is mostly
            // Indonesian, and an English-only model (e.g. all-MiniLM-L6-v2)
            // ranks Indonesian text poorly (verified: it scored an
            // irrelevant traffic memory higher than an on-topic corruption
            // one for an Indonesian query).
            const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2')
            return async (text: string) => {
                const output = await extractor(text, { pooling: 'mean', normalize: true })
                return Array.from(output.data as Float32Array)
            }
        })().catch((err) => {
            // Don't cache a failed load (e.g. a transient hiccup fetching
            // model weights on first use) - without this, one failure
            // would permanently break memory for the life of the process.
            embedderPromise = null
            throw err
        })
    }
    return embedderPromise
}

async function embed(text: string): Promise<number[]> {
    const embedder = await getEmbedder()
    return embedder(text)
}

function toVectorLiteral(vec: number[]): string {
    return `[${vec.join(',')}]`
}

export interface StoreMemoryInput {
    agentKey: AgentKey
    content: string
    category?: string
    metadata?: Record<string, unknown>
}

export async function storeMemory({ agentKey, content, category, metadata }: StoreMemoryInput): Promise<void> {
    const vec = await embed(content)
    if (vec.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Unexpected embedding size: ${vec.length} (expected ${EMBEDDING_DIMENSIONS})`)
    }

    await db.$executeRawUnsafe(
        `INSERT INTO agent_memories (id, "agentKey", category, content, embedding, metadata, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, $5::jsonb, now())`,
        agentKey,
        category ?? null,
        content,
        toVectorLiteral(vec),
        metadata ? JSON.stringify(metadata) : null,
    )
}

export interface RecalledMemory {
    id: string
    content: string
    category: string | null
    metadata: Record<string, unknown> | null
    createdAt: Date
    similarity: number
}

export interface RecallMemoriesInput {
    // Accepts one agent or several - e.g. a writer agent (WIE/WUE) recalling
    // AUDY's past legal-risk decisions so it can avoid a risky framing
    // *before* writing, not just get caught by analyzeLegalRisk() after the
    // fact. Single-agent callers (the original use case) just pass one key.
    agentKey: AgentKey | AgentKey[]
    query: string
    category?: string
    limit?: number
    // Cosine similarity threshold (0-1, higher = stricter). Results below
    // this are dropped rather than padding the prompt with noise.
    minSimilarity?: number
}

export async function recallMemories({
    agentKey,
    query,
    category,
    limit = 5,
    minSimilarity = 0.3,
}: RecallMemoriesInput): Promise<RecalledMemory[]> {
    const vec = await embed(query)
    const vecLiteral = toVectorLiteral(vec)
    const agentKeys = Array.isArray(agentKey) ? agentKey : [agentKey]

    const params: unknown[] = [vecLiteral, agentKeys, limit]
    let categoryClause = ''
    if (category) {
        params.push(category)
        categoryClause = `AND category = $${params.length}`
    }

    const rows = await db.$queryRawUnsafe<Array<{
        id: string
        content: string
        category: string | null
        metadata: Record<string, unknown> | null
        createdAt: Date
        similarity: number
    }>>(
        `SELECT id, content, category, metadata, "createdAt",
                1 - (embedding <=> $1::vector) AS similarity
         FROM agent_memories
         WHERE "agentKey" = ANY($2)
           AND embedding IS NOT NULL
           ${categoryClause}
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        ...params,
    )

    return rows.filter(r => r.similarity >= minSimilarity)
}

/**
 * Convenience for the writing entry points (rewrite-external-news.ts,
 * process-raw-data route) - recalls AUDY's past legal-risk precedents
 * relevant to the topic being written about, so the writer can avoid a
 * risky framing before it's even written, rather than relying solely on
 * analyzeLegalRisk() catching it afterward. Never throws - memory is a
 * nice-to-have, not a hard dependency for content generation.
 */
export async function getLegalPrecedentContext(topic: string): Promise<string> {
    try {
        const memories = await recallMemories({
            agentKey: 'AUDY',
            category: 'legal-risk-decision',
            query: topic,
            limit: 3,
            minSimilarity: 0.4,
        })
        return formatMemoriesForPrompt(memories)
    } catch (err) {
        console.error('getLegalPrecedentContext failed:', err)
        return ''
    }
}

// Formats recalled memories as a system-prompt-ready block, or an empty
// string if nothing relevant was found (so callers can splice it straight
// into a prompt without conditional checks).
export function formatMemoriesForPrompt(memories: RecalledMemory[]): string {
    if (memories.length === 0) return ''
    const lines = memories.map(m => `- [${m.category ?? 'general'}] ${m.content}`).join('\n')
    return `\n\nRELEVANT PAST CONTEXT (from editorial memory):\n${lines}`
}
