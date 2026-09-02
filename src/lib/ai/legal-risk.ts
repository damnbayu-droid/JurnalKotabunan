import { myaiCompleteJSON, MYAI_FIELDS } from './myaiClient'
import { moderateContent } from './moderation'
import { recallMemories, storeMemory, formatMemoriesForPrompt } from './memory'

export interface LegalRiskResult {
  riskScore: number // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  containsAccusation: boolean
  categories: {
    defamation: number
    privacyViolation: number
    falseInformation: number
    criminalAllegation: number
    corporateRisk: number
  }
  recommendations: string[]
  requiresLegalReview: boolean
}

export async function analyzeLegalRisk(content: string, title: string): Promise<LegalRiskResult> {
  try {
    const pastDecisions = await recallMemories({
      agentKey: 'AUDY',
      category: 'legal-risk-decision',
      query: `${title}\n${content}`,
    }).catch(() => []) // memory is a nice-to-have, never block the analysis on it

    // Bug found via testing: the old prompt described the desired fields as
    // a bullet list ("provide scores for: - defamation... Calculate an
    // overall riskScore...") without ever showing the exact JSON shape, and
    // the model reasonably-but-differently interpreted that as FLAT keys
    // (defamation/privacyViolation/... at the top level) with the overall
    // score named "overallRiskScore" - not nested under "categories" with
    // the field named "riskScore" as this file's parsing below expected.
    // recommendations/containsAccusation happened to match by coincidence,
    // so the mismatch was invisible unless you compared the raw response
    // against the parsed result: riskScore/categories.* silently defaulted
    // to 0 (via `|| 0` below) on every single analysis this ran, no matter
    // how risky the actual content was - the recommendations text could
    // describe a serious defamation/privacy problem while the stored score
    // said LOW/0. Pinning the model (kept below, still correct practice)
    // did NOT fix this - an explicit example JSON block did.
    const result = await myaiCompleteJSON(MYAI_FIELDS.AUDY, [
      {
        role: 'system',
        content: `You are a legal risk assessment AI for Indonesian journalism. Analyze articles for potential legal risks under Indonesian law including:

1.UU ITE (Information and Electronic Transactions Law) - Article 27(3) on defamation
2. UU Pers (Press Law) - journalistic compliance
3. UU Perlindungan Data Pribadi (Personal Data Protection Law)
4. Civil and Criminal Code regarding defamation (pencemaran nama baik)

Score each category 0-100, then compute an overall riskScore (0-100) as
their weighted severity (not a plain average - a single very high category
like criminalAllegation or privacyViolation should push the overall score
up even if the others are low).

riskLevel bands: LOW (0-30), MEDIUM (31-60), HIGH (61-80), CRITICAL (81-100).

Jurnal Kotabunan's editorial standard for identifying private individuals (not public officials acting in an official capacity): full real names are replaced with initials (e.g. "Ventje Rumondor" -> "V.R."), street addresses keep only the city/regency and mask the specific house number (e.g. "Jl. Trans-Sulawesi No.***, Kotabunan"), and phone numbers are partially masked (e.g. "0812****678"). Content following this standard has already adequately de-identified the person - do NOT still score it high on privacyViolation or defamation purely for referring to "M.W." or a masked address/phone; score those categories based on the substance of the claims instead (is the allegation properly attributed, is it unverified, etc.), not the mere presence of a redacted identifier.

Use the past decisions below (if any) to stay consistent with how similar cases were judged before.

Respond ONLY with a JSON object in EXACTLY this shape - field names and nesting matter, do not flatten or rename them:
{
  "categories": {
    "defamation": 0-100,
    "privacyViolation": 0-100,
    "falseInformation": 0-100,
    "criminalAllegation": 0-100,
    "corporateRisk": 0-100
  },
  "riskScore": 0-100,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "containsAccusation": true or false,
  "requiresLegalReview": true or false,
  "recommendations": ["actionable recommendation in Indonesian", "..."]
}${formatMemoriesForPrompt(pastDecisions)}`
      },
      {
        role: 'user',
        content: `Analyze this article:\n\nTitle: ${title}\n\nContent:\n${content}`
      }
    ], 'gpt-4o-mini')

    const riskScore = Math.min(100, Math.max(0, result.riskScore || 0))
    const riskLevel = getRiskLevelFromScore(riskScore)

    // Awaited (not fire-and-forget) because serverless functions can be
    // frozen/torn down right after the response is returned, which would
    // silently drop an un-awaited write.
    await storeMemory({
      agentKey: 'AUDY',
      category: 'legal-risk-decision',
      content: `Title: "${title}" -> riskScore=${riskScore} (${riskLevel}), containsAccusation=${result.containsAccusation || false}. Reasoning basis: ${(result.recommendations || []).join(' | ') || 'n/a'}`,
      metadata: { riskScore, riskLevel },
    }).catch(err => console.error('Failed to store legal-risk memory:', err)) // don't fail the analysis if storage fails

    return {
      riskScore,
      riskLevel,
      containsAccusation: result.containsAccusation || false,
      categories: {
        defamation: Math.min(100, Math.max(0, result.categories?.defamation || 0)),
        privacyViolation: Math.min(100, Math.max(0, result.categories?.privacyViolation || 0)),
        falseInformation: Math.min(100, Math.max(0, result.categories?.falseInformation || 0)),
        criminalAllegation: Math.min(100, Math.max(0, result.categories?.criminalAllegation || 0)),
        corporateRisk: Math.min(100, Math.max(0, result.categories?.corporateRisk || 0)),
      },
      recommendations: result.recommendations || [],
      requiresLegalReview: riskScore > 70,
    }
  } catch (error) {
    console.error('Legal risk analysis error:', error)
    return {
      riskScore: 50,
      riskLevel: 'MEDIUM',
      containsAccusation: false,
      categories: {
        defamation: 0,
        privacyViolation: 0,
        falseInformation: 0,
        criminalAllegation: 0,
        corporateRisk: 0,
      },
      recommendations: ['Manual legal review required - AI analysis unavailable'],
      requiresLegalReview: true,
    }
  }
}

function getRiskLevelFromScore(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score <= 30) return 'LOW'
  if (score <= 60) return 'MEDIUM'
  if (score <= 80) return 'HIGH'
  return 'CRITICAL'
}

const MAX_REPAIR_ATTEMPTS = 3

export interface RepairResult {
  title: string
  excerpt: string
  content: string
  riskAnalysis: LegalRiskResult
  attempts: number
  /** false if it's still CRITICAL after MAX_REPAIR_ATTEMPTS - caller should hold it as DRAFT for a human, not publish it. */
  resolved: boolean
}

/**
 * Only CRITICAL triggers this (per user decision) - HIGH is left alone and
 * publishes normally, since the site's automated pipelines (daily cron,
 * bulk backfill) are the only ones this applies to; anything going through
 * an admin or "Rewrite External News" has a human already reading it before
 * it goes out.
 *
 * Uses the SAME analysis's category breakdown + recommendations to tell the
 * AI specifically what to fix (soften unattributed accusations, remove
 * private/identifying detail, drop unverifiable claims) rather than asking
 * it to vaguely "make this safer", then re-runs analyzeLegalRisk on the
 * result. Repeats until the level drops below CRITICAL or the attempt cap
 * is hit.
 */
export async function repairCriticalRisk(
  input: { title: string; excerpt: string; content: string },
  initialAnalysis: LegalRiskResult,
  category?: string
): Promise<RepairResult> {
  let title = input.title
  let excerpt = input.excerpt
  let content = input.content
  let analysis = initialAnalysis
  let attempts = 0

  while (analysis.riskLevel === 'CRITICAL' && attempts < MAX_REPAIR_ATTEMPTS) {
    attempts++

    const topCategories = Object.entries(analysis.categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, score]) => `${name}: ${score}/100`)
      .join(', ')

    try {
      const result = await myaiCompleteJSON<{ title?: string; excerpt?: string; content?: string }>('chatbot', [
        {
          role: 'system',
          content: `You are a senior editor for Jurnal Kotabunan fixing an article that legal risk analysis flagged as CRITICAL (attempt ${attempts}/${MAX_REPAIR_ATTEMPTS}). Rewrite it to bring the legal risk down while preserving the newsworthy facts - do not just water down the whole story.

Highest-scoring risk categories: ${topCategories}.
Specific recommendations from the legal reviewer: ${(analysis.recommendations || []).join(' | ') || 'none given'}.

Apply Jurnal Kotabunan's de-identification standard (mandatory, not optional):
- Real names of private individuals (not public officials acting in an official capacity) must NEVER appear in full - replace with initials, e.g. "Ventje Rumondor" -> "V.R.". ${category === 'OPINION' ? 'This is an Opinion piece discussing a named person - initials only (e.g. "Bima Arya" -> "BA"), never the full name, even here.' : 'Full real names are not allowed here at all - convert every private individual to initials.'}
- Street addresses: if the street-level address is essential to the story, WRITE OUT the masked form literally, keeping only the city/regency (kabupaten/kota) and the street name, with the house/building number replaced by asterisks - e.g. "Jl. Trans-Sulawesi No.***, Kotabunan" instead of "Jl. Trans-Sulawesi No.12, Kotabunan". If it isn't essential, drop the address entirely and just say the city/regency (or omit it). Never describe the masking in prose (e.g. never write "the address has been withheld") - either show the masked address literally or don't mention it at all.
- Phone numbers: if essential to the story, WRITE OUT the masked digits literally, e.g. "0812****678" instead of the full number. If it isn't essential, drop it entirely. Never describe the masking in prose (e.g. never write "the phone number is masked for privacy") - either show the masked digits literally or don't mention a phone number at all.
- Attribute claims properly ("allegedly", "according to police/witnesses") instead of stating them as settled fact.
- Remove unverified claims that can't be attributed to a source.
- Soften direct accusations ("is a thief") into properly-sourced reporting ("is alleged to have...", "police are investigating...").

Do NOT fabricate new facts, quotes, or sources to replace what you remove. If a claim can't be safely attributed, cut it rather than inventing an attribution.

Return ONLY a valid JSON object: { "title": "...", "excerpt": "...", "content": "..." } - no commentary.`,
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nExcerpt: ${excerpt}\n\nContent:\n${content}`,
        },
      ], 'gpt-4o-mini')

      if (result.title) title = result.title
      if (result.excerpt) excerpt = result.excerpt
      if (result.content) content = result.content
    } catch (error) {
      console.error(`Critical-risk repair attempt ${attempts} failed:`, error)
      break // stop retrying on a hard failure, fall through to the resolved:false return below
    }

    analysis = await analyzeLegalRisk(content, title)
  }

  return {
    title,
    excerpt,
    content,
    riskAnalysis: analysis,
    attempts,
    resolved: analysis.riskLevel !== 'CRITICAL',
  }
}

export function calculateToxicityScore(content: string): Promise<number> {
  // Return a normalized toxicity score for comments
  return moderateContent(content).then(result => {
    const maxCategory = Math.max(
      result.categories.hate,
      result.categories.harassment,
      result.categories.violence,
      result.categories.sara,
      result.categories.defamation
    )
    return maxCategory
  })
}

