'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Brain, AlertTriangle, CheckCircle, TrendingDown, Lightbulb, RefreshCw } from 'lucide-react'
import type { BudgetCheckResult, ProjectBudgetAlert } from '@/lib/ai/budget-check'

const HEALTH_CONFIG = {
  healthy: { label: 'On Track', className: 'bg-green-100 text-green-800', barColor: 'bg-green-500' },
  watch: { label: 'Watch', className: 'bg-yellow-100 text-yellow-800', barColor: 'bg-yellow-500' },
  at_risk: { label: 'At Risk', className: 'bg-orange-100 text-orange-800', barColor: 'bg-orange-500' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800', barColor: 'bg-red-500' },
}

const SEVERITY_CONFIG = {
  on_track: { label: 'On Track', dot: 'bg-green-500', text: 'text-green-700' },
  watch: { label: 'Watch', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  over_budget: { label: 'Over Budget', dot: 'bg-orange-500', text: 'text-orange-700' },
  significantly_over: { label: 'Significantly Over', dot: 'bg-red-500', text: 'text-red-700' },
}

function ProjectRow({ project }: { project: ProjectBudgetAlert }) {
  const cfg = SEVERITY_CONFIG[project.severity]
  const budgeted = project.budgeted || 0
  const committed = project.committed || 0
  const spent = project.spent || 0
  const reference = Math.max(budgeted, committed, spent, 1)
  return (
    <div className="border border-stone-100 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <div>
            <p className="text-sm font-medium text-stone-900">{project.projectName}</p>
            <p className="text-xs text-stone-500">{project.room}</p>
          </div>
        </div>
        <span className={`text-xs font-medium flex-shrink-0 ${cfg.text}`}>{cfg.label}</span>
      </div>
      <div className="space-y-1.5">
        {[
          { label: 'Budgeted', value: budgeted, color: 'bg-stone-300' },
          { label: 'Committed', value: committed, color: 'bg-amber-400' },
          { label: 'Spent', value: spent, color: 'bg-blue-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-stone-500 flex-shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / reference) * 100}%` }} />
            </div>
            <span className="w-20 text-right text-stone-700 font-medium">{formatCurrency(value)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-stone-500">{project.message}</p>
    </div>
  )
}

interface Props {}

export function BudgetCheck(_props: Props) {
  const [result, setResult] = useState<BudgetCheckResult & { cached?: boolean; generatedAt?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(forceRefresh = false) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/budget-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to run budget check')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4 max-w-sm mx-auto">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <Brain className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Budget Reality Check</h3>
              <p className="text-sm text-stone-500 mt-1">
                AI reviews your renovation budgets vs. contractor quotes vs. actual spend and flags any projects trending over budget before it&apos;s too late.
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}
            <Button onClick={() => generate()} loading={loading} disabled={loading}>
              <Brain className="h-4 w-4" />
              Run Budget Check
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const healthCfg = HEALTH_CONFIG[result.overallHealth]
  const isOverall = result.projectedOverrun < 0
  const alertProjects = result.projects.filter(p => p.severity === 'over_budget' || p.severity === 'significantly_over')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-600" />
            <CardTitle>Budget Reality Check</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => generate(true)} loading={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Health badge + summary */}
        <div className={`rounded-xl p-4 ${healthCfg.className}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.overallHealth === 'healthy'
              ? <CheckCircle className="h-4 w-4" />
              : <AlertTriangle className="h-4 w-4" />
            }
            <span className="font-bold text-sm uppercase tracking-wide">{healthCfg.label}</span>
          </div>
          <p className="text-sm leading-relaxed">{result.healthSummary}</p>
        </div>

        {/* Financial overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-stone-50 rounded-lg p-3">
            <p className="text-xs text-stone-500 mb-1">Total Budgeted</p>
            <p className="font-bold text-stone-900">{formatCurrency(result.totalBudgeted)}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="text-xs text-amber-600 mb-1">Committed</p>
            <p className="font-bold text-amber-900">{formatCurrency(result.totalCommitted)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 mb-1">Spent So Far</p>
            <p className="font-bold text-blue-900">{formatCurrency(result.totalSpent)}</p>
          </div>
          <div className={`rounded-lg p-3 ${isOverall ? 'bg-red-50' : 'bg-green-50'}`}>
            <p className={`text-xs mb-1 ${isOverall ? 'text-red-600' : 'text-green-600'}`}>Projected {isOverall ? 'Overrun' : 'Savings'}</p>
            <p className={`font-bold ${isOverall ? 'text-red-900' : 'text-green-900'}`}>
              {isOverall ? '-' : '+'}{formatCurrency(Math.abs(result.projectedOverrun))}
            </p>
          </div>
        </div>

        {/* Alert projects */}
        {alertProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold text-stone-700">Projects Over Budget ({alertProjects.length})</p>
            </div>
            <div className="space-y-2">
              {alertProjects.map(p => <ProjectRow key={p.projectId} project={p} />)}
            </div>
          </div>
        )}

        {/* All projects */}
        <div>
          <p className="text-sm font-semibold text-stone-700 mb-2">All Projects</p>
          <div className="space-y-2">
            {result.projects
              .filter(p => p.severity === 'on_track' || p.severity === 'watch')
              .map(p => <ProjectRow key={p.projectId} project={p} />)}
          </div>
        </div>

        {/* Immediate actions */}
        {result.immediateActions.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-800 mb-2">Immediate Actions</p>
            <ol className="space-y-1">
              {result.immediateActions.map((a, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">{i + 1}.</span> {a}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Saving opportunities */}
        {result.savingOpportunities.length > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-green-800">Saving Opportunities</p>
            </div>
            <ul className="space-y-1">
              {result.savingOpportunities.map((o, i) => (
                <li key={i} className="text-sm text-green-700">· {o}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
