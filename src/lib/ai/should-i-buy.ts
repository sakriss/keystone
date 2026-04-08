import { getModel, extractJSON } from './client'

export interface ShouldIBuyInput {
  property: {
    address: string
    city?: string
    state?: string
    zip?: string
    price?: number
    beds?: number
    baths?: number
    sqft?: number
    yearBuilt?: number
    status?: string
  }
  pros: string[]
  cons: string[]
  visits: { visited_at: string; overall_rating?: number; notes?: string }[]
  inspectionFindings?: {
    totalCostLow: number
    totalCostHigh: number
    negotiationTotal: number
    redFlags: string[]
    criticalCount: number
    majorCount: number
  }
  offers?: { amount: number; status: string }[]
  monthlyBudget?: number
  costOfOwnership?: number
  neighborhoodData?: {
    medianHouseholdIncome?: number
    medianHomeValue?: number
    ownerOccupiedPercent?: number
    walkScore?: number
  }
  comparableValueRange?: {
    low: number
    mid: number
    high: number
  }
}

export interface ShouldIBuyResult {
  verdict: 'buy' | 'proceed_with_caution' | 'negotiate_hard' | 'walk_away'
  verdictHeadline: string
  overallScore: number
  summary: string
  strengths: string[]
  concerns: string[]
  financialSnapshot: {
    listPrice: number | null
    estimatedFairValue: number | null
    repairCostEstimate: string | null
    trueCostOfPurchase: string | null
    monthlyAffordabilityNote: string | null
  }
  negotiationLeverage: string[]
  nextSteps: string[]
  dealBreakers: string[]
}

export async function generateShouldIBuyReport(input: ShouldIBuyInput): Promise<ShouldIBuyResult> {
  const model = getModel()

  const prompt = `You are a trusted real estate advisor helping a buyer make one of the biggest financial decisions of their life. Synthesize all available data about this property and give an honest, comprehensive assessment.

PROPERTY DATA:
${JSON.stringify(input, null, 2)}

Return ONLY valid JSON matching this exact structure:
{
  "verdict": "buy|proceed_with_caution|negotiate_hard|walk_away",
  "verdictHeadline": "One punchy sentence summarizing the verdict",
  "overallScore": <1-10 where 10 is a dream home>,
  "summary": "3-4 sentence honest synthesis covering condition, value, fit, and recommendation",
  "strengths": ["strength 1", "strength 2"],
  "concerns": ["concern 1", "concern 2"],
  "financialSnapshot": {
    "listPrice": number or null,
    "estimatedFairValue": number or null,
    "repairCostEstimate": "formatted range string or null",
    "trueCostOfPurchase": "formatted string or null",
    "monthlyAffordabilityNote": "brief note or null"
  },
  "negotiationLeverage": ["point 1"],
  "nextSteps": ["step 1"],
  "dealBreakers": []
}

Verdict guide: buy=solid property fair price, proceed_with_caution=good but has issues, negotiate_hard=significant issues justify lower price, walk_away=red flags most buyers should avoid.
Be direct and honest.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(extractJSON(text)) as ShouldIBuyResult
}
