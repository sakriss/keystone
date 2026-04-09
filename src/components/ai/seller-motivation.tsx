'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingDown, TrendingUp, Minus, RefreshCw, ArrowRight } from 'lucide-react'
import type { SellerMotivationResult, SellerMotivationSignal } from '@/lib/ai/seller-motivation'

const LABEL_CONFIG = {
  low: {
    label: 'Low Motivation',
    ringClass: 'ring-4 ring-stone-300',
    textClass: 'text-stone-500',
    bgClass: 'bg-stone-100',
    badgeClass: 'bg-stone-200 text-stone-700',
  },
  moderate: {
    label: 'Moderate Motivation',
    ringClass: 'ring-4 ring-amber-300',
    textClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  high: {
    label: 'High Motivation',
    ringClass: 'ring-4 ring-green-400',
    textClass: 'text-green-600',
    bgClass: 'bg-green-50',
    badgeClass: 'bg-green-100 text-green-800',
  },
  very_high: {
    label: 'Very High Motivation',
    ringClass: 'ring-4 ring-green-500',
    textClass: 'text-green-700',
    bgClass: 'bg-green-50',
    badgeClass: 'bg-green-200 text-green-900',
  },
}

function SignalRow({ signal }: { signal: SellerMotivationSignal }) {
  const Icon =
    signal.direction === 'bullish' ? TrendingUp :
    signal.direction === 'bearish' ? TrendingDown : Minus

  const iconClass =
    signal.direction === 'bullish' ? 'text-green-600' :
    signal.direction === 'bearish' ? 'text-red-500' : 'text-stone-400'

  const weightDot =
    signal.weight === 'strong' ? 'bg-stone-700' :
    signal.weight === 'moderate' ? 'bg-stone-400' : 'bg-stone-300'

  return (
    <li className="flex items-start gap-3 py-2">
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
      <span className="text-sm text-stone-700 flex-1">{signal.signal}</span>
      <span className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${weightDot}`} title={`Weight: ${signal.weight}`} />
    </li>
  )
}

interface Props {
  propertyId: string
}

export function SellerMotivation({ propertyId }: Props) {
  const [result, setResult] = useState<SellerMotivationResult & { cached?: boolean; generatedAt?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(forceRefresh = false) {
    setLoading(true)
    setError(null)
    if (forceRefresh && result) {
      await fetch(`/api/ai/seller-motivation/${propertyId}`, { method: 'DELETE' })
    }
    try {
      const res = await fetch(`/api/ai/seller-motivation/${propertyId}`, { method: 'POST' })
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
            <div className="h-12 w-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto">
              <TrendingDown className="h-6 w-6 text-stone-600" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Seller Motivation Score</h3>
              <p className="text-sm text-stone-500 mt-1">
                AI reads market signals — days on market, price history, offer activity — to gauge how eager this seller is to close.
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}
            <Button onClick={() => generate()} loading={loading} disabled={loading}>
              <TrendingDown className="h-4 w-4" />
              Analyze Seller Motivation
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const cfg = LABEL_CONFIG[result.label]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-stone-600" />
            <CardTitle>Seller Motivation Score</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {result.cached && <span className="text-xs text-stone-400">Cached report</span>}
            <Button variant="ghost" size="sm" onClick={() => generate(true)} loading={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score + headline */}
        <div className={`rounded-xl p-4 ${cfg.bgClass} flex items-center gap-5`}>
          <div className={`h-16 w-16 rounded-full flex items-center justify-center flex-shrink-0 bg-white ${cfg.ringClass}`}>
            <span className={`text-2xl font-black ${cfg.textClass}`}>{result.score}</span>
          </div>
          <div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cfg.badgeClass}`}>
              {cfg.label}
            </span>
            <p className="font-semibold text-stone-900 mt-1">{result.headline}</p>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-stone-700 leading-relaxed">{result.summary}</p>

        {/* Signals */}
        {result.signals.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-stone-700 mb-1">Signals Detected</p>
            <ul className="divide-y divide-stone-100">
              {result.signals.map((s, i) => <SignalRow key={i} signal={s} />)}
            </ul>
          </div>
        )}

        {/* Negotiation opportunities */}
        {result.negotiationOpportunities.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">Negotiation Opportunities</p>
            <ul className="space-y-1.5">
              {result.negotiationOpportunities.map((opp, i) => (
                <li key={i} className="text-sm text-blue-800 flex items-start gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {opp}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested approach */}
        <div className="bg-stone-50 rounded-lg p-4">
          <p className="text-sm font-semibold text-stone-700 mb-1">Suggested Approach</p>
          <p className="text-sm text-stone-700 leading-relaxed">{result.suggestedApproach}</p>
        </div>
      </CardContent>
    </Card>
  )
}
