'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Quote { id: string; [key: string]: unknown }

interface Props {
  mode: 'add' | 'edit'
  quote?: Quote
  properties: { id: string; address: string }[]
}

export function InsuranceActions({ mode, quote, properties }: Props) {
  const [open, setOpen] = useState(false)
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
      company_name: fd.get('company_name') as string,
      agent_name: (fd.get('agent_name') as string) || null,
      agent_phone: (fd.get('agent_phone') as string) || null,
      agent_email: (fd.get('agent_email') as string) || null,
      annual_premium: fd.get('annual_premium') ? Number(fd.get('annual_premium')) : null,
      monthly_premium: fd.get('monthly_premium') ? Number(fd.get('monthly_premium')) : null,
      coverage_amount: fd.get('coverage_amount') ? Number(fd.get('coverage_amount')) : null,
      deductible: fd.get('deductible') ? Number(fd.get('deductible')) : null,
      policy_type: (fd.get('policy_type') as string) || null,
      notes: (fd.get('notes') as string) || null,
      is_selected: fd.get('is_selected') === 'on',
    }
    if (mode === 'add') {
      await supabase.from('insurance_quotes').insert(data)
    } else if (quote) {
      await supabase.from('insurance_quotes').update(data).eq('id', quote.id)
    }
    setOpen(false)
    refresh()
  }

  async function handleDelete() {
    if (!quote) return
    await supabase.from('insurance_quotes').delete().eq('id', quote.id)
    refresh()
  }

  return (
    <>
      {mode === 'add' ? (
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Quote</Button>
      ) : (
        <div className="flex gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'add' ? 'Add Insurance Quote' : 'Edit Quote'} size="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <select name="property_id" required defaultValue={(quote?.property_id as string) ?? ''}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
            <option value="">Select property…</option>
            {propOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Input name="company_name" label="Insurance Company *" required defaultValue={(quote?.company_name as string) ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="monthly_premium" type="number" step="0.01" label="Monthly Premium" defaultValue={(quote?.monthly_premium as number) ?? ''} />
            <Input name="annual_premium" type="number" step="0.01" label="Annual Premium" defaultValue={(quote?.annual_premium as number) ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input name="coverage_amount" type="number" label="Coverage Amount" defaultValue={(quote?.coverage_amount as number) ?? ''} />
            <Input name="deductible" type="number" label="Deductible" defaultValue={(quote?.deductible as number) ?? ''} />
          </div>
          <Input name="policy_type" label="Policy Type" placeholder="HO-3, HO-5, etc." defaultValue={(quote?.policy_type as string) ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input name="agent_name" label="Agent Name" defaultValue={(quote?.agent_name as string) ?? ''} />
            <Input name="agent_phone" type="tel" label="Agent Phone" defaultValue={(quote?.agent_phone as string) ?? ''} />
          </div>
          <Input name="agent_email" type="email" label="Agent Email" defaultValue={(quote?.agent_email as string) ?? ''} />
          <Textarea name="notes" label="Notes" rows={2} defaultValue={(quote?.notes as string) ?? ''} />
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" name="is_selected" defaultChecked={(quote?.is_selected as boolean) ?? false} className="rounded" />
            Mark as selected quote
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
