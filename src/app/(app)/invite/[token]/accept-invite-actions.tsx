'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  token: string
  shareId: string
  propertyId: string
}

export function AcceptInviteButton({ token, shareId, propertyId }: Props) {
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  async function handleAccept() {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=/invite/${token}`)
      return
    }

    const { error: updateError } = await supabase
      .from('property_shares')
      .update({
        status: 'accepted',
        accepted_user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', shareId)

    if (updateError) {
      setError(updateError.message)
      return
    }

    startTransition(() => {
      router.push(`/properties/${propertyId}`)
    })
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={handleAccept} loading={isPending}>
        Accept Access
      </Button>
    </div>
  )
}
