'use client'
import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Download, Trash2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const CATEGORY_OPTIONS = [
  { value: 'contract', label: 'Contract' },
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'title', label: 'Title Document' },
  { value: 'appraisal', label: 'Appraisal' },
  { value: 'hoa', label: 'HOA Document' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'mortgage', label: 'Mortgage Document' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'other', label: 'Other' },
]

interface Doc { id: string; title: string; storage_path: string; [key: string]: unknown }

interface Props {
  mode: 'add' | 'download'
  doc?: Doc
  properties: { id: string; address: string }[]
}

export function DocumentActions({ mode, doc, properties }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const refresh = () => startTransition(() => router.refresh())

  const propOptions = properties.map(p => ({ value: p.id, label: p.address }))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const file = fileRef.current?.files?.[0]
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUploading(true)
    let storagePath = ''

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('documents').upload(path, file)
      if (!error) storagePath = path
    }

    if (!storagePath && !doc) {
      setUploading(false)
      return
    }

    await supabase.from('documents').insert({
      user_id: user.id,
      property_id: (fd.get('property_id') as string) || null,
      title: fd.get('title') as string,
      category: (fd.get('category') as string) || null,
      storage_path: storagePath,
      file_size: file?.size ?? null,
      mime_type: file?.type ?? null,
      notes: (fd.get('notes') as string) || null,
    })

    setUploading(false)
    setFileName('')
    setOpen(false)
    refresh()
  }

  async function handleDownload() {
    if (!doc) return
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleDelete() {
    if (!doc) return
    await supabase.storage.from('documents').remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    refresh()
  }

  if (mode === 'download') {
    return (
      <div className="flex gap-1.5 shrink-0">
        <button onClick={handleDownload} className="text-stone-400 hover:text-amber-600 transition-colors p-1">
          <Download className="h-4 w-4" />
        </button>
        <button onClick={handleDelete} className="text-stone-400 hover:text-red-500 transition-colors p-1">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Upload Document</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload Document" size="md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* File picker */}
          <div>
            <label className="text-sm font-medium text-stone-700">File *</label>
            <div
              className="mt-1 border-2 border-dashed border-stone-300 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-stone-400 mx-auto mb-2" />
              <p className="text-sm text-stone-500">
                {fileName || 'Click to select a file'}
              </p>
              <p className="text-xs text-stone-400 mt-1">PDF, DOCX, images, etc.</p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.xlsx,.xls"
                onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
                required
              />
            </div>
          </div>

          <Input name="title" label="Document Title *" placeholder="Purchase Agreement" required />

          <div className="grid grid-cols-2 gap-3">
            <Select name="category" label="Category" options={CATEGORY_OPTIONS} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-stone-700">Property</label>
              <select name="property_id"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">None / General</option>
                {propOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <Textarea name="notes" label="Notes" rows={2} placeholder="Any notes about this document..." />

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={uploading || isPending}>Upload</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
