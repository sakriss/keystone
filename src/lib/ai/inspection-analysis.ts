import { getModel, extractJSON } from './client'

export interface InspectionFinding {
  category: string
  item: string
  severity: 'critical' | 'major' | 'minor' | 'monitor'
  description: string
  estimatedCostLow: number
  estimatedCostHigh: number
  negotiationTarget: boolean
  negotiationNote?: string
  diyFriendly: boolean
}

export interface InspectionAnalysisResult {
  summary: string
  totalCostLow: number
  totalCostHigh: number
  negotiationTotal: number
  findings: InspectionFinding[]
  prioritizedActions: string[]
  redFlags: string[]
}

const PROMPT_SUFFIX = `
Return ONLY valid JSON matching this exact structure:
{
  "summary": "2-3 sentence plain-language summary of overall property condition",
  "totalCostLow": <number, sum of all low cost estimates>,
  "totalCostHigh": <number, sum of all high cost estimates>,
  "negotiationTotal": <number, sum of negotiationTarget items midpoint costs>,
  "findings": [
    {
      "category": "string (Roof/Electrical/Plumbing/HVAC/Structural/Exterior/Interior/etc)",
      "item": "short item name",
      "severity": "critical|major|minor|monitor",
      "description": "plain English explanation a first-time buyer would understand",
      "estimatedCostLow": number,
      "estimatedCostHigh": number,
      "negotiationTarget": boolean,
      "negotiationNote": "suggested negotiation language if negotiationTarget is true, else omit",
      "diyFriendly": boolean
    }
  ],
  "prioritizedActions": ["action 1", "action 2"],
  "redFlags": ["red flag 1"]
}

Severity guide: critical=safety issue or structural/major system failure, major=significant repair needed soon, minor=repair needed but not urgent, monitor=watch over time.
Only include items in redFlags that would cause most buyers to walk away or require immediate specialist evaluation before closing.
Keep findings focused — merge related items.`

export async function analyzeInspectionText(
  inspectionText: string,
  propertyAddress?: string
): Promise<InspectionAnalysisResult> {
  const model = getModel()
  const context = propertyAddress ? `Property: ${propertyAddress}\n\n` : ''

  const prompt = `You are an expert home inspector and buyers' advocate. Analyze this home inspection report and return a structured JSON response.

${context}INSPECTION REPORT:
${inspectionText}
${PROMPT_SUFFIX}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(extractJSON(text)) as InspectionAnalysisResult
}

export async function analyzeInspectionPDF(
  pdfBase64: string,
  propertyAddress?: string
): Promise<InspectionAnalysisResult> {
  const model = getModel()
  const context = propertyAddress ? `Property: ${propertyAddress}\n\n` : ''

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64,
      },
    },
    {
      text: `You are an expert home inspector and buyers' advocate. Analyze this home inspection report PDF and return a structured JSON response.

${context}${PROMPT_SUFFIX}`,
    },
  ])

  const text = result.response.text()
  return JSON.parse(extractJSON(text)) as InspectionAnalysisResult
}
