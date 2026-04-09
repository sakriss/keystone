import { getModel, extractJSON } from './client'

export interface SellerMotivationInput {
  property: {
    address: string
    city?: string | null
    state?: string | null
    price?: number | null
    status?: string
    yearBuilt?: number | null
    daysTracked?: number
  }
  offers?: { amount: number; status: string; offered_at: string }[]
  pros?: string[]
  cons?: string[]
  visits?: { overall_rating?: number | null; notes?: string | null }[]
  inspectionIssueCount?: { critical: number; major: number }
  comparableValueRange?: { low: number; mid: number; high: number }
  priceReductions?: number
}

export interface SellerMotivationSignal {
  signal: string
  direction: 'bullish' | 'bearish' | 'neutral'
  weight: 'strong' | 'moderate' | 'weak'
}

export interface SellerMotivationResult {
  score: number
  label: 'low' | 'moderate' | 'high' | 'very_high'
  headline: string
  summary: string
  signals: SellerMotivationSignal[]
  negotiationOpportunities: string[]
  suggestedApproach: string
}

export async function generateSellerMotivationReport(
  input: SellerMotivationInput
): Promise<SellerMotivationResult> {
  const model = getModel()

  const prompt = `You are a seasoned real estate buyer's agent analyzing a seller's motivation level to help a buyer negotiate effectively.

PROPERTY DATA:
${JSON.stringify(input, null, 2)}

Analyze all available signals and score the seller's motivation from 1–10 (10 = extremely motivated, desperate to sell; 1 = not motivated, testing the market). Consider:
- Price vs. estimated fair value (overpriced = less motivated)
- Days tracked / time on market signals
- Number of price reductions
- Offer history (rejected offers = less flexible; no offers yet may indicate pricing issue)
- Inspection issues (sellers with major issues may be more motivated to move)
- Visit frequency (many visits without offer may mean buyers aren't convinced)

Label mapping:
- 1–3: low
- 4–5: moderate
- 6–8: high
- 9–10: very_high

For direction in signals: "bullish" means this signal is favorable for the buyer's negotiating position (seller is more motivated), "bearish" means unfavorable (seller has leverage).

Return ONLY valid JSON matching this exact structure:
{
  "score": <number 1-10>,
  "label": <"low" | "moderate" | "high" | "very_high">,
  "headline": <short punchy verdict, e.g. "Seller Shows Signs of Urgency">,
  "summary": <2-3 sentence plain English explanation of your assessment>,
  "signals": [
    {
      "signal": <what the signal is>,
      "direction": <"bullish" | "bearish" | "neutral">,
      "weight": <"strong" | "moderate" | "weak">
    }
  ],
  "negotiationOpportunities": [<specific actionable negotiation moves, 2-4 items>],
  "suggestedApproach": <one paragraph describing the recommended negotiation posture>
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(extractJSON(text)) as SellerMotivationResult
}
