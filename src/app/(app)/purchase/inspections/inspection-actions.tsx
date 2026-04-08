'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { statusLabel, formatCurrency } from '@/lib/utils'

const INSPECTION_STATUS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const ITEM_PRIORITY = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const ITEM_STATUS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'wont_fix', label: "Won't Fix" },
]

interface InspectionItem {
  id: string
  description: string
  priority: string
  status: string
  estimated_cost: number | null
  category: string | null
}

interface Props {
  mode: 'add' | 'edit' | 'items'
  inspection?: Record<string, unknown>
  properties: { id: string; address: string }[]
  items?: InspectionItem[]
}

export function InspectionActions({ mode, inspection, properties, items }: Props) {
  const [open, setOpen] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const refresh = () => startTransition(() => router.refresh())

  const propOptions = properties.map(p => ({ value: p.id, label: p.address }))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      property_id: fd.get('property_id') as string,
      inspector_name: (fd.get('inspector_name') as string) || null,
      inspector_company: (fd.get('inspector_company') as string) || null,
      inspector_phone: (fd.get('inspector_phone') as string) || null,
      inspector_email: (fd.get('inspector_email') as string) || null,
      scheduled_at: (fd.get('scheduled_at') as string) || null,
      completed_at: (fd.get('completed_at') as string) || null,
      cost: fd.get('cost') ? Number(fd.get('cost')) : null,
      status: (fd.get('status') as string) || 'scheduled',
      notes: (fd.get('notes') as string) || null,
    }
    if (mode === 'add') {
      await supabase.from('inspections').insert(data)
    } else if (inspection) {
      await supabase.from('inspections').update(data).eq('id', inspection.id as string)
    }
    setOpen(false)
    refresh()
  }

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await supabase.from('inspection_items').insert({
      inspection_id: inspection!.id as string,
      description: fd.get('description') as string,
      category: (fd.get('category') as string) || null,
      priority: (fd.get('priority') as string) || 'medium',
      estimated_cost: fd.get('estimated_cost') ? Number(fd.get('estimated_cost')) : null,
      notes: (fd.get('notes') as string) || null,
    })
    setAddItemOpen(false)
    refresh()
  }

  async function toggleItemStatus(item: InspectionItem) {
    const next = item.status === 'open' ? 'resolved' : 'open'
    await supabase.from('inspection_items').update({ status: next }).eq('id', item.id)
    refresh()
  }

  async function deleteItem(id: string) {
    await supabase.from('inspection_items').delete().eq('id', id)
    refresh()
  }

  if (mode === 'items') {
    return (
      <div>
        {items && items.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {items.map(item => (
              <li key={item.id} className="flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2">
                <button onClick={() => toggleItemStatus(item)} className="mt-0.5 shrink-0 text-stone-400 hover:text-amber-600 transition-colors">
                  {item.status === 'resolved'
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <Circle className="h-4 w-4" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.status === 'resolved' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.category && <span className="text-xs text-stone-500">{item.category}</span>}
                    {item.estimated_cost && <span className="text-xs text-stone-500">{formatCurrency(item.estimated_cost)}</span>}
                    <Badge label={item.priority} status={item.priority} />
                  </div>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-stone-300 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button size="sm" variant="secondary" onClick={() => setAddItemOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Finding
        </Button>

        <Modal open={addItemOpen} onClose={() => setAddItemOpen(false)} title="Add Inspection Finding" size="md">
          <form onSubmit={addItem} className="flex flex-col gap-4">
            <Textarea id="desc" name="description" label="Description *" placeholder="Roof shingles damaged near chimney..." rows={2} required />
            <div className="grid grid-cols-2 gap-3">
              <Input id="category" name="category" label="Category" placeholder="Roof, Electrical, Plumbing..." />
              <Select id="priority" name="priority" label="Priority" options={ITEM_PRIORITY} />
            </div>
            <Input id="est_cost" name="estimated_cost" type="number" label="Estimated Repair Cost" placeholder="1500" />
            <Textarea id="item_notes" name="notes" label="Notes" rows={2} />
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setAddItemOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isPending}>Add Finding</Button>
            </div>
          </form>
        </Modal>
      </div>
    )
  }

  return (
    <>
      {mode === 'add' ? (
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Inspection</Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Edit className="h-4 w-4" /> Edit</Button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'add' ? 'Add Inspection' : 'Edit Inspection'} size="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {propOptions.length > 0 && (
            <Select id="property_id" name="property_id" label="Property *" options={propOptions} required
              defaultValue={(inspection?.property_id as string) ?? ''} placeholder="Select a property..." />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input id="insp_name" name="inspector_name" label="Inspector Name" defaultValue={(inspection?.inspector_name as string) ?? ''} />
            <Input id="insp_company" name="inspector_company" label="Company" defaultValue={(inspection?.inspector_company as string) ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="insp_phone" name="inspector_phone" type="tel" label="Phone" defaultValue={(inspection?.inspector_phone as string) ?? ''} />
            <Input id="insp_email" name="inspector_email" type="email" label="Email" defaultValue={(inspection?.inspector_email as string) ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Input id="sched" name="scheduled_at" type="datetime-local" label="Scheduled"
              defaultValue={(inspection?.scheduled_at as string)?.slice(0,16) ?? ''} />
            <Input id="completed" name="completed_at" type="datetime-local" label="Completed"
              defaultValue={(inspection?.completed_at as string)?.slice(0,16) ?? ''} />
            <Input id="insp_cost" name="cost" type="number" label="Cost" defaultValue={(inspection?.cost as number) ?? ''} />
          </div>
          <Select id="insp_status" name="status" label="Status" options={INSPECTION_STATUS}
            defaultValue={(inspection?.status as string) ?? 'scheduled'} />
          <Textarea id="insp_notes" name="notes" label="Notes" rows={3} defaultValue={(inspection?.notes as string) ?? ''} />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
