'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Share2, Copy, Check, Trash2, Clock, UserCheck } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Share = Database['public']['Tables']['property_shares']['Row']

const PERMISSION_OPTIONS = [
  { value: 'view', label: 'View only' },
  { value: 'edit', label: 'Can edit' },
]

interface Props {
  propertyId: string
  ownerId: string
  shares: Share[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  revoked: 'Revoked',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-600',
  accepted: 'text-green-600',
  revoked: 'text-stone-400',
}

export function ShareActions({ propertyId, ownerId, shares: initialShares }: Props) {
  const [open, setOpen] = useState(false)
  const [shares, setShares] = useState<Share[]>(initialShares)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('view')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const refresh = () => startTransition(() => router.refresh())

  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? ''

  function inviteUrl(token: string) {
    return `${appUrl}/invite/${token}`
  }

  async function copyLink(share: Share) {
    await navigator.clipboard.writeText(inviteUrl(share.token))
    setCopiedId(share.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const normalised = email.toLowerCase().trim()

    if (!normalised) return

    // Check for duplicate
    const existing = shares.find(
      s => s.invited_email === normalised && s.status !== 'revoked'
    )
    if (existing) {
      setError('Already invited — copy the existing link below.')
      return
    }

    const { data, error: insertError } = await supabase
      .from('property_shares')
      .insert({
        property_id: propertyId,
        owner_id: ownerId,
        invited_email: normalised,
        permission: permission as 'view' | 'edit',
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return
    }

    if (data) {
      setShares(prev => [...prev, data])
    }
    setEmail('')
    setOpen(false)
    refresh()
  }

  async function handleRevoke(shareId: string) {
    await supabase
      .from('property_shares')
      .update({ status: 'revoked' })
      .eq('id', shareId)

    setShares(prev =>
      prev.map(s => (s.id === shareId ? { ...s, status: 'revoked' } : s))
    )
    refresh()
  }

  const activeShares = shares.filter(s => s.status !== 'revoked')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-stone-400" />
          Shared Access
        </CardTitle>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Invite
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {activeShares.length === 0 ? (
          <p className="px-5 py-4 text-sm text-stone-500">
            No one else has access yet. Invite a partner or agent.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {activeShares.map(share => (
              <li key={share.id} className="flex items-center justify-between px-5 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{share.invited_email}</p>
                  <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                    {share.status === 'accepted' ? (
                      <UserCheck className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    <span className={STATUS_COLORS[share.status]}>
                      {STATUS_LABELS[share.status]}
                    </span>
                    <span>·</span>
                    <span className="capitalize">{share.permission}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {share.status === 'pending' && (
                    <button
                      onClick={() => copyLink(share)}
                      className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-amber-600 transition-colors"
                    >
                      {copiedId === share.id ? (
                        <><Check className="h-3.5 w-3.5 text-green-600" /> Copied</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" /> Copy link</>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleRevoke(share.id)}
                    className="text-stone-300 hover:text-red-500 transition-colors"
                    aria-label="Revoke access"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Modal open={open} onClose={() => { setOpen(false); setError('') }} title="Invite Someone">
        <form onSubmit={handleInvite} className="flex flex-col gap-4">
          <Input
            id="invite-email"
            name="email"
            type="email"
            label="Email address"
            placeholder="partner@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Select
            id="invite-permission"
            name="permission"
            label="Permission"
            options={PERMISSION_OPTIONS}
            value={permission}
            onChange={e => setPermission(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-xs text-stone-500">
            You&apos;ll get an invite link to share via email or message. The recipient
            must have (or create) a Keystone account with that email address.
          </p>
          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isPending}>Create Invite Link</Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}
