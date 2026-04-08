'use client'
import { cn, STATUS_COLORS } from '@/lib/utils'

interface BadgeProps {
  label: string
  status?: string
  className?: string
  variant?: 'default' | 'outline'
}

export function Badge({ label, status, className, variant = 'default' }: BadgeProps) {
  const colorClass = status ? (STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700') : 'bg-stone-100 text-stone-700'
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      variant === 'outline' ? 'border border-current bg-transparent' : colorClass,
      className
    )}>
      {label}
    </span>
  )
}
