'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Copy, Check, RefreshCw } from 'lucide-react'
import type { InspectionNegotiationResult } from '@/lib/ai/inspection-negotiation'

const REQUEST_TYPE_CONFIG = {
  price_reduction: { label: 'Price Reduction', className: 'bg-red-100 text-red-800' },
  repair_credit: { label: 'Repair Credit at Closing', className: 'bg-blue-100 text-blue-800' },
  seller_repairs: { label: 'Seller Repairs', className: 'bg-amber-100 text-amber-800' },
  hybrid: { label: 'Hybrid Approach', className: 'bg-purple-100 text-purple-800' },
}

interface Props {
  inspectionId: string
  inspectionStatus: string
}

export function InspectionNegotiation({ inspectionId, inspectionStatus }: Props) {
  const [result, setResult] = useState<InspectionNegotiationResult & { cached?: boolean } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (inspectionStatus !== 'completed') return null

  async function generate(forceRefresh = false) {
    setLoading(true)
    setError(null)
    if (forceRefresh && result) {
      await fetch(`/api/ai/inspection-negotiation/${inspectionId}`, { method: 'DELETE' })
    }
    try {
      const res = await fetch(`/api/ai/inspection-negotiation/${inspectionId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate script')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function copyEmail() {
    if (!result) return
    const fullText = `Subject: ${result.subject}\n\n${result.emailBody}`
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!result) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4 max-w-sm mx-auto">
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Negotiation Script</h3>
              <p className="text-sm text-stone-500 mt-1">
                AI drafts a professional email to the seller&apos;s agent based on your inspection findings — ready to copy and send.
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}
            <Button onClick={() => generate()} loading={loading} disabled={loading}>
              <Mail className="h-4 w-4" />
              Generate Draft Email
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const reqCfg = REQUEST_TYPE_CONFIG[result.requestType]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <CardTitle>Negotiation Script</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {result.cached && <span className="text-xs text-stone-400">Cached</span>}
            <Button variant="ghost" size="sm" onClick={() => generate(true)} loading={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strategy badge + request amount */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${reqCfg.className}`}>
            {reqCfg.label}
          </span>
          {result.requestAmount != null && (
            <span className="text-sm font-semibold text-stone-700">
              Requesting{' '}
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(result.requestAmount)}
            </span>
          )}
        </div>

        {/* Subject line */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Subject</p>
          <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 font-medium">
            {result.subject}
          </div>
        </div>

        {/* Email body */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Email Body</p>
          <pre className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-800 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
            {result.emailBody}
          </pre>
        </div>

        {/* Copy button */}
        <Button onClick={copyEmail} variant="secondary" className="w-full">
          {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Full Email</>}
        </Button>

        {/* Key points */}
        {result.keyPoints.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">Key Ask Summary</p>
            <ul className="space-y-1">
              {result.keyPoints.map((pt, i) => (
                <li key={i} className="text-sm text-blue-800">· {pt}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tone note */}
        {result.toneNote && (
          <p className="text-xs text-stone-400 italic">{result.toneNote}</p>
        )}
      </CardContent>
    </Card>
  )
}
