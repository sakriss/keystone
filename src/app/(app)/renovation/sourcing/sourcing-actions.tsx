'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'tentative', label: 'Tentative' },
  { value: 'approved', label: 'Approved' },
  { value: 'backup', label: 'Backup' },
  { value: 'later', label: 'Later' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'arrived', label: 'Arrived' },
]

const CATEGORY_OPTIONS = [
  { value: 'Appliances', label: 'Appliances' },
  { value: 'Backsplash', label: 'Backsplash' },
  { value: 'Cabinetry', label: 'Cabinetry' },
  { value: 'Decor', label: 'Decor' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Faucet', label: 'Faucet' },
  { value: 'Flooring', label: 'Flooring' },
  { value: 'Furniture', label: 'Furniture' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Lighting', label: 'Lighting' },
  { value: 'Paint', label: 'Paint' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Tile', label: 'Tile' },
  { value: 'Other', label: 'Other' },
]

interface SourcingItem { id: string; [key: string]: unknown }

interface Props {
  mode: 'add' | 'edit'
  roomId: string
  userId: string
  item?: SourcingItem
  open?: boolean
  onOpenChange?: (v: boolean) => void
}

export function SourcingActions({ mode, roomId, userId, item, open: externalOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const controlled = externalOpen !== undefined
  const open = controlled ? externalOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (!controlled) setInternalOpen(v)
    onOpenChange?.(v)
  }
  const [, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const refresh = () => startTransition(() => router.refresh())

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    const data = {
      user_id: userId,
      room_id: roomId,
      category: fd.get('category') as string,
      item_description: fd.get('item_description') as string,
      total_cost: fd.get('total_cost') ? Number(fd.get('total_cost')) : null,
      link: (fd.get('link') as string) || null,
      status: (fd.get('status') as string) || 'tentative',
      material_finish: (fd.get('material_finish') as string) || null,
      dimensions: (fd.get('dimensions') as string) || null,
      notes: (fd.get('notes') as string) || null,
    }

    const { error: dbError } = mode === 'add'
      ? await supabase.from('sourcing_items').insert(data)
      : await supabase.from('sourcing_items').update(data).eq('id', item!.id)

    setSubmitting(false)
    if (dbError) {
      setError(dbError.message)
      return
    }
    setOpen(false)
    refresh()
  }

  async function handleDelete() {
    if (!item) return
    await supabase.from('sourcing_items').delete().eq('id', item.id)
    refresh()
  }

  const d = item ?? {} as SourcingItem

  return (
    <>
      {mode === 'add' ? (
        <Button onClick={() => { setError(null); setOpen(true) }}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      ) : (
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => { setError(null); setOpen(true) }}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
          </Button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'add' ? 'Add Sourcing Item' : 'Edit Sourcing Item'} size="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Select name="category" label="Category *" options={CATEGORY_OPTIONS}
              defaultValue={(d.category as string) ?? 'Other'} />
            <Select name="status" label="Status" options={STATUS_OPTIONS}
              defaultValue={(d.status as string) ?? 'tentative'} />
          </div>

          <Input name="item_description" label="Item Description *" placeholder="Delta Trinsic Vessel Sink Faucet" required
            defaultValue={(d.item_description as string) ?? ''} />

          <div className="grid grid-cols-2 gap-3">
            <Input name="total_cost" type="number" step="0.01" label="Total Cost" placeholder="327.09"
              defaultValue={(d.total_cost as number) ?? ''} />
            <Input name="material_finish" label="Material / Finish" placeholder="Champagne Bronze"
              defaultValue={(d.material_finish as string) ?? ''} />
          </div>

          <Input name="link" type="url" label="Product Link" placeholder="https://amazon.com/..."
            defaultValue={(d.link as string) ?? ''} />

          <Input name="dimensions" label="Dimensions" placeholder='56" W x 18" D'
            defaultValue={(d.dimensions as string) ?? ''} />

          <Textarea name="notes" label="Notes" rows={2}
            defaultValue={(d.notes as string) ?? ''} />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
