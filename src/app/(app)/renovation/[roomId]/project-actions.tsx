'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Edit, Trash2, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'on_hold', label: 'On Hold' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const RESOURCE_TYPES = [
  { value: 'article', label: 'Article / Guide' },
  { value: 'video', label: 'Video' },
  { value: 'product', label: 'Product' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'other', label: 'Other' },
]

interface Project { id: string; [key: string]: unknown }

interface Props {
  mode: 'add' | 'edit'
  roomId: string
  project?: Project
  open?: boolean
  onOpenChange?: (v: boolean) => void
}

export function ProjectActions({ mode, roomId, project, open: externalOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [resOpen, setResOpen] = useState(false)

  const controlled = externalOpen !== undefined
  const open = controlled ? externalOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (!controlled) setInternalOpen(v)
    onOpenChange?.(v)
  }
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()
  const refresh = () => startTransition(() => router.refresh())

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = {
      room_id: roomId,
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || null,
      status: (fd.get('status') as string) || 'on_hold',
      priority: (fd.get('priority') as string) || 'medium',
      is_diy: fd.get('is_diy') === 'on',
      budget_estimate: fd.get('budget_estimate') ? Number(fd.get('budget_estimate')) : null,
      actual_cost: fd.get('actual_cost') ? Number(fd.get('actual_cost')) : null,
      contractor_name: (fd.get('contractor_name') as string) || null,
      contractor_phone: (fd.get('contractor_phone') as string) || null,
      contractor_quote: fd.get('contractor_quote') ? Number(fd.get('contractor_quote')) : null,
      start_date: (fd.get('start_date') as string) || null,
      end_date: (fd.get('end_date') as string) || null,
      notes: (fd.get('notes') as string) || null,
    }
    if (mode === 'add') {
      await supabase.from('room_projects').insert(data)
    } else if (project) {
      await supabase.from('room_projects').update(data).eq('id', project.id)
    }
    setOpen(false)
    refresh()
  }

  async function handleDelete() {
    if (!project) return
    await supabase.from('room_projects').delete().eq('id', project.id)
    refresh()
  }

  async function addResource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await supabase.from('project_resources').insert({
      project_id: project!.id,
      title: fd.get('title') as string,
      url: (fd.get('url') as string) || null,
      resource_type: (fd.get('resource_type') as string) || null,
      notes: (fd.get('notes') as string) || null,
    })
    setResOpen(false)
    refresh()
  }

  const d = project ?? {} as Project

  return (
    <>
      {mode === 'add' ? (
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Project</Button>
      ) : (
        <div className="flex gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setResOpen(true)} title="Add resource">
            <Link2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={mode === 'add' ? 'Add Project' : 'Edit Project'} size="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input name="title" label="Project Title *" placeholder="Replace kitchen countertops" required
            defaultValue={(d.title as string) ?? ''} />
          <Textarea name="description" label="Description" placeholder="More details..." rows={2}
            defaultValue={(d.description as string) ?? ''} />

          <div className="grid grid-cols-2 gap-3">
            <Select name="status" label="Status" options={STATUS_OPTIONS}
              defaultValue={(d.status as string) ?? 'on_hold'} />
            <Select name="priority" label="Priority" options={PRIORITY_OPTIONS}
              defaultValue={(d.priority as string) ?? 'medium'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input name="budget_estimate" type="number" label="Budget Estimate" placeholder="5000"
              defaultValue={(d.budget_estimate as number) ?? ''} />
            <Input name="actual_cost" type="number" label="Actual Cost" placeholder="4800"
              defaultValue={(d.actual_cost as number) ?? ''} />
          </div>

          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" name="is_diy" defaultChecked={(d.is_diy as boolean) ?? false} className="rounded" />
            DIY project (doing it yourself)
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Input name="contractor_name" label="Contractor Name" defaultValue={(d.contractor_name as string) ?? ''} />
            <Input name="contractor_phone" type="tel" label="Contractor Phone" defaultValue={(d.contractor_phone as string) ?? ''} />
          </div>
          <Input name="contractor_quote" type="number" label="Contractor Quote" placeholder="5500"
            defaultValue={(d.contractor_quote as number) ?? ''} />

          <div className="grid grid-cols-2 gap-3">
            <Input name="start_date" type="date" label="Start Date" defaultValue={(d.start_date as string) ?? ''} />
            <Input name="end_date" type="date" label="End Date" defaultValue={(d.end_date as string) ?? ''} />
          </div>

          <Textarea name="notes" label="Notes" rows={2} defaultValue={(d.notes as string) ?? ''} />

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* Add Resource Modal */}
      <Modal open={resOpen} onClose={() => setResOpen(false)} title="Add Resource / Link" size="sm">
        <form onSubmit={addResource} className="flex flex-col gap-4">
          <Input name="title" label="Title *" placeholder="How to install tile backsplash" required />
          <Input name="url" type="url" label="URL" placeholder="https://..." />
          <Select name="resource_type" label="Type" options={RESOURCE_TYPES} />
          <Textarea name="notes" label="Notes" rows={2} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setResOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>Add</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
