import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate, statusLabel, STATUS_COLORS } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'
import { AddTaskButton, EditTaskButton, DeleteTaskButton, MarkDoneButton } from './maintenance-actions'

const CATEGORY_ICONS: Record<string, string> = {
  HVAC: '❄️', Plumbing: '🚰', Electrical: '⚡', Exterior: '🏠', Interior: '🛋️',
  Appliances: '🔧', Landscaping: '🌿', Safety: '🔒', Seasonal: '🍂', General: '📋',
}

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: tasks }, { data: properties }] = await Promise.all([
    supabase
      .from('maintenance_tasks')
      .select('*, properties(address)')
      .eq('user_id', user!.id)
      .order('next_due_at', { ascending: true, nullsFirst: false })
      .order('sort_order'),
    supabase
      .from('properties')
      .select('id, address')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  const today = new Date()
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  type Task = NonNullable<typeof tasks>[number]

  // Stats
  const overdueCount = tasks?.filter(t => t.status === 'overdue').length ?? 0
  const dueThisMonthCount = tasks?.filter(t => {
    if (!t.next_due_at || t.status === 'done') return false
    const d = new Date(t.next_due_at)
    return d >= today && d <= thisMonthEnd
  }).length ?? 0
  const upcomingCount = tasks?.filter(t => t.status === 'upcoming').length ?? 0
  const doneCount = tasks?.filter(t => t.status === 'done').length ?? 0

  const recurrenceLabel: Record<string, string> = {
    weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly',
    semi_annual: 'Semi-Annual', annual: 'Annual', one_time: 'One-Time',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Maintenance Calendar</h1>
          <p className="text-sm text-stone-500 mt-1">Track recurring home maintenance tasks and stay ahead of repairs.</p>
        </div>
        <AddTaskButton properties={properties ?? []} userId={user!.id} />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Overdue</p>
            <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-stone-400'}`}>{overdueCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Due This Month</p>
            <p className={`text-2xl font-bold ${dueThisMonthCount > 0 ? 'text-amber-600' : 'text-stone-400'}`}>{dueThisMonthCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Upcoming</p>
            <p className="text-2xl font-bold text-stone-700">{upcomingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{doneCount}</p>
          </CardContent>
        </Card>
      </div>

      {!tasks?.length ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title="No maintenance tasks yet"
            description="Add recurring tasks like HVAC filter changes, gutter cleaning, and smoke detector checks to stay on top of home maintenance."
            action={<AddTaskButton properties={properties ?? []} userId={user!.id} />}
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {(tasks as Task[]).map(task => {
            const prop = task.properties as { address: string } | null
            const isDone = task.status === 'done'
            const isOverdue = task.status === 'overdue'
            return (
              <Card key={task.id} className={isDone ? 'opacity-60' : isOverdue ? 'border-red-200' : ''}>
                <CardContent className="py-3 px-5">
                  <div className="flex items-start gap-3">
                    {/* Category icon */}
                    <span className="text-xl flex-shrink-0 mt-0.5">{CATEGORY_ICONS[task.category] ?? '📋'}</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className={`font-medium text-stone-900 ${isDone ? 'line-through text-stone-400' : ''}`}>{task.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge label={task.category} status={task.category.toLowerCase()} className="text-xs bg-stone-100 text-stone-600" />
                            <span className="text-xs text-stone-400">{recurrenceLabel[task.recurrence]}</span>
                            {prop && <span className="text-xs text-stone-400">· {prop.address}</span>}
                            {task.estimated_cost && <span className="text-xs text-stone-400">· {formatCurrency(task.estimated_cost)}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <MarkDoneButton task={task} />
                          <EditTaskButton task={task} properties={properties ?? []} userId={user!.id} />
                          <DeleteTaskButton taskId={task.id} />
                        </div>
                      </div>

                      {/* Due date row */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {task.next_due_at && !isDone && (
                          <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-stone-500'}`}>
                            {isOverdue ? '⚠ Overdue — ' : 'Next: '}
                            {formatDate(task.next_due_at)}
                          </span>
                        )}
                        {task.last_done_at && (
                          <span className="text-xs text-stone-400">Last done: {formatDate(task.last_done_at)}</span>
                        )}
                        {isDone && task.recurrence === 'one_time' && (
                          <Badge label="Done" status="done" className={`text-xs ${STATUS_COLORS['done']}`} />
                        )}
                      </div>

                      {task.notes && (
                        <p className="text-xs text-stone-400 mt-1">{task.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
