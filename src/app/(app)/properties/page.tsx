import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, statusLabel } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { AddPropertyButton } from './add-property-button'
import { PropertyList } from '@/components/property-list'
import { getUserPremiumStatus, FREE_PROPERTY_LIMIT } from '@/lib/premium'

export default async function PropertiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: properties }, isPremium] = await Promise.all([
    supabase
      .from('properties')
      .select('*, property_visits(count), property_pros_cons(count)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    getUserPremiumStatus(supabase, user!.id),
  ])

  const statusOptions = ['watching', 'visited', 'offer_made', 'under_contract', 'purchased', 'passed']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Properties</h1>
          <p className="text-sm text-stone-500 mt-1">
            {properties?.length
              ? `${properties.length}${!isPremium ? `/${FREE_PROPERTY_LIMIT}` : ''} propert${properties.length === 1 ? 'y' : 'ies'} tracked`
              : 'Track homes you\'re interested in'}
          </p>
        </div>
        <AddPropertyButton propertyCount={properties?.length ?? 0} isPremium={isPremium} />
      </div>

      {!properties?.length ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No properties yet"
            description="Save homes you're interested in, track visits, and compare pros and cons."
            action={<AddPropertyButton propertyCount={0} isPremium={isPremium} />}
          />
        </Card>
      ) : (
        <>
          {/* Status filter pills */}
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map(s => {
              const count = properties.filter(p => p.status === s).length
              if (!count) return null
              return (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700">
                  <Badge label={statusLabel(s)} status={s} />
                  <span>{count}</span>
                </span>
              )
            })}
          </div>

          <PropertyList properties={properties} />
        </>
      )}
    </div>
  )
}
