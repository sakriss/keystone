'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Brain, TrendingUp, Star, AlertTriangle, RefreshCw } from 'lucide-react'
import type { RenovationROIResult, ProjectROIEstimate } from '@/lib/ai/renovation-roi'

function ROIBar({ value }: { value: number }) {
  const pct = Math.min(value * 100, 150)
  const color = value >= 1 ? 'bg-green-500' : value >= 0.7 ? 'bg-amber-500' : 'bg-orange-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-stone-600 w-10 text-right">{Math.round(value * 100)}%</span>
    </div>
  )
}

function ProjectCard({ project, isTop }: { project: ProjectROIEstimate; isTop: boolean }) {
  return (
    <div className={`border rounded-lg p-4 space-y-3 ${isTop ? 'border-amber-300 bg-amber-50' : 'border-stone-100'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {isTop && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
            <p className="font-medium text-stone-900 text-sm">{project.projectName}</p>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">{project.room}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-stone-900 text-sm">+{formatCurrency(project.estimatedValueAdded)}</p>
          <p className="text-xs text-stone-500">est. value added</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
          <span>Est. ROI</span>
          <span>National avg: {Math.round(project.nationalAvgROI * 100)}%</span>
        </div>
        <ROIBar value={project.estimatedROI} />
      </div>

      <p className="text-xs text-stone-600 leading-relaxed">{project.reasoning}</p>

      {project.localMarketNote && (
        <p className="text-xs text-stone-500 italic">{project.localMarketNote}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          project.diyPotential === 'full' ? 'bg-green-100 text-green-700' :
          project.diyPotential === 'partial' ? 'bg-yellow-100 text-yellow-700' :
          'bg-stone-100 text-stone-600'
        }`}>
          DIY: {project.diyPotential}
        </span>
        {project.diySavingsEstimate && (
          <span className="text-xs text-stone-500">Save ~{formatCurrency(project.diySavingsEstimate)} DIY</span>
        )}
        <span className="text-xs text-stone-400">Priority #{project.recommendedSequence}</span>
      </div>
    </div>
  )
}

interface Props {
  propertyId?: string
}

export function RenovationROI({ propertyId }: Props) {
  const [result, setResult] = useState<RenovationROIResult & { cached?: boolean; generatedAt?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate(forceRefresh = false) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/renovation-roi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, forceRefresh }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate ROI analysis')
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
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Renovation ROI Estimator</h3>
              <p className="text-sm text-stone-500 mt-1">
                Get AI-estimated return on investment for each of your planned renovations based on local market data and industry benchmarks.
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}
            <Button onClick={() => generate()} loading={loading} disabled={loading}>
              <Brain className="h-4 w-4" />
              Estimate ROI
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const sortedProjects = [...result.projects].sort((a, b) => a.recommendedSequence - b.recommendedSequence)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            <CardTitle>Renovation ROI</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => generate(true)} loading={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Market context + summary */}
        <div className="bg-stone-50 rounded-lg p-4 space-y-2">
          <p className="text-sm text-stone-600">{result.marketContext}</p>
          <p className="text-sm font-medium text-stone-800">{result.overallRecommendation}</p>
          <div className="pt-1">
            <span className="text-xs text-stone-500">Total est. value added across all projects: </span>
            <span className="text-sm font-bold text-green-700">+{formatCurrency(result.totalEstimatedValueAdded)}</span>
          </div>
        </div>

        {/* Projects */}
        <div className="space-y-3">
          {sortedProjects.map(project => (
            <ProjectCard
              key={project.projectId}
              project={project}
              isTop={result.topPicks.includes(project.projectName)}
            />
          ))}
        </div>

        {/* Sequencing advice */}
        {result.sequencingAdvice.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">Recommended Sequence</p>
            <ol className="space-y-1">
              {result.sequencingAdvice.map((step, i) => (
                <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                  <span className="font-bold flex-shrink-0">{i + 1}.</span> {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-sm font-semibold text-red-800">Warnings</p>
            </div>
            <ul className="space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-sm text-red-700">· {w}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
