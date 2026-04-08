'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Brain, DollarSign, Shield, Calendar, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import type { OfferStrategyResult } from '@/lib/ai/offer-strategy'

interface Props {
  propertyId: string
  listPrice?: number
}

export function OfferStrategy({ propertyId, listPrice }: Props) {
  const [result, setResult] = useState<OfferStrategyResult & { cached?: boolean; generatedAt?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(forceRefresh = false) {
    setLoading(true)
    setError(null)
    if (forceRefresh) {
      await fetch(`/api/ai/offer-strategy/${propertyId}`, { method: 'DELETE' })
    }
    try {
      const res = await fetch(`/api/ai/offer-strategy/${propertyId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate strategy')
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
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Offer Strategy Advisor</h3>
              <p className="text-sm text-stone-500 mt-1">
                Get a recommended offer price, earnest money, contingencies, and negotiation tactics based on market data, inspection findings, and your pre-approval.
              </p>
              {listPrice && (
                <p className="text-sm text-stone-400 mt-1">List price: {formatCurrency(listPrice)}</p>
              )}
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}
            <Button onClick={() => generate()} loading={loading} disabled={loading}>
              <Brain className="h-4 w-4" />
              Build Offer Strategy
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const savingsVsAsk = listPrice ? listPrice - result.recommendedOfferPrice : null
  const approachColors = {
    aggressive: 'bg-blue-600',
    fair: 'bg-green-600',
    above_ask: 'bg-orange-500',
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-600" />
            <CardTitle>Offer Strategy</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => generate(true)} loading={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Primary recommendation */}
        <div className="bg-stone-900 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${approachColors[result.approach]}`}>
              {result.approach.replace('_', ' ')} Approach
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-stone-400 mb-1">Recommended Offer</p>
              <p className="text-2xl font-bold">{formatCurrency(result.recommendedOfferPrice)}</p>
              {savingsVsAsk && savingsVsAsk > 0 && (
                <p className="text-xs text-green-400 mt-0.5">{formatCurrency(savingsVsAsk)} below ask</p>
              )}
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-1">Walk Away At</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(result.walkAwayPrice)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-1">Earnest Money</p>
              <p className="text-xl font-bold text-amber-400">{formatCurrency(result.earnestMoney.amount)}</p>
            </div>
          </div>
          <p className="text-sm text-stone-300 leading-relaxed">{result.rationale}</p>
        </div>

        {/* Credit strategy */}
        {result.creditStrategy.requestCredit && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">
              Request a Credit: {result.creditStrategy.creditAmount ? formatCurrency(result.creditStrategy.creditAmount) : ''}
            </p>
            <ul className="space-y-1 mb-2">
              {result.creditStrategy.creditItems.map((item, i) => (
                <li key={i} className="text-sm text-blue-700">· {item}</li>
              ))}
            </ul>
            <p className="text-xs text-blue-600">{result.creditStrategy.note}</p>
          </div>
        )}

        {/* Contingencies */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-stone-500" />
            <p className="text-sm font-semibold text-stone-700">Contingencies</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { label: 'Inspection', keep: result.contingencies.keepInspection },
              { label: 'Financing', keep: result.contingencies.keepFinancing },
              { label: 'Appraisal', keep: result.contingencies.keepAppraisal },
            ].map(({ label, keep }) => (
              <div key={label} className={`flex items-center gap-1.5 p-2 rounded-lg text-sm ${keep ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                {keep
                  ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                }
                {label}
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500">{result.contingencies.notes}</p>
        </div>

        {/* Close date + escalation */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-stone-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-4 w-4 text-stone-500" />
              <p className="text-xs font-semibold text-stone-600">Recommended Close</p>
            </div>
            <p className="text-sm font-medium text-stone-900">{result.closeDate.recommendation}</p>
            <p className="text-xs text-stone-500 mt-1">{result.closeDate.rationale}</p>
          </div>
          <div className={`rounded-lg p-3 ${result.escalationClause.recommended ? 'bg-orange-50' : 'bg-stone-50'}`}>
            <p className="text-xs font-semibold text-stone-600 mb-1">Escalation Clause</p>
            <p className={`text-sm font-medium ${result.escalationClause.recommended ? 'text-orange-700' : 'text-stone-700'}`}>
              {result.escalationClause.recommended ? 'Recommended' : 'Not needed'}
            </p>
            <p className="text-xs text-stone-500 mt-1">{result.escalationClause.reason}</p>
          </div>
        </div>

        {/* Tips */}
        {result.negotiationTips.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-stone-700 mb-2">Negotiation Tips</p>
            <ul className="space-y-1.5">
              {result.negotiationTips.map((tip, i) => (
                <li key={i} className="text-sm text-stone-700 flex items-start gap-2">
                  <span className="text-amber-600 font-bold flex-shrink-0">·</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
