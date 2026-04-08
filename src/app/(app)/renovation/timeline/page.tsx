import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Calendar } from 'lucide-react'
import { TimelineChart } from './timeline-chart'

export default async function TimelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, room_projects(*)')
    .eq('user_id', user!.id)
    .order('sort_order')

  const projects = rooms?.flatMap(r =>
    (r.room_projects as {
      id: string
      title: string
      status: string
      priority: string
      start_date: string | null
      end_date: string | null
      budget_estimate: number | null
    }[]).map(p => ({
      ...p,
      room_name: r.name,
      room_id: r.id,
    }))
  ) ?? []

  const datedProjects = projects.filter(p => p.start_date || p.end_date)
  const undatedProjects = projects.filter(p => !p.start_date && !p.end_date)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Renovation Timeline</h1>
        <p className="text-sm text-stone-500 mt-1">Visual overview of all your renovation projects</p>
      </div>

      {!projects.length ? (
        <Card>
          <EmptyState
            icon={Calendar}
            title="No projects yet"
            description="Add renovation projects with start and end dates to see them on the timeline."
          />
        </Card>
      ) : (
        <>
          {datedProjects.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Project Timeline</CardTitle></CardHeader>
              <CardContent>
                <TimelineChart projects={datedProjects} />
              </CardContent>
            </Card>
          )}

          {/* All projects by status */}
          <Card>
            <CardHeader><CardTitle>All Projects</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Project</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Room</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Priority</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Dates</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {projects
                      .sort((a, b) => {
                        const order = { in_progress: 0, planned: 1, on_hold: 2, completed: 3, cancelled: 4 }
                        return (order[a.status as keyof typeof order] ?? 5) - (order[b.status as keyof typeof order] ?? 5)
                      })
                      .map(p => (
                        <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-stone-800">{p.title}</td>
                          <td className="px-5 py-3 text-stone-500">{p.room_name}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.status === 'completed' ? 'bg-green-100 text-green-800' :
                              p.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
                              p.status === 'on_hold' ? 'bg-gray-100 text-gray-600' :
                              p.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {p.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.priority === 'high' ? 'bg-red-100 text-red-800' :
                              p.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                              'bg-green-100 text-green-800'
                            }`}>{p.priority}</span>
                          </td>
                          <td className="px-5 py-3 text-stone-500 text-xs">
                            {p.start_date ? new Date(p.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            {p.end_date ? ` → ${new Date(p.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                          </td>
                          <td className="px-5 py-3 text-right text-stone-600">
                            {p.budget_estimate ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.budget_estimate) : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
