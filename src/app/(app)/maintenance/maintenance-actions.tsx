'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type MaintenanceTask = Database['public']['Tables']['maintenance_tasks']['Row']
type Property = { id: string; address: string }

const CATEGORY_OPTIONS = [
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Exterior', label: 'Exterior' },
  { value: 'Interior', label: 'Interior' },
  { value: 'Appliances', label: 'Appliances' },
  { value: 'Landscaping', label: 'Landscaping' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Seasonal', label: 'Seasonal' },
  { value: 'General', label: 'General' },
]

const RECURRENCE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (every 3 months)' },
  { value: 'semi_annual', label: 'Semi-Annual (every 6 months)' },
  { value: 'annual', label: 'Annual' },
  { value: 'one_time', label: 'One-Time' },
]

const MONTH_OPTIONS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
]

function computeNextDue(recurrence: string, lastDone?: string | null, dueMonth?: number | null, dueDate?: string | null): string | null {
  const today = new Date()

  if (recurrence === 'one_time') {
    return dueDate ?? null
  }

  const base = lastDone ? new Date(lastDone) : today

  const intervalDays: Record<string, number> = {
    weekly: 7,
    monthly: 30,
    quarterly: 91,
    semi_annual: 182,
    annual: 365,
  }

  if (lastDone) {
    const next = new Date(base)
    next.setDate(next.getDate() + (intervalDays[recurrence] ?? 365))
    return next.toISOString().split('T')[0]
  }

  // No last done — use due_month if set, otherwise today + interval
  if (dueMonth) {
    const year = today.getMonth() + 1 >= dueMonth ? today.getFullYear() + 1 : today.getFullYear()
    return `${year}-${String(dueMonth).padStart(2, '0')}-01`
  }

  const next = new Date(today)
  next.setDate(next.getDate() + (intervalDays[recurrence] ?? 365))
  return next.toISOString().split('T')[0]
}

interface FormModalProps {
  mode: 'add' | 'edit'
  task?: MaintenanceTask
  properties: Property[]
  userId: string
}

function FormModal({ mode, task, properties, userId }: FormModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [recurrence, setRecurrence] = useState(task?.recurrence ?? 'annual')
  const supabase = createClient()

  const propertyOptions = [
    { value: '', label: 'No specific property' },
    ...properties.map(p => ({ value: p.id, label: p.address })),
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const rec = fd.get('recurrence') as string
    const lastDone = fd.get('last_done_at') as string || null
    const dueMonth = fd.get('due_month') ? Number(fd.get('due_month')) : null
    const dueDate = fd.get('due_date') as string || null
    const nextDue = computeNextDue(rec, lastDone, dueMonth, dueDate)

    const data = {
      user_id: userId,
      title: fd.get('title') as string,
      category: fd.get('category') as string,
      recurrence: rec,
      description: fd.get('description') as string || null,
      due_month: dueMonth,
      due_date: dueDate,
      last_done_at: lastDone,
      next_due_at: nextDue,
      estimated_cost: fd.get('estimated_cost') ? Number(fd.get('estimated_cost')) : null,
      property_id: fd.get('property_id') as string || null,
      notes: fd.get('notes') as string || null,
      status: 'upcoming' as const,
    }

    startTransition(async () => {
      if (mode === 'add') {
        await supabase.from('maintenance_tasks').insert(data)
      } else if (task) {
        await supabase.from('maintenance_tasks').update(data).eq('id', task.id)
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      {mode === 'add' ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      ) : (
        <button onClick={() => setOpen(true)} className="text-stone-400 hover:text-stone-600 p-1">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'add' ? 'Add Maintenance Task' : 'Edit Task'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="title" label="Task Name" defaultValue={task?.title} required placeholder="e.g. Replace HVAC filter" />

          <div className="grid grid-cols-2 gap-3">
            <Select name="category" label="Category" defaultValue={task?.category ?? 'General'} options={CATEGORY_OPTIONS} />
            <Select
              name="recurrence"
              label="Recurrence"
              defaultValue={task?.recurrence ?? 'annual'}
              options={RECURRENCE_OPTIONS}
              onChange={e => setRecurrence(e.target.value)}
            />
          </div>

          <Input name="description" label="Description (optional)" defaultValue={task?.description ?? ''} placeholder="Short description" />

          {recurrence !== 'one_time' && (
            <Select name="due_month" label="Typical Month (optional)" defaultValue={String(task?.due_month ?? '')} options={[{ value: '', label: 'Not specified' }, ...MONTH_OPTIONS]} />
          )}

          {recurrence === 'one_time' && (
            <Input name="due_date" label="Due Date" type="date" defaultValue={task?.due_date ?? ''} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input name="last_done_at" label="Last Completed" type="date" defaultValue={task?.last_done_at ?? ''} />
            <Input name="estimated_cost" label="Est. Cost ($)" type="number" defaultValue={task?.estimated_cost ?? ''} min={0} />
          </div>

          <Select name="property_id" label="Property (optional)" defaultValue={task?.property_id ?? ''} options={propertyOptions} />

          <Input name="notes" label="Notes" defaultValue={task?.notes ?? ''} placeholder="Any additional notes" />

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>{mode === 'add' ? 'Add Task' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

interface DeleteButtonProps {
  taskId: string
}

export function DeleteTaskButton({ taskId }: DeleteButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  function handleDelete() {
    if (!confirm('Delete this task?')) return
    startTransition(async () => {
      await supabase.from('maintenance_tasks').delete().eq('id', taskId)
      router.refresh()
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} className="text-stone-400 hover:text-red-500 p-1">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

interface MarkDoneButtonProps {
  task: MaintenanceTask
}

export function MarkDoneButton({ task }: MarkDoneButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  function handleMarkDone() {
    const today = new Date().toISOString().split('T')[0]
    const nextDue = computeNextDue(task.recurrence, today, task.due_month, task.due_date)
    const status = task.recurrence === 'one_time' ? 'done' : 'upcoming'

    startTransition(async () => {
      await supabase.from('maintenance_tasks').update({
        last_done_at: today,
        next_due_at: nextDue,
        status,
      }).eq('id', task.id)
      router.refresh()
    })
  }

  if (task.status === 'done') return null

  return (
    <button
      onClick={handleMarkDone}
      disabled={isPending}
      className="text-xs flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium"
    >
      <Check className="h-3 w-3" /> Mark Done
    </button>
  )
}

export function AddTaskButton({ properties, userId }: { properties: Property[]; userId: string }) {
  return <FormModal mode="add" properties={properties} userId={userId} />
}

export function EditTaskButton({ task, properties, userId }: { task: MaintenanceTask; properties: Property[]; userId: string }) {
  return <FormModal mode="edit" task={task} properties={properties} userId={userId} />
}
