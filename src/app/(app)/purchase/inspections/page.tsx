import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, statusLabel } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { ClipboardList } from 'lucide-react'
import { InspectionActions } from './inspection-actions'
import Link from 'next/link'
import { InspectionAnalysis } from '@/components/ai/inspection-analysis'

export default async function InspectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, address')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: inspections } = await supabase
    .from('inspections')
    .select('*, inspection_items(*), properties(address)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Inspections</h1>
          <p className="text-sm text-stone-500 mt-1">Track home inspections and manage findings</p>
        </div>
        <InspectionActions mode="add" properties={properties ?? []} />
      </div>

      {!inspections?.length ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No inspections yet"
            description="Add a home inspection to track inspectors, costs, and create a to-do list from findings."
            action={<InspectionActions mode="add" properties={properties ?? []} />}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {inspections.map(inspection => {
            const items = (inspection.inspection_items as { status: string; priority: string }[] || [])
            const openHigh = items.filter(i => i.status === 'open' && i.priority === 'high').length
            const openTotal = items.filter(i => i.status === 'open').length
            const resolved = items.filter(i => i.status === 'resolved').length

            return (
              <div key={inspection.id} className="space-y-3">
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-stone-900">
                          {(inspection.properties as { address: string } | null)?.address ?? 'Unknown Property'}
                        </h3>
                        <Badge label={statusLabel(inspection.status)} status={inspection.status} />
                      </div>
                      <div className="flex gap-4 text-xs text-stone-500 mt-1 flex-wrap">
                        {inspection.scheduled_at && <span>Scheduled {formatDate(inspection.scheduled_at)}</span>}
                        {inspection.completed_at && <span>Completed {formatDate(inspection.completed_at)}</span>}
                        {inspection.cost && <span>{formatCurrency(inspection.cost)}</span>}
                      </div>
                    </div>
                    <InspectionActions mode="edit" inspection={inspection} properties={properties ?? []} />
                  </div>

                  {inspection.inspector_name && (
                    <div className="mb-4 text-sm text-stone-600">
                      <span className="font-medium">{inspection.inspector_name}</span>
                      {inspection.inspector_company && ` · ${inspection.inspector_company}`}
                      {inspection.inspector_phone && ` · ${inspection.inspector_phone}`}
                    </div>
                  )}

                  {/* Items summary */}
                  {items.length > 0 && (
                    <div className="flex items-center gap-4 text-xs mb-3">
                      {openHigh > 0 && <span className="text-red-600 font-medium">⚠ {openHigh} high priority open</span>}
                      <span className="text-stone-500">{openTotal} open · {resolved} resolved · {items.length} total</span>
                    </div>
                  )}

                  <InspectionActions mode="items" inspection={inspection} properties={properties ?? []} items={items as { id: string; description: string; priority: string; status: string; estimated_cost: number | null; category: string | null }[]} />
                </CardContent>
              </Card>

              <InspectionAnalysis
                inspectionId={inspection.id}
                propertyId={inspection.property_id ?? undefined}
                propertyAddress={(inspection.properties as { address: string } | null)?.address}
              />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
