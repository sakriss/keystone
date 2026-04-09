'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, CheckCircle2, Circle } from 'lucide-react'
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

// ── Standalone toggle button with optimistic state ──────────────────────────
export function ToggleClosingItem({ item }: { item: ClosingItem }) {
  const [completed, setCompleted] = useState(item.status === 'completed')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleToggle() {
    const next = !completed
    setCompleted(next)          // instant visual update
    setLoading(true)
    await supabase
      .from('closing_items')
      .update({ status: next ? 'completed' : 'pending' })
      .eq('id', item.id)
    setLoading(false)
    router.refresh()            // sync server state in background
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="text-stone-400 hover:text-amber-600 transition-colors shrink-0 disabled:opacity-50"
    >
      {completed
        ? <CheckCircle2 className="h-5 w-5 text-green-500" />
        : <Circle className="h-5 w-5" />
      }
    </button>
  )
}

interface Props {
  mode: 'add' | 'edit'
  item?: ClosingItem
  properties: { id: string; address: string }[]
}

const DEFAULT_ITEMS: { title: string; category: 'document' | 'payment' | 'appointment' | 'task' }[] = [
  // Documents
  { title: 'Purchase agreement signed by all parties', category: 'document' },
  { title: 'Loan application submitted to lender', category: 'document' },
  { title: 'Earnest money receipt obtained', category: 'document' },
  { title: 'Home inspection report received', category: 'document' },
  { title: 'Appraisal report received', category: 'document' },
  { title: 'Title commitment / title search results reviewed', category: 'document' },
  { title: "Homeowner's insurance policy binder obtained", category: 'document' },
  { title: 'Closing disclosure (CD) reviewed — 3 days before closing', category: 'document' },
  { title: 'Final loan approval / clear to close received', category: 'document' },
  { title: 'HOA documents reviewed (if applicable)', category: 'document' },
  // Payments
  { title: 'Earnest money deposited to escrow', category: 'payment' },
  { title: 'Appraisal fee paid', category: 'payment' },
  { title: 'Home inspection fee paid', category: 'payment' },
  { title: 'Down payment wired to escrow', category: 'payment' },
  { title: 'Closing costs confirmed and wired', category: 'payment' },
  // Appointments
  { title: 'Home inspection scheduled', category: 'appointment' },
  { title: 'Appraisal appointment confirmed', category: 'appointment' },
  { title: 'Final walkthrough scheduled', category: 'appointment' },
  { title: 'Closing date / signing appointment confirmed', category: 'appointment' },
  // Tasks
  { title: 'Interest rate locked with lender', category: 'task' },
  { title: 'Seller repair requests submitted (post-inspection)', category: 'task' },
  { title: 'Title insurance confirmed (owner\'s policy)', category: 'task' },
  { title: 'Review title report for any liens or issues', category: 'task' },
  { title: 'Confirm closing attorney or escrow officer', category: 'task' },
  { title: 'Arrange transfer of utilities to your name', category: 'task' },
  { title: 'Obtain cashier\'s check or confirm wire instructions', category: 'task' },
  { title: 'Collect all keys, fobs, and garage openers at closing', category: 'task' },
]

export function ClosingActions({ mode, item, properties }: Props) {
  const [open, setOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

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
              const { error } = await supabase.from('closing_items').update(data).eq('id', item!.id)
              if (error) throw new Error(error.message)
              setOpen(false)
              router.refresh()
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
      category: item.category,
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
        <ClosingItemForm
          properties={properties}
          onClose={() => setOpen(false)}
          onSave={async (data) => {
            const { error } = await supabase.from('closing_items').insert(data)
            if (error) throw new Error(error.message)
            setOpen(false)
            router.refresh()
          }}
          isPending={isPending}
        />
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Load Default Checklist" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Adds {DEFAULT_ITEMS.length} standard closing items across Documents, Payments, Appointments, and Tasks.
          </p>
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

export function SeedClosingButton({ properties }: { properties: { id: string; address: string }[] }) {
  const [open, setOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(properties.length === 1 ? properties[0].id : '')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const refresh = () => startTransition(() => router.refresh())

  async function handleSeed() {
    if (!selectedProperty) return
    const items = DEFAULT_ITEMS.map((item, i) => ({
      property_id: selectedProperty,
      title: item.title,
      category: item.category,
      status: 'pending' as const,
      sort_order: i,
    }))
    await supabase.from('closing_items').insert(items)
    setOpen(false)
    refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Load Default Checklist
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Load Default Checklist" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Adds {DEFAULT_ITEMS.length} standard closing items across Documents, Payments, Appointments, and Tasks. You can edit or remove any item after loading.
          </p>
          {properties.length !== 1 && (
            <select
              value={selectedProperty}
              onChange={e => setSelectedProperty(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Select property…</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          )}
          {properties.length === 1 && (
            <p className="text-sm font-medium text-stone-700 bg-stone-50 rounded-lg px-3 py-2">
              {properties[0].address}
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSeed} disabled={!selectedProperty} loading={isPending}>Load Checklist</Button>
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
  const [propertyId, setPropertyId] = useState(item ? '' : '')
  const [title, setTitle] = useState(item?.title ?? '')
  const [category, setCategory] = useState((item?.category as string) ?? 'task')
  const [status, setStatus] = useState(item?.status ?? 'pending')
  const [dueDate, setDueDate] = useState((item?.due_date as string) ?? '')
  const [amount, setAmount] = useState((item?.amount as number | string) ?? '')
  const [notes, setNotes] = useState((item?.notes as string) ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({
        ...(!item && propertyId ? { property_id: propertyId } : {}),
        title,
        category: category || null,
        status: status || 'pending',
        due_date: dueDate || null,
        amount: amount !== '' ? Number(amount) : null,
        notes: notes || null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!item && (
        <select
          required
          value={propertyId}
          onChange={e => setPropertyId(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Select property…</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
      )}
      <Input
        label="Title *"
        placeholder="Sign purchase agreement"
        required
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={e => setCategory(e.target.value)}
        />
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={e => setStatus(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          label="Due Date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
        />
        <Input
          type="number"
          label="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
      </div>
      <Textarea
        label="Notes"
        rows={2}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={saving || isPending}>Save</Button>
      </div>
    </form>
  )
}
