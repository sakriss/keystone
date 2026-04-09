import { getModel, extractJSON } from './client'

export interface InspectionNegotiationItem {
  description: string
  priority: 'high' | 'medium' | 'low'
  category?: string | null
  estimated_cost?: number | null
  notes?: string | null
}

export interface InspectionNegotiationInput {
  property: {
    address: string
    city?: string | null
    state?: string | null
  }
  currentOfferAmount?: number | null
  inspectionItems: InspectionNegotiationItem[]
  totalRepairLow: number
  totalRepairHigh: number
}

export interface InspectionNegotiationResult {
  subject: string
  emailBody: string
  requestType: 'price_reduction' | 'repair_credit' | 'seller_repairs' | 'hybrid'
  requestAmount: number | null
  keyPoints: string[]
  toneNote: string
}

export async function generateNegotiationScript(
  input: InspectionNegotiationInput
): Promise<InspectionNegotiationResult> {
  const model = getModel()

  const prompt = `You are a skilled real estate buyer's agent drafting a post-inspection negotiation email to the seller's agent. Your goal is to be professional, firm, and persuasive — never aggressive or emotional.

INSPECTION DATA:
${JSON.stringify(input, null, 2)}

Draft a negotiation email on behalf of the buyer. The email should:
- Reference specific high-priority items by name and estimated cost
- Make a clear, specific ask (price reduction, repair credit at closing, or seller completes repairs before closing)
- Be professional and collaborative in tone, not adversarial
- Be realistic — don't ask for more than the repair estimate range supports
- Leave room for counter-negotiation

requestType guidance:
- "price_reduction": buyer wants the purchase price reduced by the repair amount
- "repair_credit": buyer wants a credit at closing they can use for repairs
- "seller_repairs": buyer wants seller to fix specific items before closing
- "hybrid": combination approach (credit for some, repairs for others)

Choose the requestType that makes the most strategic sense given the items and amounts.

Return ONLY valid JSON matching this exact structure:
{
  "subject": <email subject line>,
  "emailBody": <full professional email body as a string, use \\n for line breaks>,
  "requestType": <"price_reduction" | "repair_credit" | "seller_repairs" | "hybrid">,
  "requestAmount": <dollar amount requested, or null if seller repairs>,
  "keyPoints": [<2-4 bullet points summarizing the ask>],
  "toneNote": <one sentence describing the tone strategy, e.g. "Collaborative but firm — frames request as standard practice, not a confrontation">
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(extractJSON(text)) as InspectionNegotiationResult
}
