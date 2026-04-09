import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  property: { status: string }
  hasPreApproval: boolean
  visitCount: number
  offerCount: number
  hasCompletedInspection: boolean
}

interface Milestone {
  label: string
  sublabel: string
  complete: boolean
}

export function HomeBuyingProgress({ property, hasPreApproval, visitCount, offerCount, hasCompletedInspection }: Props) {
  const isPurchased = property.status === 'purchased'
  const isUnderContract = property.status === 'under_contract' || isPurchased

  const milestones: Milestone[] = [
    { label: 'Property Found', sublabel: 'Saved', complete: true },
    { label: 'Pre-Approved', sublabel: 'Financing', complete: hasPreApproval },
    { label: 'Visited', sublabel: 'Toured', complete: visitCount > 0 },
    { label: 'Offer In', sublabel: 'Submitted', complete: offerCount > 0 },
    { label: 'Inspection', sublabel: 'Completed', complete: hasCompletedInspection },
    { label: 'Under Contract', sublabel: 'Accepted', complete: isUnderContract },
    { label: 'Closed', sublabel: 'Keys in hand', complete: isPurchased },
  ]

  // Find the current active step (first incomplete)
  const currentIndex = milestones.findIndex(m => !m.complete)
  const allComplete = currentIndex === -1

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Buying Journey</p>

      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-start">
        {milestones.map((milestone, i) => {
          const isComplete = milestone.complete
          const isCurrent = !allComplete && i === currentIndex

          return (
            <div key={i} className="flex-1 flex flex-col items-center relative">
              {/* Connector line (not on first item) */}
              {i > 0 && (
                <div className={cn(
                  'absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2',
                  milestones[i - 1].complete ? 'bg-amber-400' : 'bg-stone-200'
                )} />
              )}

              {/* Node */}
              <div className={cn(
                'relative z-10 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                isComplete
                  ? 'bg-amber-500 text-white'
                  : isCurrent
                  ? 'bg-white border-2 border-amber-500 ring-4 ring-amber-100'
                  : 'bg-stone-100 border border-stone-200'
              )}>
                {isComplete
                  ? <Check className="h-4 w-4" strokeWidth={2.5} />
                  : <span className={cn('text-xs font-bold', isCurrent ? 'text-amber-600' : 'text-stone-400')}>{i + 1}</span>
                }
              </div>

              {/* Label */}
              <div className="mt-2 text-center px-1">
                <p className={cn('text-xs font-semibold leading-tight', isComplete ? 'text-stone-800' : isCurrent ? 'text-amber-700' : 'text-stone-400')}>
                  {milestone.label}
                </p>
                <p className={cn('text-xs mt-0.5 leading-tight', isComplete ? 'text-stone-400' : 'text-stone-300')}>
                  {milestone.sublabel}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: compact list */}
      <div className="flex sm:hidden flex-col gap-2">
        {milestones.map((milestone, i) => {
          const isComplete = milestone.complete
          const isCurrent = !allComplete && i === currentIndex
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0',
                isComplete ? 'bg-amber-500 text-white' : isCurrent ? 'bg-white border-2 border-amber-500' : 'bg-stone-100 border border-stone-200'
              )}>
                {isComplete
                  ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  : <span className={cn('text-xs font-bold', isCurrent ? 'text-amber-600' : 'text-stone-300')}>{i + 1}</span>
                }
              </div>
              <span className={cn('text-sm', isComplete ? 'text-stone-700' : isCurrent ? 'text-amber-700 font-medium' : 'text-stone-300')}>
                {milestone.label}
              </span>
            </div>
          )
        })}
      </div>

      {allComplete && (
        <p className="text-center text-sm font-semibold text-amber-600 mt-3">Congratulations on your new home!</p>
      )}
    </div>
  )
}
