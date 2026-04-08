import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { Banknote, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { PreApprovalActions } from './pre-approval-actions'

export default async function PreApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: preApprovals } = await supabase
    .from('pre_approvals')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const now = new Date()
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Pre-Approvals</h1>
          <p className="text-sm text-stone-500 mt-1">Track your mortgage pre-approval letters</p>
        </div>
        <PreApprovalActions mode="add" />
      </div>

      {!preApprovals?.length ? (
        <Card>
          <EmptyState
            icon={Banknote}
            title="No pre-approvals yet"
            description="Add your mortgage pre-approval letters to track amounts, rates, and expiration dates."
            action={<PreApprovalActions mode="add" />}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {preApprovals.map(pa => {
            const expired = pa.expires_at && new Date(pa.expires_at) < now
            const expiringSoon = pa.expires_at && !expired && new Date(pa.expires_at) < soon

            return (
              <Card key={pa.id} className={expired ? 'opacity-60' : ''}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-stone-900">{pa.lender_name}</p>
                      {pa.contact_name && <p className="text-xs text-stone-500">{pa.contact_name}</p>}
                    </div>
                    <div className="shrink-0">
                      {expired && <div className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" /> Expired</div>}
                      {expiringSoon && <div className="flex items-center gap-1 text-xs text-amber-600"><Clock className="h-3.5 w-3.5" /> Expiring soon</div>}
                      {!expired && !expiringSoon && <div className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Active</div>}
                    </div>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-stone-900">{formatCurrency(pa.amount)}</p>
                    {pa.interest_rate && (
                      <p className="text-xs text-stone-500">{pa.interest_rate}% • {pa.loan_type || 'Conventional'}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-stone-500">
                    {pa.expires_at && (
                      <span>Expires {formatDate(pa.expires_at)}</span>
                    )}
                    {pa.contact_phone && <span>📞 {pa.contact_phone}</span>}
                    {pa.contact_email && <span>✉ {pa.contact_email}</span>}
                  </div>

                  {pa.notes && (
                    <p className="text-xs text-stone-600 bg-stone-50 rounded-lg p-2">{pa.notes}</p>
                  )}

                  <PreApprovalActions mode="edit" preApproval={pa} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
