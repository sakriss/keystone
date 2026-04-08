import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, ShieldCheck, Eye, Edit } from 'lucide-react'
import { AcceptInviteButton } from './accept-invite-actions'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Look up the share by token — includes property details
  const { data: share } = await supabase
    .from('property_shares')
    .select('*, properties(address, city, state, zip)')
    .eq('token', token)
    .single()

  // Token not found
  if (!share) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <Card>
          <CardHeader><CardTitle>Invalid Invite</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-stone-600">This invite link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already used or revoked
  if (share.status !== 'pending') {
    return (
      <div className="max-w-md mx-auto mt-16">
        <Card>
          <CardHeader><CardTitle>Invite No Longer Valid</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-stone-600">
              {share.status === 'accepted'
                ? 'This invite has already been accepted.'
                : 'This invite has been revoked by the owner.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User must be logged in — the (app) layout already handles redirect to /login,
  // but we redirect with the return path so they come back here after signing in.
  if (!user) {
    redirect(`/login?redirect=/invite/${token}`)
  }

  // Email mismatch
  if (user.email?.toLowerCase() !== share.invited_email.toLowerCase()) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <Card>
          <CardHeader><CardTitle>Wrong Account</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-stone-600">
              This invite was sent to <strong>{share.invited_email}</strong>, but you&apos;re
              signed in as <strong>{user.email}</strong>.
            </p>
            <p className="text-sm text-stone-600">
              Please sign in with the correct account to accept this invite.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Narrow type — property may be null if deleted
  const property = share.properties as { address: string; city: string | null; state: string | null; zip: string | null } | null

  return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle>You&apos;re Invited</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {property && (
            <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg">
              <Building2 className="h-5 w-5 text-stone-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-stone-900 text-sm">{property.address}</p>
                {(property.city || property.state) && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    {[property.city, property.state, property.zip].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-stone-600">
            {share.permission === 'edit' ? (
              <><Edit className="h-4 w-4 text-stone-400" /> You&apos;ll be able to <strong>view and edit</strong> this property.</>
            ) : (
              <><Eye className="h-4 w-4 text-stone-400" /> You&apos;ll be able to <strong>view</strong> this property.</>
            )}
          </div>

          <AcceptInviteButton
            token={token}
            shareId={share.id}
            propertyId={share.property_id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
