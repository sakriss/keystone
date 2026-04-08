import { getModel, extractJSON } from './client'

export interface BudgetProject {
  id: string
  name: string
  room: string
  status: string
  budgetEstimate?: number
  contractorQuote?: number
  actualCost?: number
  priority?: string
}

export interface BudgetCheckInput {
  projects: BudgetProject[]
  totalBudget?: number
}

export interface ProjectBudgetAlert {
  projectId: string
  projectName: string
  room: string
  severity: 'on_track' | 'watch' | 'over_budget' | 'significantly_over'
  budgeted: number
  committed: number
  spent: number
  variance: number
  variancePercent: number
  message: string
}

export interface BudgetCheckResult {
  overallHealth: 'healthy' | 'watch' | 'at_risk' | 'critical'
  healthSummary: string
  totalBudgeted: number
  totalCommitted: number
  totalSpent: number
  projectedFinalCost: number
  projectedOverrun: number
  projects: ProjectBudgetAlert[]
  immediateActions: string[]
  riskFactors: string[]
  savingOpportunities: string[]
}

export async function generateBudgetCheck(input: BudgetCheckInput): Promise<BudgetCheckResult> {
  const model = getModel()

  const prompt = `You are a construction project manager and budget analyst. Review this renovation budget data and identify projects trending over budget, flag risks, and suggest corrective actions.

BUDGET DATA:
${JSON.stringify(input, null, 2)}

For each project compare budgetEstimate vs contractorQuote (committed) vs actualCost (spent so far).
- contractorQuote > budgetEstimate = over budget on committed spend
- actualCost > contractorQuote = running over quoted amount
- Completed projects should have final actuals; in_progress have partial actuals with more coming

Return ONLY valid JSON matching this exact structure:
{
  "overallHealth": "healthy|watch|at_risk|critical",
  "healthSummary": "2-3 sentence plain-language summary",
  "totalBudgeted": number,
  "totalCommitted": number,
  "totalSpent": number,
  "projectedFinalCost": number,
  "projectedOverrun": number (negative = under budget),
  "projects": [
    {
      "projectId": "string",
      "projectName": "string",
      "room": "string",
      "severity": "on_track|watch|over_budget|significantly_over",
      "budgeted": number,
      "committed": number,
      "spent": number,
      "variance": number,
      "variancePercent": number,
      "message": "specific note about this project's budget status"
    }
  ],
  "immediateActions": ["action 1"],
  "riskFactors": ["risk 1"],
  "savingOpportunities": ["opportunity 1"]
}

Be specific about which projects are problematic and why. Focus on actionable advice.`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return JSON.parse(extractJSON(text)) as BudgetCheckResult
}
