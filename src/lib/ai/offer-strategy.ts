import { getModel, extractJSON } from './client'

export interface OfferStrategyInput {
  property: {
    address: string
    listPrice: number
    daysOnMarket?: number
    priceReductions?: number
    status?: string
  }
  preApprovals?: { amount: number; lender?: string }[]
  inspectionSummary?: {
    totalCostLow: number
    totalCostHigh: number
    negotiationTotal: number
    criticalItems: string[]
  }
  comparableValueRange?: {
    low: number
    mid: number
    high: number
  }
  marketCondition?: string
  buyerNotes?: string
}

export interface OfferStrategyResult {
  recommendedOfferPrice: number
  offerRangeLow: number
  offerRangeHigh: number
  walkAwayPrice: number
  approach: 'aggressive' | 'fair' | 'above_ask'
  rationale: string
  earnestMoney: {
    amount: number
    note: string
  }
  creditStrategy: {
    requestCredit: boolean
    creditAmount: number | null
    creditItems: string[]
    note: string
  }
  contingencies: {
    keepInspection: boolean
    keepFinancing: boolean
    keepAppraisal: boolean
    waiveAny: boolean
    notes: string
  }
  closeDate: {
    recommendation: string
    rationale: string
  }
  escalationClause: {
    recommended: boolean
    reason: string
  }
  negotiationTips: string[]
}

export async function generateOfferStrategy(input: OfferStrategyInput): Promise<OfferStrategyResult> {
  const model = getModel()

  const prompt = `You are an experienced buyers' agent helping craft an offer strategy. Give specific, actionable advice based on all available data.

OFFER SCENARIO:
${JSON.stringify(input, null, 2)}

Return ONLY valid JSON matching this exact structure:
{
  "recommendedOfferPrice": number,
  "offerRangeLow": number,
  "offerRangeHigh": number,
  "walkAwayPrice": number,
  "approach": "aggressive|fair|above_ask",
  "rationale": "2-3 sentence explanation",
  "earnestMoney": { "amount": number, "note": "brief context" },
  "creditStrategy": {
    "requestCredit": boolean,
    "creditAmount": number or null,
    "creditItems": ["item 1"],
    "note": "explanation"
  },
  "contingencies": {
    "keepInspection": boolean,
    "keepFinancing": boolean,
    "keepAppraisal": boolean,
    "waiveAny": boolean,
    "notes": "explanation"
  },
  "closeDate": { "recommendation": "date or timeframe", "rationale": "why" },
  "escalationClause": { "recommended": boolean, "reason": "why or why not" },
  "negotiationTips": ["tip 1"]
}

Give actual dollar amounts. If property has significant repair needs, lower the offer price or request a credit — not both.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(extractJSON(text)) as OfferStrategyResult
}
