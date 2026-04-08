'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function RoomActions({ mode }: { mode: 'add' }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('rooms').insert({
      user_id: user.id,
      name: fd.get('name') as string,
      description: (fd.get('description') as string) || null,
    })
    setOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Room</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Room" size="sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input id="room_name" name="name" label="Room Name *" placeholder="Kitchen, Master Bath, Basement..." required />
          <Textarea id="room_desc" name="description" label="Description" placeholder="Current state or renovation goals..." rows={2} />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>Add Room</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
