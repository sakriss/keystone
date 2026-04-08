import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    watching: 'Watching',
    visited: 'Visited',
    offer_made: 'Offer Made',
    under_contract: 'Under Contract',
    purchased: 'Purchased',
    passed: 'Passed',
    on_hold: 'On Hold',
    planned: 'Planned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    pending: 'Pending',
    countered: 'Countered',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    scheduled: 'Scheduled',
    wont_fix: "Won't Fix",
    open: 'Open',
    resolved: 'Resolved',
  }
  return labels[status] ?? status
}

export const STATUS_COLORS: Record<string, string> = {
  watching: 'bg-blue-100 text-blue-800',
  visited: 'bg-purple-100 text-purple-800',
  offer_made: 'bg-amber-100 text-amber-800',
  under_contract: 'bg-orange-100 text-orange-800',
  purchased: 'bg-green-100 text-green-800',
  passed: 'bg-gray-100 text-gray-600',
  on_hold: 'bg-gray-100 text-gray-600',
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-green-100 text-green-800',
  open: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  wont_fix: 'bg-gray-100 text-gray-600',
}
