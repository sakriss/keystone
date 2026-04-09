'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type ChecklistItem = Database['public']['Tables']['moving_checklist_items']['Row']
type Property = { id: string; address: string }

const CATEGORY_OPTIONS = [
  { value: 'before', label: 'Before the Move' },
  { value: 'day_of', label: 'Day Of' },
  { value: 'after', label: 'After the Move' },
  { value: 'admin', label: 'Admin & Paperwork' },
]

const DEFAULT_ITEMS: Omit<ChecklistItem, 'id' | 'user_id' | 'property_id' | 'is_completed' | 'completed_at' | 'created_at'>[] = [
  // Before
  { title: 'Hire a moving company or rent a truck', category: 'before', due_date: null, notes: null, sort_order: 1 },
  { title: 'Notify current utilities of move-out date', category: 'before', due_date: null, notes: null, sort_order: 2 },
  { title: 'Set up utilities at new address', category: 'before', due_date: null, notes: null, sort_order: 3 },
  { title: 'Forward mail with USPS', category: 'before', due_date: null, notes: null, sort_order: 4 },
  { title: 'Cancel or transfer subscriptions', category: 'before', due_date: null, notes: null, sort_order: 5 },
  { title: 'Sort belongings — donate, sell, discard', category: 'before', due_date: null, notes: null, sort_order: 6 },
  { title: 'Pack non-essentials and label boxes', category: 'before', due_date: null, notes: null, sort_order: 7 },
  { title: 'Confirm move date with building or HOA', category: 'before', due_date: null, notes: null, sort_order: 8 },
  // Day of
  { title: 'Do a final walkthrough of old home', category: 'day_of', due_date: null, notes: null, sort_order: 10 },
  { title: 'Take utility meter readings (gas, electric, water)', category: 'day_of', due_date: null, notes: null, sort_order: 11 },
  { title: 'Collect all keys, fobs, and garage openers', category: 'day_of', due_date: null, notes: null, sort_order: 12 },
  { title: 'Clean old home for handover', category: 'day_of', due_date: null, notes: null, sort_order: 13 },
  { title: 'Photograph old home condition', category: 'day_of', due_date: null, notes: null, sort_order: 14 },
  // After
  { title: 'Deep clean new home before unpacking', category: 'after', due_date: null, notes: null, sort_order: 20 },
  { title: 'Unpack and set up essentials first', category: 'after', due_date: null, notes: null, sort_order: 21 },
  { title: 'Change the locks on new home', category: 'after', due_date: null, notes: null, sort_order: 22 },
  { title: 'Test smoke detectors and carbon monoxide alarms', category: 'after', due_date: null, notes: null, sort_order: 23 },
  { title: 'Locate main water shut-off and electrical panel', category: 'after', due_date: null, notes: null, sort_order: 24 },
  // Admin
  { title: "Update driver's license address", category: 'admin', due_date: null, notes: null, sort_order: 30 },
  { title: 'Update voter registration', category: 'admin', due_date: null, notes: null, sort_order: 31 },
  { title: 'Notify bank and credit card companies', category: 'admin', due_date: null, notes: null, sort_order: 32 },
  { title: 'Update address with employer and IRS', category: 'admin', due_date: null, notes: null, sort_order: 33 },
  { title: 'Update insurance policies (auto, health, etc.)', category: 'admin', due_date: null, notes: null, sort_order: 34 },
  { title: 'Register vehicles with new state/county if needed', category: 'admin', due_date: null, notes: null, sort_order: 35 },
]

export async function seedDefaultChecklist(supabase: ReturnType<typeof createClient>, userId: string, propertyId?: string | null) {
  const items = DEFAULT_ITEMS.map(item => ({
    ...item,
    user_id: userId,
    property_id: propertyId ?? null,
    is_completed: false,
    completed_at: null,
  }))
  await supabase.from('moving_checklist_items').insert(items)
}

interface FormModalProps {
  mode: 'add' | 'edit'
  item?: ChecklistItem
  properties: Property[]
  userId: string
}

function FormModal({ mode, item, properties, userId }: FormModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const propertyOptions = [
    { value: '', label: 'No specific property' },
    ...properties.map(p => ({ value: p.id, label: p.address })),
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      user_id: userId,
      title: fd.get('title') as string,
      category: fd.get('category') as 'before' | 'day_of' | 'after' | 'admin',
      due_date: fd.get('due_date') as string || null,
      notes: fd.get('notes') as string || null,
      property_id: fd.get('property_id') as string || null,
      is_completed: false,
      completed_at: null,
    }

    startTransition(async () => {
      if (mode === 'add') {
        await supabase.from('moving_checklist_items').insert(data)
      } else if (item) {
        await supabase.from('moving_checklist_items').update(data).eq('id', item.id)
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      {mode === 'add' ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      ) : (
        <button onClick={() => setOpen(true)} className="text-stone-400 hover:text-stone-600 p-1">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'add' ? 'Add Checklist Item' : 'Edit Item'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="title" label="Task" defaultValue={item?.title} required placeholder="e.g. Cancel gym membership" />
          <Select name="category" label="Category" defaultValue={item?.category ?? 'before'} options={CATEGORY_OPTIONS} />
          <Input name="due_date" label="Due Date (optional)" type="date" defaultValue={item?.due_date ?? ''} />
          <Select name="property_id" label="Property (optional)" defaultValue={item?.property_id ?? ''} options={propertyOptions} />
          <Input name="notes" label="Notes (optional)" defaultValue={item?.notes ?? ''} />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>{mode === 'add' ? 'Add Item' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export function AddItemButton({ properties, userId }: { properties: Property[]; userId: string }) {
  return <FormModal mode="add" properties={properties} userId={userId} />
}

export function EditItemButton({ item, properties, userId }: { item: ChecklistItem; properties: Property[]; userId: string }) {
  return <FormModal mode="edit" item={item} properties={properties} userId={userId} />
}

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  function handleDelete() {
    if (!confirm('Remove this item?')) return
    startTransition(async () => {
      await supabase.from('moving_checklist_items').delete().eq('id', itemId)
      router.refresh()
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} className="text-stone-400 hover:text-red-500 p-1">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

export function ToggleItemButton({ item }: { item: ChecklistItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  function handleToggle() {
    const nowComplete = !item.is_completed
    startTransition(async () => {
      await supabase.from('moving_checklist_items').update({
        is_completed: nowComplete,
        completed_at: nowComplete ? new Date().toISOString() : null,
      }).eq('id', item.id)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
        item.is_completed ? 'bg-green-500 border-green-500 text-white' : 'border-stone-300 hover:border-amber-400'
      }`}
    >
      {item.is_completed && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
    </button>
  )
}

export function SeedChecklistButton({ userId, propertyId }: { userId: string; propertyId?: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  function handleSeed() {
    startTransition(async () => {
      await seedDefaultChecklist(supabase, userId, propertyId)
      router.refresh()
    })
  }

  return (
    <Button variant="secondary" onClick={handleSeed} loading={isPending}>
      Load Default Checklist
    </Button>
  )
}
