import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate, statusLabel, STATUS_COLORS } from '@/lib/utils'
import { FileWarning } from 'lucide-react'
import { AddPermitButton, EditPermitButton, DeletePermitButton } from './permit-actions'
import { cn } from '@/lib/utils'

const PERMIT_TYPE_LABELS: Record<string, string> = {
  building: 'Building', electrical: 'Electrical', plumbing: 'Plumbing',
  mechanical: 'Mechanical', roofing: 'Roofing', demolition: 'Demolition',
  zoning: 'Zoning', other: 'Other',
}

export default async function PermitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: permits }, { data: properties }, { data: contractors }] = await Promise.all([
    supabase
      .from('permits')
      .select('*, properties(address), contractors(name, company)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('properties')
      .select('id, address')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contractors')
      .select('id, name, company')
      .eq('user_id', user!.id)
      .order('name'),
  ])

  const today = new Date()
  const in30Days = new Date(today)
  in30Days.setDate(today.getDate() + 30)

  type Permit = NonNullable<typeof permits>[number]

  const activeCount = permits?.filter(p => p.status === 'active' || p.status === 'approved').length ?? 0
  const pendingCount = permits?.filter(p => p.status === 'applied' || p.status === 'under_review').length ?? 0
  const expiringCount = permits?.filter(p => {
    if (!p.expires_at) return false
    const exp = new Date(p.expires_at)
    return exp >= today && exp <= in30Days
  }).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Permit Tracker</h1>
          <p className="text-sm text-stone-500 mt-1">Track building permits for your renovation projects.</p>
        </div>
        <AddPermitButton properties={properties ?? []} contractors={contractors ?? []} userId={user!.id} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Active</p>
            <p className={`text-2xl font-bold ${activeCount > 0 ? 'text-green-600' : 'text-stone-400'}`}>{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Pending</p>
            <p className={`text-2xl font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-stone-400'}`}>{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Expiring Soon</p>
            <p className={`text-2xl font-bold ${expiringCount > 0 ? 'text-red-600' : 'text-stone-400'}`}>{expiringCount}</p>
          </CardContent>
        </Card>
      </div>

      {!permits?.length ? (
        <Card>
          <EmptyState
            icon={FileWarning}
            title="No permits tracked yet"
            description="Add permits for your renovation projects to track applications, approvals, and inspection dates."
            action={<AddPermitButton properties={properties ?? []} contractors={contractors ?? []} userId={user!.id} />}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {(permits as Permit[]).map(permit => {
            const prop = permit.properties as { address: string } | null
            const contractor = permit.contractors as { name: string; company: string | null } | null
            const isExpiringSoon = permit.expires_at && new Date(permit.expires_at) >= today && new Date(permit.expires_at) <= in30Days

            return (
              <Card key={permit.id} className={cn(isExpiringSoon ? 'border-amber-200' : '')}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      {/* Title + badges */}
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-stone-900">{permit.title}</h3>
                        <Badge
                          label={statusLabel(permit.status)}
                          status={permit.status}
                          className={`text-xs ${STATUS_COLORS[permit.status] ?? 'bg-stone-100 text-stone-600'}`}
                        />
                        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                          {PERMIT_TYPE_LABELS[permit.permit_type]}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-500 flex-wrap">
                        {permit.permit_number && <span className="font-mono">#{permit.permit_number}</span>}
                        {prop && <span>{prop.address}</span>}
                        {contractor && <span>{contractor.company ? `${contractor.name} · ${contractor.company}` : contractor.name}</span>}
                        {permit.issuing_authority && <span>{permit.issuing_authority}</span>}
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-stone-500 flex-wrap">
                        {permit.applied_at && <span>Applied {formatDate(permit.applied_at)}</span>}
                        {permit.approved_at && <span>Approved {formatDate(permit.approved_at)}</span>}
                        {permit.inspection_date && <span>Inspection {formatDate(permit.inspection_date)}</span>}
                        {permit.expires_at && (
                          <span className={isExpiringSoon ? 'text-amber-600 font-medium' : ''}>
                            {isExpiringSoon ? '⚠ Expires ' : 'Expires '}
                            {formatDate(permit.expires_at)}
                          </span>
                        )}
                      </div>

                      {/* Cost */}
                      {(permit.estimated_cost || permit.permit_fee) && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400">
                          {permit.estimated_cost && <span>Project est. {formatCurrency(permit.estimated_cost)}</span>}
                          {permit.permit_fee && <span>Fee {formatCurrency(permit.permit_fee)}</span>}
                        </div>
                      )}

                      {permit.notes && <p className="text-xs text-stone-400 mt-1.5">{permit.notes}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      <EditPermitButton permit={permit} properties={properties ?? []} contractors={contractors ?? []} userId={user!.id} />
                      <DeletePermitButton permitId={permit.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
