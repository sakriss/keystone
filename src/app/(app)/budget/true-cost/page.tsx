import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { calculateMonthlyPI } from '@/lib/mortgage'
import { ArrowLeft, Home, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function toMonthly(item: { estimated_monthly: number; frequency: string }) {
  if (item.frequency === 'annual') return item.estimated_monthly / 12
  if (item.frequency === 'one_time') return 0
  return item.estimated_monthly
}

const BAR_COLORS = [
  'bg-amber-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
]

export default async function TrueCostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: budgetItems },
    { data: preApprovals },
    { data: settings },
  ] = await Promise.all([
    supabase.from('budget_items').select('*').eq('user_id', user!.id).order('sort_order').order('created_at', { ascending: false }),
    supabase.from('pre_approvals').select('amount, interest_rate, loan_type, lender_name').eq('user_id', user!.id).order('created_at', { ascending: false }),
    supabase.from('user_settings').select('monthly_budget_target').eq('user_id', user!.id).maybeSingle(),
  ])

  const latestApproval = preApprovals?.[0] ?? null

  // Mortgage P&I estimate
  const mortgagePandI = latestApproval?.amount && latestApproval?.interest_rate
    ? calculateMonthlyPI(latestApproval.amount, latestApproval.interest_rate, 30)
    : null

  // Budget items total — if we have a P&I from pre-approval, exclude manually-entered
  // Mortgage category items to avoid double-counting.
  type BudgetItem = NonNullable<typeof budgetItems>[number]
  const excludedMortgageItems = mortgagePandI
    ? (budgetItems ?? []).filter(i => i.category === 'Mortgage')
    : []
  const filteredItems = mortgagePandI
    ? (budgetItems ?? []).filter(i => i.category !== 'Mortgage')
    : (budgetItems ?? [])

  const budgetMonthly = filteredItems.reduce((sum, item) => sum + toMonthly(item), 0)

  // Group budget items by category (mortgage excluded if P&I is shown)
  const byCategory = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, BudgetItem[]>)

  const grandTotal = (mortgagePandI ?? 0) + budgetMonthly
  const target = settings?.monthly_budget_target ?? null

  // Budget status — drives card colors throughout
  const budgetStatus: 'over' | 'under' | 'none' = !target ? 'none' : grandTotal > target ? 'over' : 'under'

  const statusCard = {
    over:  { card: 'border-red-300 bg-red-50',   label: 'text-red-700',  total: 'text-red-900',  annual: 'text-red-500',  targetLabel: 'text-red-700',  targetAmt: 'text-red-900',  diff: 'text-red-700 font-semibold' },
    under: { card: 'border-green-300 bg-green-50', label: 'text-green-700', total: 'text-green-900', annual: 'text-green-600', targetLabel: 'text-green-700', targetAmt: 'text-green-900', diff: 'text-green-700 font-semibold' },
    none:  { card: 'border-amber-200 bg-amber-50', label: 'text-amber-700', total: 'text-amber-900', annual: 'text-amber-600', targetLabel: 'text-amber-700', targetAmt: 'text-amber-900', diff: '' },
  }[budgetStatus]

  // Build breakdown for bar chart
  const breakdown: { label: string; value: number }[] = []
  if (mortgagePandI) breakdown.push({ label: 'Mortgage P&I', value: mortgagePandI })
  Object.entries(byCategory).forEach(([cat, items]) => {
    const total = (items as BudgetItem[]).reduce((s, i) => s + toMonthly(i), 0)
    if (total > 0) breakdown.push({ label: cat, value: total })
  })
  const breakdownTotal = breakdown.reduce((s, b) => s + b.value, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/budget" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Budget & Finance
        </Link>
        <h1 className="text-2xl font-bold text-stone-900">True Cost of Ownership</h1>
        <p className="text-sm text-stone-500 mt-1">Your full monthly picture — mortgage, taxes, insurance, utilities, and more.</p>
      </div>

      {/* Grand total card */}
      <Card className={statusCard.card}>
        <CardContent className="py-5 px-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className={`text-sm font-medium ${statusCard.label}`}>Estimated Monthly Total</p>
              <p className={`text-4xl font-black mt-1 ${statusCard.total}`}>{formatCurrency(grandTotal)}</p>
              <p className={`text-xs mt-1 ${statusCard.annual}`}>{formatCurrency(grandTotal * 12)} per year</p>
            </div>
            {target && (
              <div className="text-right">
                <p className={`text-xs font-medium ${statusCard.targetLabel}`}>Monthly Budget Target</p>
                <p className={`text-2xl font-bold ${statusCard.targetAmt}`}>{formatCurrency(target)}</p>
                {budgetStatus === 'over' ? (
                  <p className="text-sm text-red-700 font-bold mt-1">⚠ {formatCurrency(grandTotal - target)} over budget</p>
                ) : (
                  <p className="text-sm text-green-700 font-bold mt-1">✓ {formatCurrency(target - grandTotal)} under budget</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mortgage section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-stone-500" />
              <CardTitle>Mortgage (P&amp;I)</CardTitle>
            </div>
            {mortgagePandI && (
              <span className="text-sm font-semibold text-stone-700">{formatCurrency(mortgagePandI)}/mo</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!latestApproval ? (
            <div className="flex items-start gap-3 bg-stone-50 rounded-lg p-4">
              <AlertCircle className="h-4 w-4 text-stone-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-stone-600">No pre-approval on file.</p>
                <Link href="/purchase/pre-approvals" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                  Add a pre-approval →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-500">Approval Amount</p>
                  <p className="font-bold text-stone-900">{formatCurrency(latestApproval.amount)}</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-500">Interest Rate</p>
                  <p className="font-bold text-stone-900">{latestApproval.interest_rate}%</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-500">Loan Type</p>
                  <p className="font-bold text-stone-900">{latestApproval.loan_type ?? '30-yr Fixed'}</p>
                </div>
                <div className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-500">Lender</p>
                  <p className="font-bold text-stone-900 truncate">{latestApproval.lender_name}</p>
                </div>
              </div>
              <p className="text-xs text-stone-400">
                Estimated on 30-year term. Does not include taxes, insurance, or PMI. Actual payment may vary.{' '}
                <Link href="/budget/scenarios" className="text-amber-600 hover:underline">Model different scenarios →</Link>
              </p>
              {excludedMortgageItems.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Your manual mortgage expense{excludedMortgageItems.length > 1 ? 's' : ''} (
                    {excludedMortgageItems.map(i => i.name).join(', ')}
                    ) {excludedMortgageItems.length > 1 ? 'are' : 'is'} excluded from the total below to avoid double-counting.{' '}
                    <Link href="/budget" className="underline">Edit in Budget →</Link>
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget items */}
      {budgetItems && budgetItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-stone-900">Monthly Expenses</h2>
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
                      {catItems.map(item => (
                        <tr key={item.id}>
                          <td className="px-5 py-3 text-stone-800">{item.name}</td>
                          <td className="px-5 py-3 text-stone-500 text-right">
                            {item.frequency === 'one_time'
                              ? `${formatCurrency(item.estimated_monthly)} once`
                              : item.frequency === 'annual'
                              ? `${formatCurrency(item.estimated_monthly)}/yr`
                              : `${formatCurrency(item.estimated_monthly)}/mo`}
                          </td>
                          <td className="px-5 py-3 text-xs text-stone-400 text-right">
                            {item.frequency !== 'one_time' && `(${formatCurrency(toMonthly(item))}/mo)`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Full breakdown bar */}
      {breakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Full Monthly Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {breakdown.map((item, i) => {
              const pct = breakdownTotal > 0 ? (item.value / breakdownTotal) * 100 : 0
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-28 text-right text-xs text-stone-500 shrink-0">{item.label}</div>
                  <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-stone-600 w-24 text-right shrink-0">{formatCurrency(item.value)}/mo</div>
                </div>
              )
            })}
            <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
              <div className="w-28 text-right text-xs font-bold text-stone-700 shrink-0">Total</div>
              <div className="flex-1">
                {target && (
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${budgetStatus === 'over' ? 'bg-red-500' : budgetStatus === 'under' ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min((grandTotal / target) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div className={`text-sm font-bold w-24 text-right shrink-0 ${budgetStatus === 'over' ? 'text-red-700' : budgetStatus === 'under' ? 'text-green-700' : 'text-stone-900'}`}>
                {formatCurrency(grandTotal)}/mo
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!latestApproval && !budgetItems?.length && (
        <Card>
          <CardContent className="py-10 text-center space-y-2">
            <p className="text-stone-500">Nothing to show yet.</p>
            <p className="text-sm text-stone-400">
              Add a <Link href="/purchase/pre-approvals" className="text-amber-600 hover:underline">pre-approval</Link> and{' '}
              <Link href="/budget" className="text-amber-600 hover:underline">budget items</Link> to see your full monthly picture.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
