'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Brain, CheckCircle, AlertTriangle, TrendingDown, TrendingUp, RefreshCw, ArrowRight } from 'lucide-react'
import type { ShouldIBuyResult } from '@/lib/ai/should-i-buy'

const VERDICT_CONFIG = {
  buy: {
    label: 'Buy It',
    className: 'bg-green-100 border-green-200 text-green-900',
    badge: 'bg-green-600 text-white',
    icon: CheckCircle,
  },
  proceed_with_caution: {
    label: 'Proceed with Caution',
    className: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    badge: 'bg-yellow-500 text-white',
    icon: AlertTriangle,
  },
  negotiate_hard: {
    label: 'Negotiate Hard',
    className: 'bg-orange-50 border-orange-200 text-orange-900',
    badge: 'bg-orange-500 text-white',
    icon: TrendingDown,
  },
  walk_away: {
    label: 'Walk Away',
    className: 'bg-red-50 border-red-200 text-red-900',
    badge: 'bg-red-600 text-white',
    icon: AlertTriangle,
  },
}

interface Props {
  propertyId: string
  propertyAddress: string
}

export function ShouldIBuyReport({ propertyId, propertyAddress }: Props) {
  const [result, setResult] = useState<ShouldIBuyResult & { cached?: boolean; generatedAt?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(forceRefresh = false) {
    setLoading(true)
    setError(null)
    if (forceRefresh && result) {
      await fetch(`/api/ai/should-i-buy/${propertyId}`, { method: 'DELETE' })
    }
    try {
      const res = await fetch(`/api/ai/should-i-buy/${propertyId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate report')
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
              <h3 className="font-semibold text-stone-900">Should I Buy This?</h3>
              <p className="text-sm text-stone-500 mt-1">
                AI synthesizes your pros/cons, inspection findings, neighborhood data, comps, and budget into a single honest recommendation.
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}
            <Button onClick={() => generate()} loading={loading} disabled={loading}>
              <Brain className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const cfg = VERDICT_CONFIG[result.verdict]
  const VerdictIcon = cfg.icon

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-600" />
            <CardTitle>Should I Buy This?</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {result.cached && (
              <span className="text-xs text-stone-400">Cached report</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => generate(true)} loading={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Verdict */}
        <div className={`border rounded-xl p-4 ${cfg.className}`}>
          <div className="flex items-start gap-3">
            <VerdictIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cfg.badge}`}>{cfg.label}</span>
                <span className="text-sm font-semibold">Score: {result.overallScore}/10</span>
              </div>
              <p className="font-semibold text-sm">{result.verdictHeadline}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-stone-700 leading-relaxed">{result.summary}</p>

        {/* Financial snapshot */}
        {(result.financialSnapshot.listPrice || result.financialSnapshot.estimatedFairValue) && (
          <div className="grid grid-cols-2 gap-3">
            {result.financialSnapshot.listPrice && (
              <div className="bg-stone-50 rounded-lg p-3">
                <p className="text-xs text-stone-500 mb-1">List Price</p>
                <p className="font-bold text-stone-900">{formatCurrency(result.financialSnapshot.listPrice)}</p>
              </div>
            )}
            {result.financialSnapshot.estimatedFairValue && (
              <div className="bg-stone-50 rounded-lg p-3">
                <p className="text-xs text-stone-500 mb-1">Est. Fair Value</p>
                <p className="font-bold text-stone-900">{formatCurrency(result.financialSnapshot.estimatedFairValue)}</p>
              </div>
            )}
            {result.financialSnapshot.repairCostEstimate && (
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-orange-600 mb-1">Repair Cost Est.</p>
                <p className="font-bold text-orange-900">{result.financialSnapshot.repairCostEstimate}</p>
              </div>
            )}
            {result.financialSnapshot.trueCostOfPurchase && (
              <div className="bg-stone-100 rounded-lg p-3">
                <p className="text-xs text-stone-600 mb-1">True Cost</p>
                <p className="font-bold text-stone-900">{result.financialSnapshot.trueCostOfPurchase}</p>
              </div>
            )}
          </div>
        )}

        {result.financialSnapshot.monthlyAffordabilityNote && (
          <p className="text-xs text-stone-500 italic">{result.financialSnapshot.monthlyAffordabilityNote}</p>
        )}

        {/* Strengths + Concerns */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-stone-700">Strengths</p>
            </div>
            <ul className="space-y-1">
              {result.strengths.map((s, i) => (
                <li key={i} className="text-sm text-stone-700 flex items-start gap-1.5">
                  <span className="text-green-600 font-bold flex-shrink-0">+</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-semibold text-stone-700">Concerns</p>
            </div>
            <ul className="space-y-1">
              {result.concerns.map((c, i) => (
                <li key={i} className="text-sm text-stone-700 flex items-start gap-1.5">
                  <span className="text-orange-500 font-bold flex-shrink-0">–</span> {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Negotiation leverage */}
        {result.negotiationLeverage.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">Your Negotiation Leverage</p>
            <ul className="space-y-1">
              {result.negotiationLeverage.map((l, i) => (
                <li key={i} className="text-sm text-blue-800 flex items-start gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {l}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Deal breakers */}
        {result.dealBreakers.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-sm font-semibold text-red-800">Deal Breakers</p>
            </div>
            <ul className="space-y-1">
              {result.dealBreakers.map((d, i) => (
                <li key={i} className="text-sm text-red-700">· {d}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next steps */}
        <div>
          <p className="text-sm font-semibold text-stone-700 mb-2">Next Steps</p>
          <ol className="space-y-1">
            {result.nextSteps.map((step, i) => (
              <li key={i} className="text-sm text-stone-700 flex items-start gap-2">
                <span className="font-bold text-amber-600 flex-shrink-0">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
