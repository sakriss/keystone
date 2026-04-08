'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const CATEGORY_OPTIONS = [
  { value: 'document', label: 'Document' },
  { value: 'payment', label: 'Payment' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'task', label: 'Task' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

interface ClosingItem { id: string; title: string; status: string; [key: string]: unknown }

interface Props {
  mode: 'add' | 'edit' | 'toggle'
  item?: ClosingItem
  properties: { id: string; address: string }[]
}

const DEFAULT_ITEMS = [
  { title: 'Purchase agreement signed', category: 'document' },
  { title: 'Earnest money deposited', category: 'payment' },
  { title: 'Home inspection completed', category: 'appointment' },
  { title: 'Appraisal ordered', category: 'appointment' },
  { title: 'Loan application submitted', category: 'document' },
  { title: 'Title search ordered', category: 'task' },
  { title: 'Homeowner\'s insurance bound', category: 'document' },
  { title: 'Final walkthrough scheduled', category: 'appointment' },
  { title: 'Closing disclosure reviewed', category: 'document' },
  { title: 'Closing funds wired', category: 'payment' },
]

export function ClosingActions({ mode, item, properties }: Props) {
  const [open, setOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const refresh = () => startTransition(() => router.refresh())

  if (mode === 'toggle') {
    const toggleStatus = async () => {
      if (!item) return
      const next = item.status === 'completed' ? 'pending' : 'completed'
      await supabase.from('closing_items').update({ status: next }).eq('id', item.id)
      refresh()
    }
    return (
      <button onClick={toggleStatus} className="text-stone-400 hover:text-amber-600 transition-colors shrink-0">
        {item?.status === 'completed'
          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
          : <Circle className="h-5 w-5" />
        }
      </button>
    )
  }

  if (mode === 'edit') {
    return (
      <>
        <button onClick={() => setOpen(true)} className="text-stone-300 hover:text-stone-600 transition-colors">
          <Edit className="h-4 w-4" />
        </button>
        <Modal open={open} onClose={() => setOpen(false)} title="Edit Item" size="sm">
          <ClosingItemForm
            item={item}
            properties={properties}
            onClose={() => setOpen(false)}
            onSave={async (data) => {
              await supabase.from('closing_items').update(data).eq('id', item!.id)
              setOpen(false)
              refresh()
            }}
            isPending={isPending}
          />
        </Modal>
      </>
    )
  }

  async function addDefaultItems() {
    if (!selectedProperty) return
    const items = DEFAULT_ITEMS.map((item, i) => ({
      property_id: selectedProperty,
      title: item.title,
      category: item.category as 'document' | 'payment' | 'appointment' | 'task',
      status: 'pending' as const,
      sort_order: i,
    }))
    await supabase.from('closing_items').insert(items)
    setBulkOpen(false)
    setOpen(false)
    refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Item</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Closing Item" size="md">
        <div className="space-y-4">
          <Button variant="secondary" className="w-full" onClick={() => { setOpen(false); setBulkOpen(true) }}>
            📋 Load default checklist for a property
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-stone-400">or add one item</span></div>
          </div>
          <ClosingItemForm
            properties={properties}
            onClose={() => setOpen(false)}
            onSave={async (data) => {
              await supabase.from('closing_items').insert(data)
              setOpen(false)
              refresh()
            }}
            isPending={isPending}
          />
        </div>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Load Default Checklist" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">This will add {DEFAULT_ITEMS.length} standard closing items for the selected property.</p>
          <select
            value={selectedProperty}
            onChange={e => setSelectedProperty(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select property…</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={addDefaultItems} disabled={!selectedProperty} loading={isPending}>Load Checklist</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

interface FormProps {
  item?: ClosingItem
  properties: { id: string; address: string }[]
  onClose: () => void
  onSave: (data: Record<string, unknown>) => Promise<void>
  isPending: boolean
}

function ClosingItemForm({ item, properties, onClose, onSave, isPending }: FormProps) {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await onSave({
      property_id: fd.get('property_id'),
      title: fd.get('title'),
      category: fd.get('category') || null,
      status: fd.get('status') || 'pending',
      due_date: (fd.get('due_date') as string) || null,
      amount: fd.get('amount') ? Number(fd.get('amount')) : null,
      notes: (fd.get('notes') as string) || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!item && (
        <select name="property_id" required defaultValue=""
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Select property…</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
      )}
      <Input name="title" label="Title *" placeholder="Sign purchase agreement" required defaultValue={item?.title ?? ''} />
      <div className="grid grid-cols-2 gap-3">
        <Select name="category" label="Category" options={CATEGORY_OPTIONS} defaultValue={(item?.category as string) ?? 'task'} />
        <Select name="status" label="Status" options={STATUS_OPTIONS} defaultValue={item?.status ?? 'pending'} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input name="due_date" type="date" label="Due Date" defaultValue={(item?.due_date as string) ?? ''} />
        <Input name="amount" type="number" label="Amount" defaultValue={(item?.amount as number) ?? ''} />
      </div>
      <Textarea name="notes" label="Notes" rows={2} defaultValue={(item?.notes as string) ?? ''} />
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={isPending}>Save</Button>
      </div>
    </form>
  )
}
