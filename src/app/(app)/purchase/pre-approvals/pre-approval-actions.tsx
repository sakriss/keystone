'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Database } from '@/lib/supabase/types'

type PreApproval = Database['public']['Tables']['pre_approvals']['Row']

interface Props {
  mode: 'add' | 'edit'
  preApproval?: PreApproval
}

export function PreApprovalActions({ mode, preApproval }: Props) {
  const [open, setOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const refresh = () => startTransition(() => router.refresh())

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const data = {
      user_id: user.id,
      lender_name: fd.get('lender_name') as string,
      amount: Number(fd.get('amount')),
      interest_rate: fd.get('interest_rate') ? Number(fd.get('interest_rate')) : null,
      loan_type: (fd.get('loan_type') as string) || null,
      expires_at: (fd.get('expires_at') as string) || null,
      contact_name: (fd.get('contact_name') as string) || null,
      contact_phone: (fd.get('contact_phone') as string) || null,
      contact_email: (fd.get('contact_email') as string) || null,
      notes: (fd.get('notes') as string) || null,
    }

    if (mode === 'add') {
      await supabase.from('pre_approvals').insert(data)
    } else if (preApproval) {
      await supabase.from('pre_approvals').update(data).eq('id', preApproval.id)
    }
    setOpen(false)
    refresh()
  }

  async function handleDelete() {
    if (!preApproval) return
    await supabase.from('pre_approvals').delete().eq('id', preApproval.id)
    setDeleteConfirm(false)
    refresh()
  }

  const defaultValues = preApproval ?? {}

  return (
    <>
      {mode === 'add' ? (
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Pre-Approval</Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Edit className="h-4 w-4" /> Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'add' ? 'Add Pre-Approval' : 'Edit Pre-Approval'} size="md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="lender_name" name="lender_name" label="Lender / Bank *" placeholder="First National Bank" required
            defaultValue={(defaultValues as PreApproval).lender_name ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="amount" name="amount" type="number" label="Approved Amount *" placeholder="500000" required
              defaultValue={(defaultValues as PreApproval).amount ?? ''} />
            <Input id="interest_rate" name="interest_rate" type="number" step="0.01" label="Interest Rate (%)" placeholder="6.75"
              defaultValue={(defaultValues as PreApproval).interest_rate ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="loan_type" name="loan_type" label="Loan Type" placeholder="Conventional, FHA, VA..."
              defaultValue={(defaultValues as PreApproval).loan_type ?? ''} />
            <Input id="expires_at" name="expires_at" type="date" label="Expiration Date"
              defaultValue={(defaultValues as PreApproval).expires_at?.split('T')[0] ?? ''} />
          </div>
          <Input id="contact_name" name="contact_name" label="Loan Officer" placeholder="Jane Smith"
            defaultValue={(defaultValues as PreApproval).contact_name ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="contact_phone" name="contact_phone" type="tel" label="Phone" placeholder="555-000-0000"
              defaultValue={(defaultValues as PreApproval).contact_phone ?? ''} />
            <Input id="contact_email" name="contact_email" type="email" label="Email" placeholder="jane@bank.com"
              defaultValue={(defaultValues as PreApproval).contact_email ?? ''} />
          </div>
          <Textarea id="notes" name="notes" label="Notes" rows={3}
            defaultValue={(defaultValues as PreApproval).notes ?? ''} />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete Pre-Approval?" size="sm">
        <p className="text-sm text-stone-600 mb-4">This will permanently remove this pre-approval record.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>Cancel</Button>
          <Button variant="danger" loading={isPending} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </>
  )
}
