import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { DollarSign } from 'lucide-react'
import { BudgetActions } from './budget-actions'
import { BudgetTargetCard } from './budget-target'

const CATEGORIES = [
  'Mortgage',
  'Property Tax',
  'HOA',
  'Insurance',
  'Electricity',
  'Gas',
  'Water/Sewer',
  'Internet/TV',
  'Trash',
  'Maintenance',
  'Other',
]

function toMonthly(item: { estimated_monthly: number; frequency: string }) {
  if (item.frequency === 'annual') return item.estimated_monthly / 12
  if (item.frequency === 'one_time') return 0
  return item.estimated_monthly
}

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: items }, { data: settings }] = await Promise.all([
    supabase
      .from('budget_items')
      .select('*')
      .eq('user_id', user!.id)
      .order('sort_order')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_settings')
      .select('monthly_budget_target')
      .eq('user_id', user!.id)
      .maybeSingle(),
  ])

  // Group by category
  type BudgetItem = NonNullable<typeof items>[number]
  const byCategory = items?.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, BudgetItem[]>) ?? {} as Record<string, BudgetItem[]>

  const totalMonthly = items?.reduce((sum, item) => sum + toMonthly(item), 0) ?? 0
  const totalAnnual = totalMonthly * 12

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Budget & Finance</h1>
          <p className="text-sm text-stone-500 mt-1">Estimate your monthly cost of ownership</p>
        </div>
        <BudgetActions mode="add" categories={CATEGORIES} />
      </div>

      {/* Budget target */}
      <BudgetTargetCard
        target={settings?.monthly_budget_target ?? null}
        totalMonthly={totalMonthly}
        userId={user!.id}
      />

      {/* Summary cards */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="py-4 px-5">
              <p className="text-xs text-stone-500">Est. Monthly Total</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">{formatCurrency(totalMonthly)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 px-5">
              <p className="text-xs text-stone-500">Est. Annual Total</p>
              <p className="text-2xl font-bold text-stone-900 mt-1">{formatCurrency(totalAnnual)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!items?.length ? (
        <Card>
          <EmptyState
            icon={DollarSign}
            title="No budget items yet"
            description="Add your estimated mortgage, utilities, and other monthly expenses to see your total cost of ownership."
            action={<BudgetActions mode="add" categories={CATEGORIES} />}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {(Object.entries(byCategory) as [string, BudgetItem[]][]).map(([category, catItems]) => {
            const catMonthly = catItems.reduce((sum, item) => sum + toMonthly(item), 0)
            return (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{category}</CardTitle>
                    <span className="text-sm font-semibold text-stone-700">{formatCurrency(catMonthly)}/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-stone-100">
                      {catItems!.map(item => (
                        <tr key={item.id} className="hover:bg-stone-50">
                          <td className="px-5 py-3 text-stone-800">{item.name}</td>
                          <td className="px-5 py-3 text-stone-500 text-right">
                            {item.frequency === 'one_time'
                              ? `${formatCurrency(item.estimated_monthly)} once`
                              : item.frequency === 'annual'
                              ? `${formatCurrency(item.estimated_monthly)}/yr`
                              : `${formatCurrency(item.estimated_monthly)}/mo`
                            }
                          </td>
                          <td className="px-5 py-3 text-stone-500 text-right">
                            {item.frequency !== 'one_time' && (
                              <span className="text-xs text-stone-400">
                                ({formatCurrency(toMonthly(item))}/mo)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <BudgetActions mode="edit" item={item} categories={CATEGORIES} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )
          })}

          {/* Breakdown bar */}
          <Card>
            <CardHeader><CardTitle>Spending Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(Object.entries(byCategory) as [string, BudgetItem[]][]).map(([category, catItems]) => {
                const catMonthly = catItems.reduce((sum, item) => sum + toMonthly(item), 0)
                const pct = totalMonthly > 0 ? (catMonthly / totalMonthly) * 100 : 0
                const colors = ['bg-amber-500','bg-blue-500','bg-green-500','bg-purple-500','bg-red-500','bg-pink-500','bg-indigo-500','bg-yellow-500','bg-teal-500']
                const colorIdx = Object.keys(byCategory).indexOf(category) % colors.length
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="w-24 text-right text-xs text-stone-500 shrink-0">{category}</div>
                    <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[colorIdx]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-stone-600 w-20 text-right shrink-0">{formatCurrency(catMonthly)}/mo</div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
