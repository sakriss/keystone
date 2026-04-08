import { getModel, extractJSON } from './client'

export interface RenovationProject {
  id: string
  name: string
  room: string
  description?: string
  status: string
  budgetEstimate?: number
  contractorQuote?: number
  priority?: string
}

export interface RenovationROIInput {
  propertyAddress: string
  state?: string
  zip?: string
  estimatedHomeValue?: number
  projects: RenovationProject[]
}

export interface ProjectROIEstimate {
  projectId: string
  projectName: string
  room: string
  estimatedROI: number
  estimatedValueAdded: number
  nationalAvgROI: number
  localMarketNote: string
  diyPotential: 'full' | 'partial' | 'none'
  diySavingsEstimate?: number
  recommendedSequence: number
  reasoning: string
}

export interface RenovationROIResult {
  marketContext: string
  overallRecommendation: string
  totalEstimatedValueAdded: number
  projects: ProjectROIEstimate[]
  sequencingAdvice: string[]
  topPicks: string[]
  warnings: string[]
}

export async function generateRenovationROI(input: RenovationROIInput): Promise<RenovationROIResult> {
  const model = getModel()

  const prompt = `You are a real estate investment advisor specializing in renovation ROI. Estimate the return on investment for each planned renovation project using current market data for the region.

RENOVATION DATA:
${JSON.stringify(input, null, 2)}

Return ONLY valid JSON matching this exact structure:
{
  "marketContext": "1-2 sentences about renovation ROI trends in this market",
  "overallRecommendation": "2-3 sentence summary of the best strategy",
  "totalEstimatedValueAdded": number,
  "projects": [
    {
      "projectId": "string matching input id",
      "projectName": "string",
      "room": "string",
      "estimatedROI": number (0-1.5, e.g. 0.72 = 72%),
      "estimatedValueAdded": number,
      "nationalAvgROI": number,
      "localMarketNote": "brief note on local market impact",
      "diyPotential": "full|partial|none",
      "diySavingsEstimate": number or null,
      "recommendedSequence": number (1 = highest priority),
      "reasoning": "1-2 sentences"
    }
  ],
  "sequencingAdvice": ["step 1", "step 2"],
  "topPicks": ["project name 1", "project name 2"],
  "warnings": ["warning 1"]
}

Use Remodeling Cost vs Value benchmarks: kitchen 60-80%, bathroom 50-70%, paint 100%+, deck 65-75%, basement finishing 60-70%. Adjust for local market. Flag sequencing dependencies.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(extractJSON(text)) as RenovationROIResult
}
