import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Wrench } from 'lucide-react'
import Link from 'next/link'
import { ProjectActions } from './project-actions'
import { ProjectBoard } from './project-board'
import { SourcingActions } from '../sourcing/sourcing-actions'
import { SourcingBoard } from '../sourcing/sourcing-board'

export default async function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: room }, { data: projects }, { data: sourcingItems }] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', roomId).eq('user_id', user!.id).single(),
    supabase.from('room_projects').select('*, project_resources(*), room_photos(*)').eq('room_id', roomId).order('created_at', { ascending: false }),
    supabase.from('sourcing_items').select('*').eq('room_id', roomId).order('created_at', { ascending: false }),
  ])

  if (!room) notFound()

  const totalBudget = projects?.reduce((sum, p) => sum + (p.budget_estimate || 0), 0) ?? 0
  const totalActual = projects?.reduce((sum, p) => sum + (p.actual_cost || 0), 0) ?? 0
  const inProgressCount = projects?.filter(p => p.status === 'in_progress').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <Link href="/renovation" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Renovation
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{room.name}</h1>
            {room.description && <p className="text-stone-500 text-sm mt-0.5">{room.description}</p>}
          </div>
          <ProjectActions mode="add" roomId={room.id} />
        </div>
      </div>

      {/* Stats */}
      {projects && projects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Projects</p>
            <p className="text-xl font-bold text-stone-900">{projects.length}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">In Progress</p>
            <p className="text-xl font-bold text-amber-600">{inProgressCount}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Est. Budget</p>
            <p className="text-xl font-bold text-stone-900">{formatCurrency(totalBudget)}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Actual Cost</p>
            <p className="text-xl font-bold text-stone-900">{formatCurrency(totalActual)}</p>
          </CardContent></Card>
        </div>
      )}

      {!projects?.length ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 mb-3">
              <Wrench className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-1">No projects yet</h3>
            <p className="text-sm text-stone-500 mb-4">Add renovation projects for this room.</p>
            <ProjectActions mode="add" roomId={room.id} />
          </div>
        </Card>
      ) : (
        <ProjectBoard initialProjects={projects as never} roomId={room.id} />
      )}

      {/* Sourcing */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">
            Sourcing {sourcingItems && sourcingItems.length > 0 && `(${sourcingItems.length})`}
          </h2>
          <SourcingActions mode="add" roomId={room.id} userId={user!.id} />
        </div>
        <SourcingBoard initialItems={sourcingItems ?? []} userId={user!.id} />
      </div>
    </div>
  )
}
