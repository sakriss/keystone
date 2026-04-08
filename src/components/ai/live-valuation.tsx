'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BarChart3, RefreshCw, ExternalLink, Home } from 'lucide-react'

interface Valuation {
  valueLow: number | null
  valueMid: number | null
  valueHigh: number | null
}

interface Comparable {
  formattedAddress: string
  price: number
  squareFootage?: number
  bedrooms?: number
  bathrooms?: number
  lastSaleDate?: string
  distance?: number
}

interface ListingData {
  cached: boolean
  fetchedAt: string
  valuation: Valuation | null
  comparables: Comparable[]
}

interface Props {
  propertyId: string
  listPrice?: number
}

export function LiveValuation({ propertyId, listPrice }: Props) {
  const [data, setData] = useState<ListingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchData(forceRefresh = false) {
    setLoading(true)
    setError(null)
    if (forceRefresh) {
      await fetch(`/api/listings/${propertyId}`, { method: 'DELETE' })
    }
    try {
      const res = await fetch(`/api/listings/${propertyId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch valuation')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4 max-w-sm mx-auto">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <BarChart3 className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Live Valuation & Comps</h3>
              <p className="text-sm text-stone-500 mt-1">
                Pull live valuation and comparable sales from RentCast. Requires a RentCast API key.
              </p>
              {listPrice && (
                <p className="text-sm text-stone-400 mt-1">List price: {formatCurrency(listPrice)}</p>
              )}
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
                {error.includes('RENTCAST_API_KEY') && (
                  <p className="mt-1 text-xs text-red-500">Add <code className="bg-red-100 px-1 rounded">RENTCAST_API_KEY</code> to your .env.local file to enable this feature.</p>
                )}
              </div>
            )}
            <Button onClick={() => fetchData()} loading={loading} disabled={loading}>
              <BarChart3 className="h-4 w-4" />
              Get Valuation
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { valuation, comparables } = data
  const hasMid = valuation?.valueMid != null
  const vsAsk = hasMid && listPrice ? listPrice - (valuation!.valueMid ?? 0) : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-600" />
            <CardTitle>Live Valuation</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {data.cached && <span className="text-xs text-stone-400">Cached</span>}
            <span className="text-xs text-stone-400">Updated {formatDate(data.fetchedAt)}</span>
            <Button variant="ghost" size="sm" onClick={() => fetchData(true)} loading={loading}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Valuation */}
        {valuation && hasMid && (
          <div className="bg-stone-900 rounded-xl p-5 text-white">
            <p className="text-xs text-stone-400 mb-3 uppercase tracking-wide">RentCast Estimated Value</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-stone-400 mb-1">Low</p>
                <p className="text-lg font-bold">{formatCurrency(valuation.valueLow!)}</p>
              </div>
              <div className="text-center border-x border-stone-700">
                <p className="text-xs text-stone-400 mb-1">Estimated</p>
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(valuation.valueMid!)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-stone-400 mb-1">High</p>
                <p className="text-lg font-bold">{formatCurrency(valuation.valueHigh!)}</p>
              </div>
            </div>
            {vsAsk !== null && (
              <div className="mt-4 pt-4 border-t border-stone-700 text-center">
                {vsAsk > 0 ? (
                  <p className="text-sm text-green-400">Listed <span className="font-bold">{formatCurrency(vsAsk)}</span> above estimated value</p>
                ) : vsAsk < 0 ? (
                  <p className="text-sm text-green-400">Listed <span className="font-bold">{formatCurrency(Math.abs(vsAsk))}</span> below estimated value — potential deal</p>
                ) : (
                  <p className="text-sm text-stone-300">Listed at estimated value</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Comparables */}
        {comparables && comparables.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-stone-700 mb-3">Comparable Sales</p>
            <div className="space-y-2">
              {comparables.map((comp, i) => (
                <div key={i} className="border border-stone-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <Home className="h-4 w-4 text-stone-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm text-stone-900 truncate">{comp.formattedAddress}</p>
                        <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5 flex-wrap">
                          {comp.bedrooms && <span>{comp.bedrooms} bd</span>}
                          {comp.bathrooms && <span>{comp.bathrooms} ba</span>}
                          {comp.squareFootage && <span>{comp.squareFootage.toLocaleString()} sqft</span>}
                          {comp.distance && <span>{comp.distance.toFixed(2)} mi away</span>}
                          {comp.lastSaleDate && <span>Sold {formatDate(comp.lastSaleDate)}</span>}
                        </div>
                      </div>
                    </div>
                    <p className="font-bold text-stone-900 flex-shrink-0">{formatCurrency(comp.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-stone-400 text-center">
          Data provided by RentCast · For informational purposes only
        </p>
      </CardContent>
    </Card>
  )
}
