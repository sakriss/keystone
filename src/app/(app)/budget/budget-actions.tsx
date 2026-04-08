'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'one_time', label: 'One-time' },
]

interface BudgetItem { id: string; [key: string]: unknown }

interface Props {
  mode: 'add' | 'edit'
  item?: BudgetItem
  categories: string[]
}

export function BudgetActions({ mode, item, categories }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const refresh = () => startTransition(() => router.refresh())

  const catOptions = categories.map(c => ({ value: c, label: c }))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const data = {
      user_id: user.id,
      category: fd.get('category') as string,
      name: fd.get('name') as string,
      estimated_monthly: Number(fd.get('estimated_monthly')),
      frequency: (fd.get('frequency') as string) || 'monthly',
      notes: (fd.get('notes') as string) || null,
    }

    if (mode === 'add') {
      await supabase.from('budget_items').insert(data)
    } else if (item) {
      await supabase.from('budget_items').update(data).eq('id', item.id)
    }
    setOpen(false)
    refresh()
  }

  async function handleDelete() {
    if (!item) return
    await supabase.from('budget_items').delete().eq('id', item.id)
    refresh()
  }

  return (
    <>
      {mode === 'add' ? (
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Expense</Button>
      ) : (
        <div className="flex gap-1 items-center">
          <button onClick={() => setOpen(true)} className="text-stone-300 hover:text-stone-600 p-1 transition-colors">
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleDelete} className="text-stone-300 hover:text-red-500 p-1 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'add' ? 'Add Budget Item' : 'Edit Budget Item'} size="sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select id="category" name="category" label="Category" options={catOptions}
            defaultValue={(item?.category as string) ?? 'Other'} />
          <Input id="name" name="name" label="Name *" placeholder="Mortgage payment" required
            defaultValue={(item?.name as string) ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <Input id="amount" name="estimated_monthly" type="number" step="0.01" label="Amount *" placeholder="2000" required
              defaultValue={(item?.estimated_monthly as number) ?? ''} />
            <Select id="freq" name="frequency" label="Frequency" options={FREQUENCY_OPTIONS}
              defaultValue={(item?.frequency as string) ?? 'monthly'} />
          </div>
          <Textarea id="notes" name="notes" label="Notes" rows={2}
            defaultValue={(item?.notes as string) ?? ''} />
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
