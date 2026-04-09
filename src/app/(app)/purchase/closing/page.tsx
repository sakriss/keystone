import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, statusLabel } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { CalendarCheck, CheckCircle2, Circle } from 'lucide-react'
import { ClosingActions, SeedClosingButton, ToggleClosingItem } from './closing-actions'

const CATEGORY_ICONS: Record<string, string> = {
  document: '📄',
  payment: '💰',
  appointment: '📅',
  task: '✅',
}

export default async function ClosingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, address')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: items } = await supabase
    .from('closing_items')
    .select('*, properties(address)')
    .order('sort_order')
    .order('created_at', { ascending: false })

  type ClosingItem = NonNullable<typeof items>[number]
  type GroupEntry = { address: string; items: ClosingItem[] }
  // Group by property
  const grouped = items?.reduce((acc, item) => {
    const propId = item.property_id
    if (!acc[propId]) {
      acc[propId] = {
        address: (item.properties as { address: string } | null)?.address ?? 'Unknown',
        items: [],
      }
    }
    acc[propId].items.push(item)
    return acc
  }, {} as Record<string, GroupEntry>) ?? {} as Record<string, GroupEntry>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Closing Checklist</h1>
          <p className="text-sm text-stone-500 mt-1">Track documents, payments, and tasks for closing</p>
        </div>
        <ClosingActions mode="add" properties={properties ?? []} />
      </div>

      {!items?.length ? (
        <Card>
          <EmptyState
            icon={CalendarCheck}
            title="No closing items yet"
            description="Start with the default checklist — 28 standard items covering documents, payments, appointments, and tasks. Or add your own."
            action={
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <SeedClosingButton properties={properties ?? []} />
                <span className="text-xs text-stone-400">or</span>
                <ClosingActions mode="add" properties={properties ?? []} />
              </div>
            }
          />
        </Card>
      ) : (
        (Object.entries(grouped) as [string, GroupEntry][]).map(([propId, group]) => {
          const completed = group.items.filter(i => i.status === 'completed').length
          const total = group.items.length
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0

          return (
            <Card key={propId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{group.address}</CardTitle>
                    <p className="text-xs text-stone-500 mt-0.5">{completed}/{total} completed ({pct}%)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {(['document', 'payment', 'appointment', 'task'] as const).map(cat => {
                  const catItems = group.items.filter(i => i.category === cat)
                  if (!catItems.length) return null
                  return (
                    <div key={cat} className="border-t border-stone-100 first:border-t-0">
                      <div className="px-5 py-2 bg-stone-50">
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                          {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}s
                        </p>
                      </div>
                      <ul className="divide-y divide-stone-50">
                        {catItems.map(item => (
                          <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                            <ToggleClosingItem item={item} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${item.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                                {item.title}
                              </p>
                              <div className="flex gap-3 text-xs text-stone-500 flex-wrap">
                                {item.due_date && <span>Due {formatDate(item.due_date)}</span>}
                                {item.amount && <span>{formatCurrency(item.amount)}</span>}
                                {item.notes && <span>{item.notes}</span>}
                              </div>
                            </div>
                            <Badge label={statusLabel(item.status)} status={item.status} />
                            <ClosingActions mode="edit" item={item} properties={properties ?? []} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
