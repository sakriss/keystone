'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Brain, AlertTriangle, CheckCircle, TrendingUp, ChevronDown, ChevronUp, RefreshCw, Upload } from 'lucide-react'
import type { InspectionAnalysisResult, InspectionFinding } from '@/lib/ai/inspection-analysis'

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
  major: { label: 'Major', className: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  minor: { label: 'Minor', className: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  monitor: { label: 'Monitor', className: 'bg-stone-100 text-stone-600', dot: 'bg-stone-400' },
}

function FindingRow({ finding }: { finding: InspectionFinding }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SEVERITY_CONFIG[finding.severity]
  return (
    <div className="border border-stone-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-50 transition-colors"
      >
        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-stone-900 text-sm">{finding.item}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>{cfg.label}</span>
            {finding.negotiationTarget && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">Negotiate</span>
            )}
            {finding.diyFriendly && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">DIY</span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">{finding.category} · Est. {formatCurrency(finding.estimatedCostLow)}–{formatCurrency(finding.estimatedCostHigh)}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-stone-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-stone-400 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-stone-100 bg-stone-50 space-y-2">
          <p className="text-sm text-stone-700">{finding.description}</p>
          {finding.negotiationNote && (
            <div className="bg-blue-50 border border-blue-100 rounded p-2">
              <p className="text-xs font-medium text-blue-800 mb-0.5">Negotiation language</p>
              <p className="text-xs text-blue-700">{finding.negotiationNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  inspectionId: string
  propertyId?: string
  propertyAddress?: string
  existingDocumentUrl?: string
}

export function InspectionAnalysis({ inspectionId, propertyId, propertyAddress, existingDocumentUrl }: Props) {
  const [result, setResult] = useState<InspectionAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [showPaste, setShowPaste] = useState(false)

  async function analyze(fileUrl?: string, text?: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/inspection-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectionId,
          propertyId,
          fileUrl: fileUrl ?? existingDocumentUrl,
          text: text ?? (fileUrl || existingDocumentUrl ? undefined : undefined),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function analyzeText() {
    if (!pastedText.trim()) return
    await analyze(undefined, pastedText)
    setShowPaste(false)
  }

  if (result) {
    const criticalCount = result.findings.filter(f => f.severity === 'critical').length
    const majorCount = result.findings.filter(f => f.severity === 'major').length

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-amber-600" />
              <CardTitle>AI Inspection Analysis</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-analyze
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Summary */}
          <p className="text-stone-700 text-sm leading-relaxed">{result.summary}</p>

          {/* Cost overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-50 rounded-lg p-3 text-center">
              <p className="text-xs text-stone-500 mb-1">Est. Repair Range</p>
              <p className="font-bold text-stone-900 text-sm">{formatCurrency(result.totalCostLow)}–{formatCurrency(result.totalCostHigh)}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 mb-1">Negotiation Target</p>
              <p className="font-bold text-blue-900 text-sm">{formatCurrency(result.negotiationTotal)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${criticalCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className={`text-xs mb-1 ${criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>Critical Issues</p>
              <p className={`font-bold text-sm ${criticalCount > 0 ? 'text-red-900' : 'text-green-900'}`}>{criticalCount}</p>
            </div>
          </div>

          {/* Red flags */}
          {result.redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="font-semibold text-red-800 text-sm">Red Flags</p>
              </div>
              <ul className="space-y-1">
                {result.redFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-red-700">· {flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Findings */}
          <div>
            <p className="text-sm font-semibold text-stone-700 mb-2">
              All Findings ({result.findings.length}) — {criticalCount} critical, {majorCount} major
            </p>
            <div className="space-y-1.5">
              {result.findings
                .sort((a, b) => {
                  const order = { critical: 0, major: 1, minor: 2, monitor: 3 }
                  return order[a.severity] - order[b.severity]
                })
                .map((f, i) => <FindingRow key={i} finding={f} />)}
            </div>
          </div>

          {/* Prioritized actions */}
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <p className="font-semibold text-amber-800 text-sm">Prioritized Actions</p>
            </div>
            <ol className="space-y-1">
              {result.prioritizedActions.map((action, i) => (
                <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-8">
        <div className="text-center space-y-4 max-w-sm mx-auto">
          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <Brain className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">AI Inspection Analyzer</h3>
            <p className="text-sm text-stone-500 mt-1">
              Upload your inspection report PDF or paste the text. Get a prioritized punch list, cost estimates, and negotiation targets.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex flex-col gap-2">
            {existingDocumentUrl && (
              <Button onClick={() => analyze()} loading={loading} disabled={loading}>
                <Brain className="h-4 w-4" />
                Analyze Uploaded Report
              </Button>
            )}
            <Button variant={existingDocumentUrl ? 'secondary' : 'primary'} onClick={() => setShowPaste(!showPaste)} disabled={loading}>
              <Upload className="h-4 w-4" />
              Paste Inspection Text
            </Button>
          </div>

          {showPaste && (
            <div className="text-left space-y-2">
              <textarea
                className="w-full h-40 text-xs border border-stone-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Paste the full text of your inspection report here..."
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
              />
              <Button onClick={analyzeText} loading={loading} disabled={loading || !pastedText.trim()} className="w-full">
                <Brain className="h-4 w-4" />
                Analyze
              </Button>
            </div>
          )}

          {!existingDocumentUrl && !showPaste && (
            <p className="text-xs text-stone-400">
              Tip: Upload the inspection PDF via Documents first, then the analyzer can read it directly.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
