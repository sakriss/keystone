'use client'
import { useMemo } from 'react'

interface Project {
  id: string
  title: string
  room_name: string
  status: string
  priority: string
  start_date: string | null
  end_date: string | null
  budget_estimate: number | null
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: '#d97706',
  planned: '#3b82f6',
  on_hold: '#9ca3af',
  completed: '#22c55e',
  cancelled: '#ef4444',
}

export function TimelineChart({ projects }: { projects: Project[] }) {
  const { minDate, maxDate, weeks } = useMemo(() => {
    const dates = projects.flatMap(p => [p.start_date, p.end_date].filter(Boolean) as string[])
    if (!dates.length) return { minDate: new Date(), maxDate: new Date(), weeks: 12 }

    const min = new Date(Math.min(...dates.map(d => new Date(d).getTime())))
    const max = new Date(Math.max(...dates.map(d => new Date(d).getTime())))

    // Add padding
    min.setDate(min.getDate() - 7)
    max.setDate(max.getDate() + 14)

    const diffMs = max.getTime() - min.getTime()
    const weeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000))

    return { minDate: min, maxDate: max, weeks: Math.max(weeks, 8) }
  }, [projects])

  const totalMs = maxDate.getTime() - minDate.getTime()

  function pct(date: Date) {
    return ((date.getTime() - minDate.getTime()) / totalMs) * 100
  }

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels = []
    const d = new Date(minDate)
    d.setDate(1)
    while (d <= maxDate) {
      labels.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), pct: pct(d) })
      d.setMonth(d.getMonth() + 1)
    }
    return labels
  }, [minDate, maxDate])

  const sorted = [...projects].sort((a, b) => {
    const aDate = a.start_date ? new Date(a.start_date).getTime() : 0
    const bDate = b.start_date ? new Date(b.start_date).getTime() : 0
    return aDate - bDate
  })

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Month labels */}
        <div className="relative h-6 mb-2 ml-32">
          {monthLabels.map((m, i) => (
            <div
              key={i}
              className="absolute text-xs text-stone-400 -translate-x-1/2"
              style={{ left: `${m.pct}%` }}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1.5">
          {sorted.map(p => {
            const start = p.start_date ? new Date(p.start_date) : new Date(maxDate.getTime() - 7 * 24 * 60 * 60 * 1000)
            const end = p.end_date ? new Date(p.end_date) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)
            const left = pct(start)
            const right = pct(end)
            const width = Math.max(right - left, 1)
            const color = STATUS_COLORS[p.status] ?? '#9ca3af'

            return (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-32 shrink-0 text-right">
                  <p className="text-xs font-medium text-stone-700 truncate">{p.title}</p>
                  <p className="text-xs text-stone-400 truncate">{p.room_name}</p>
                </div>
                <div className="flex-1 relative h-7 bg-stone-100 rounded-full overflow-hidden">
                  {/* Today line */}
                  <div
                    className="absolute h-full w-px bg-red-400 z-10"
                    style={{ left: `${pct(new Date())}%` }}
                  />
                  <div
                    className="absolute h-full rounded-full flex items-center px-2 transition-all"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: color,
                      opacity: p.status === 'cancelled' ? 0.5 : 1,
                    }}
                    title={`${p.title} | ${p.start_date ?? '?'} → ${p.end_date ?? '?'}`}
                  >
                    <span className="text-white text-xs truncate font-medium">
                      {width > 8 ? p.title : ''}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 flex-wrap">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-stone-500">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {status.replace('_', ' ')}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <div className="h-2.5 w-px bg-red-400" />
            Today
          </div>
        </div>
      </div>
    </div>
  )
}
