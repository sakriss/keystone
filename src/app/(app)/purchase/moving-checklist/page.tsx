import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils'
import { Truck } from 'lucide-react'
import { AddItemButton, EditItemButton, DeleteItemButton, ToggleItemButton, SeedChecklistButton } from './checklist-actions'

const CATEGORIES = [
  { key: 'before', label: 'Before the Move' },
  { key: 'day_of', label: 'Day Of' },
  { key: 'after', label: 'After the Move' },
  { key: 'admin', label: 'Admin & Paperwork' },
] as const

export default async function MovingChecklistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: items }, { data: properties }] = await Promise.all([
    supabase
      .from('moving_checklist_items')
      .select('*, properties(address)')
      .eq('user_id', user!.id)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('properties')
      .select('id, address')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  const total = items?.length ?? 0
  const completed = items?.filter(i => i.is_completed).length ?? 0
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  type Item = NonNullable<typeof items>[number]
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = (items ?? []).filter(i => i.category === cat.key)
    return acc
  }, {} as Record<string, Item[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Moving Checklist</h1>
          <p className="text-sm text-stone-500 mt-1">Everything you need to do before, during, and after your move.</p>
        </div>
        <AddItemButton properties={properties ?? []} userId={user!.id} />
      </div>

      {/* Progress */}
      {total > 0 && (
        <Card>
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-stone-700">{completed} of {total} tasks complete</p>
              <p className="text-sm font-bold text-stone-900">{pct}%</p>
            </div>
            <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {pct === 100 && (
              <p className="text-sm text-green-700 font-medium mt-2 text-center">You&apos;re all packed and ready!</p>
            )}
          </CardContent>
        </Card>
      )}

      {total === 0 ? (
        <Card>
          <EmptyState
            icon={Truck}
            title="No checklist items yet"
            description="Load the default checklist to get started with 25+ common moving tasks, or add your own."
            action={
              <div className="flex gap-3 justify-center flex-wrap">
                <SeedChecklistButton userId={user!.id} />
                <AddItemButton properties={properties ?? []} userId={user!.id} />
              </div>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {CATEGORIES.map(cat => {
            const catItems = byCategory[cat.key]
            if (catItems.length === 0) return null
            const catCompleted = catItems.filter(i => i.is_completed).length
            return (
              <Card key={cat.key}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{cat.label}</CardTitle>
                    <span className="text-xs text-stone-500">{catCompleted}/{catItems.length} done</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-stone-100">
                    {catItems.map(item => (
                      <li key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50">
                        <ToggleItemButton item={item} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${item.is_completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                            {item.title}
                          </p>
                          {item.due_date && (
                            <p className="text-xs text-stone-400 mt-0.5">Due {formatDate(item.due_date)}</p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-stone-400 mt-0.5">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <EditItemButton item={item} properties={properties ?? []} userId={user!.id} />
                          <DeleteItemButton itemId={item.id} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
