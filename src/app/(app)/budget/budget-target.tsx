'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Target, Pencil, TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface Props {
  target: number | null
  totalMonthly: number
  userId: string
}

export function BudgetTargetCard({ target, totalMonthly, userId }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(target?.toString() ?? '')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const remaining = target != null ? target - totalMonthly : null
  const pct = target != null && target > 0 ? Math.min((totalMonthly / target) * 100, 100) : 0
  const over = target != null && totalMonthly > target

  const barColor = over
    ? 'bg-red-500'
    : pct >= 90
    ? 'bg-amber-500'
    : pct >= 75
    ? 'bg-yellow-400'
    : 'bg-green-500'

  const statusColor = over
    ? 'text-red-600'
    : pct >= 90
    ? 'text-amber-600'
    : 'text-green-600'

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) return

    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, monthly_budget_target: num, updated_at: new Date().toISOString() },
               { onConflict: 'user_id' })

    setOpen(false)
    startTransition(() => router.refresh())
  }

  async function clearTarget() {
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, monthly_budget_target: null, updated_at: new Date().toISOString() },
               { onConflict: 'user_id' })
    setValue('')
    setOpen(false)
    startTransition(() => router.refresh())
  }

  if (target == null) {
    return (
      <>
        <div
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 rounded-xl border-2 border-dashed border-stone-200 px-5 py-4 cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors group"
        >
          <Target className="h-5 w-5 text-stone-300 group-hover:text-amber-500 transition-colors" />
          <div>
            <p className="text-sm font-medium text-stone-500 group-hover:text-amber-700">Set a monthly budget target</p>
            <p className="text-xs text-stone-400">Track how close you are to your limit</p>
          </div>
        </div>
        <TargetModal open={open} onClose={() => setOpen(false)} value={value} setValue={setValue} onSave={saveTarget} isPending={isPending} hasExisting={false} />
      </>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-stone-400" />
            <span className="text-sm font-semibold text-stone-700">Monthly Budget Target</span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-amber-600 transition-colors"
          >
            <Pencil className="h-3 w-3" /> Edit target
          </button>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-stone-400 mb-0.5">Target</p>
            <p className="text-xl font-bold text-stone-900">{formatCurrency(target)}</p>
            <p className="text-xs text-stone-400">per month</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 mb-0.5">Estimated</p>
            <p className={`text-xl font-bold ${statusColor}`}>{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-stone-400">per month</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 mb-0.5">{over ? 'Over by' : 'Remaining'}</p>
            <p className={`text-xl font-bold ${statusColor}`}>
              {remaining != null ? formatCurrency(Math.abs(remaining)) : '—'}
            </p>
            <div className={`flex items-center gap-1 text-xs ${statusColor}`}>
              {over
                ? <><TrendingUp className="h-3 w-3" /> over budget</>
                : remaining === 0
                ? <><Minus className="h-3 w-3" /> exactly on budget</>
                : <><TrendingDown className="h-3 w-3" /> under budget</>
              }
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-stone-400">
            <span>$0</span>
            <span className={`font-medium ${statusColor}`}>{pct.toFixed(0)}% of budget used</span>
            <span>{formatCurrency(target)}</span>
          </div>
          <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {over && (
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-red-200 transition-all duration-500"
                style={{ width: `${Math.min(((totalMonthly - target) / target) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Status message */}
        <p className={`text-xs font-medium ${statusColor}`}>
          {over
            ? `⚠ You're ${formatCurrency(totalMonthly - target)} over your monthly budget.`
            : pct >= 90
            ? `⚡ You're close to your limit — only ${formatCurrency(target - totalMonthly)} left.`
            : pct >= 75
            ? `📊 You've used ${pct.toFixed(0)}% of your budget.`
            : `✓ Looking good — ${formatCurrency(target - totalMonthly)} remaining this month.`
          }
        </p>
      </div>

      <TargetModal
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        setValue={setValue}
        onSave={saveTarget}
        onClear={clearTarget}
        isPending={isPending}
        hasExisting
      />
    </>
  )
}

function TargetModal({ open, onClose, value, setValue, onSave, onClear, isPending, hasExisting }: {
  open: boolean; onClose: () => void; value: string; setValue: (v: string) => void
  onSave: (e: React.FormEvent) => void; onClear?: () => void; isPending: boolean; hasExisting: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title="Monthly Budget Target" size="sm">
      <form onSubmit={onSave} className="flex flex-col gap-4">
        <p className="text-sm text-stone-500">
          Set the maximum you want to spend per month on housing costs. Keystone will track how close your expenses are to this number.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Monthly target ($)</label>
          <input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="e.g. 3500"
            min="1"
            step="any"
            autoComplete="off"
            autoFocus
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex gap-3 justify-between pt-1">
          <div>
            {hasExisting && onClear && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear} className="text-stone-400 hover:text-red-500">
                Remove target
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={isPending} disabled={!value || parseFloat(value) <= 0}>
              Save target
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
