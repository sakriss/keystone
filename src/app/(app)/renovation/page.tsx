import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, statusLabel } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Hammer, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { RoomActions } from './room-actions'
import { RenovationROI } from '@/components/ai/renovation-roi'
import { BudgetCheck } from '@/components/ai/budget-check'

export default async function RenovationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, room_projects(*)')
    .eq('user_id', user!.id)
    .order('sort_order')
    .order('created_at', { ascending: false })

  const allProjects = rooms?.flatMap(r => (r.room_projects as { status: string; budget_estimate: number | null; contractor_quote: number | null }[] || []))
  const totalBudget = allProjects?.reduce((sum, p) => sum + (p.budget_estimate || 0), 0) ?? 0
  const activeProjects = allProjects?.filter(p => p.status === 'in_progress').length ?? 0
  const completedProjects = allProjects?.filter(p => p.status === 'completed').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Home Renovation</h1>
          <p className="text-sm text-stone-500 mt-1">Plan and track renovation projects by room</p>
        </div>
        <RoomActions mode="add" />
      </div>

      {/* Stats */}
      {rooms && rooms.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Rooms</p>
            <p className="text-xl font-bold text-stone-900">{rooms.length}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Total Projects</p>
            <p className="text-xl font-bold text-stone-900">{allProjects?.length ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">In Progress</p>
            <p className="text-xl font-bold text-amber-600">{activeProjects}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Est. Budget</p>
            <p className="text-xl font-bold text-stone-900">{formatCurrency(totalBudget)}</p>
          </CardContent></Card>
        </div>
      )}

      {/* AI Features */}
      {rooms && rooms.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <span className="h-5 w-5 rounded bg-amber-100 flex items-center justify-center text-xs">✦</span>
              AI Analysis
            </h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <RenovationROI />
            <BudgetCheck />
          </div>
        </div>
      )}

      {!rooms?.length ? (
        <Card>
          <EmptyState
            icon={Hammer}
            title="No rooms yet"
            description="Add rooms to start planning your renovation projects. Works even if you haven't purchased a home yet."
            action={<RoomActions mode="add" />}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {rooms.map(room => {
            const projects = (room.room_projects as { status: string; priority: string; title: string; budget_estimate: number | null }[] || [])
            const inProgress = projects.filter(p => p.status === 'in_progress')
            const highPriority = projects.filter(p => p.priority === 'high' && p.status !== 'completed')
            const totalRoomBudget = projects.reduce((sum, p) => sum + (p.budget_estimate || 0), 0)

            return (
              <Link key={room.id} href={`/renovation/${room.id}`}>
                <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-stone-900">{room.name}</h3>
                        {room.description && <p className="text-xs text-stone-500 mt-0.5">{room.description}</p>}
                      </div>
                      <ArrowRight className="h-4 w-4 text-stone-300 shrink-0 mt-0.5" />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {inProgress.length > 0 && <Badge label={`${inProgress.length} in progress`} status="in_progress" />}
                      {highPriority.length > 0 && <Badge label={`${highPriority.length} high priority`} status="high" />}
                      {projects.length === 0 && <span className="text-xs text-stone-400">No projects yet</span>}
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
                      {totalRoomBudget > 0 && <span>{formatCurrency(totalRoomBudget)} budgeted</span>}
                    </div>

                    {/* Mini project list */}
                    {projects.slice(0, 3).map(p => (
                      <div key={p.title} className="flex items-center gap-1.5 text-xs">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          p.status === 'completed' ? 'bg-green-400' :
                          p.status === 'in_progress' ? 'bg-amber-400' :
                          p.status === 'on_hold' ? 'bg-stone-300' : 'bg-blue-400'
                        }`} />
                        <span className="text-stone-600 truncate">{p.title}</span>
                      </div>
                    ))}
                    {projects.length > 3 && (
                      <p className="text-xs text-stone-400">+{projects.length - 3} more</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
