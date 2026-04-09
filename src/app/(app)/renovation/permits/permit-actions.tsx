'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Permit = Database['public']['Tables']['permits']['Row']
type Property = { id: string; address: string }
type Contractor = { id: string; name: string; company: string | null }

const PERMIT_TYPE_OPTIONS = [
  { value: 'building', label: 'Building' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'mechanical', label: 'Mechanical (HVAC)' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'demolition', label: 'Demolition' },
  { value: 'zoning', label: 'Zoning / Variance' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'not_applied', label: 'Not Applied Yet' },
  { value: 'applied', label: 'Applied' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active / In Progress' },
  { value: 'passed_inspection', label: 'Passed Inspection' },
  { value: 'closed', label: 'Closed / Complete' },
  { value: 'rejected', label: 'Rejected' },
]

interface FormModalProps {
  mode: 'add' | 'edit'
  permit?: Permit
  properties: Property[]
  contractors: Contractor[]
  userId: string
}

function FormModal({ mode, permit, properties, contractors, userId }: FormModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const propertyOptions = [
    { value: '', label: 'No specific property' },
    ...properties.map(p => ({ value: p.id, label: p.address })),
  ]

  const contractorOptions = [
    { value: '', label: 'No contractor' },
    ...contractors.map(c => ({ value: c.id, label: c.company ? `${c.name} (${c.company})` : c.name })),
  ]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)

    const data = {
      user_id: userId,
      title: fd.get('title') as string,
      permit_type: fd.get('permit_type') as Permit['permit_type'],
      status: fd.get('status') as Permit['status'],
      permit_number: fd.get('permit_number') as string || null,
      description: fd.get('description') as string || null,
      applied_at: fd.get('applied_at') as string || null,
      approved_at: fd.get('approved_at') as string || null,
      expires_at: fd.get('expires_at') as string || null,
      inspection_date: fd.get('inspection_date') as string || null,
      issuing_authority: fd.get('issuing_authority') as string || null,
      estimated_cost: fd.get('estimated_cost') ? Number(fd.get('estimated_cost')) : null,
      permit_fee: fd.get('permit_fee') ? Number(fd.get('permit_fee')) : null,
      property_id: fd.get('property_id') as string || null,
      contractor_id: fd.get('contractor_id') as string || null,
      notes: fd.get('notes') as string || null,
      document_url: fd.get('document_url') as string || null,
    }

    startTransition(async () => {
      if (mode === 'add') {
        await supabase.from('permits').insert(data)
      } else if (permit) {
        await supabase.from('permits').update(data).eq('id', permit.id)
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      {mode === 'add' ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Permit
        </Button>
      ) : (
        <button onClick={() => setOpen(true)} className="text-stone-400 hover:text-stone-600 p-1">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'add' ? 'Add Permit' : 'Edit Permit'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input name="title" label="Title" defaultValue={permit?.title} required placeholder="e.g. Kitchen Renovation Permit" className="col-span-2" />
            <Select name="permit_type" label="Permit Type" defaultValue={permit?.permit_type ?? 'building'} options={PERMIT_TYPE_OPTIONS} />
            <Select name="status" label="Status" defaultValue={permit?.status ?? 'not_applied'} options={STATUS_OPTIONS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input name="permit_number" label="Permit Number" defaultValue={permit?.permit_number ?? ''} placeholder="e.g. BP-2024-001234" />
            <Input name="issuing_authority" label="Issuing Authority" defaultValue={permit?.issuing_authority ?? ''} placeholder="e.g. City of Austin" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input name="applied_at" label="Date Applied" type="date" defaultValue={permit?.applied_at ?? ''} />
            <Input name="approved_at" label="Date Approved" type="date" defaultValue={permit?.approved_at ?? ''} />
            <Input name="inspection_date" label="Inspection Date" type="date" defaultValue={permit?.inspection_date ?? ''} />
            <Input name="expires_at" label="Expiration Date" type="date" defaultValue={permit?.expires_at ?? ''} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input name="estimated_cost" label="Project Cost Est. ($)" type="number" defaultValue={permit?.estimated_cost ?? ''} min={0} />
            <Input name="permit_fee" label="Permit Fee ($)" type="number" defaultValue={permit?.permit_fee ?? ''} min={0} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select name="property_id" label="Property" defaultValue={permit?.property_id ?? ''} options={propertyOptions} />
            <Select name="contractor_id" label="Contractor" defaultValue={permit?.contractor_id ?? ''} options={contractorOptions} />
          </div>

          <Input name="description" label="Description (optional)" defaultValue={permit?.description ?? ''} placeholder="Brief description of work" />
          <Input name="document_url" label="Document URL (optional)" defaultValue={permit?.document_url ?? ''} placeholder="Link to permit document" />
          <Input name="notes" label="Notes (optional)" defaultValue={permit?.notes ?? ''} />

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>{mode === 'add' ? 'Add Permit' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export function AddPermitButton({ properties, contractors, userId }: { properties: Property[]; contractors: Contractor[]; userId: string }) {
  return <FormModal mode="add" properties={properties} contractors={contractors} userId={userId} />
}

export function EditPermitButton({ permit, properties, contractors, userId }: { permit: Permit; properties: Property[]; contractors: Contractor[]; userId: string }) {
  return <FormModal mode="edit" permit={permit} properties={properties} contractors={contractors} userId={userId} />
}

export function DeletePermitButton({ permitId }: { permitId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  function handleDelete() {
    if (!confirm('Delete this permit?')) return
    startTransition(async () => {
      await supabase.from('permits').delete().eq('id', permitId)
      router.refresh()
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending} className="text-stone-400 hover:text-red-500 p-1">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
