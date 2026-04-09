import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, statusLabel } from '@/lib/utils'
import { Bed, Bath, Ruler, ExternalLink, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PropertyActions } from './property-actions'
import { ShareActions } from './share-actions'
import { NeighborhoodStats } from '@/components/neighborhood-stats'
import { ShouldIBuyReport } from '@/components/ai/should-i-buy'
import { OfferStrategy } from '@/components/ai/offer-strategy'
import { LiveValuation } from '@/components/ai/live-valuation'
import { SellerMotivation } from '@/components/ai/seller-motivation'
import { HomeBuyingProgress } from '@/components/home-buying-progress'

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: property },
    { data: pros },
    { data: cons },
    { data: visits },
    { data: inspections },
    { data: offers },
    { data: shares },
    { data: preApprovals },
  ] = await Promise.all([
    // RLS now handles access control — no explicit user_id filter needed
    supabase.from('properties').select('*').eq('id', id).single(),
    supabase.from('property_pros_cons').select('*').eq('property_id', id).eq('type', 'pro').order('created_at'),
    supabase.from('property_pros_cons').select('*').eq('property_id', id).eq('type', 'con').order('created_at'),
    supabase.from('property_visits').select('*').eq('property_id', id).order('visited_at', { ascending: false }),
    supabase.from('inspections').select('*').eq('property_id', id).order('created_at', { ascending: false }),
    supabase.from('offers').select('*').eq('property_id', id).order('offered_at', { ascending: false }),
    supabase.from('property_shares').select('*').eq('property_id', id).order('created_at'),
    supabase.from('pre_approvals').select('id').eq('user_id', user!.id).limit(1),
  ])

  if (!property) notFound()

  const isOwner = property.user_id === user!.id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/properties" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
          <ArrowLeft className="h-4 w-4" /> Properties
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-stone-900">{property.address}</h1>
              {property.is_primary && <span className="text-amber-600 font-medium text-sm">★ Primary</span>}
            </div>
            {(property.city || property.state) && (
              <p className="text-stone-500 text-sm mt-0.5">{[property.city, property.state, property.zip].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge label={statusLabel(property.status)} status={property.status} />
            <PropertyActions property={property} />
          </div>
        </div>
      </div>

      {/* Buying Journey Progress */}
      <HomeBuyingProgress
        property={property}
        hasPreApproval={(preApprovals?.length ?? 0) > 0}
        visitCount={visits?.length ?? 0}
        offerCount={offers?.length ?? 0}
        hasCompletedInspection={(inspections ?? []).some(i => i.status === 'completed')}
      />

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {property.price && (
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">List Price</p>
            <p className="text-lg font-bold text-stone-900">{formatCurrency(property.price)}</p>
          </CardContent></Card>
        )}
        {property.beds && (
          <Card><CardContent className="py-3 px-4 flex items-center gap-2">
            <Bed className="h-4 w-4 text-stone-400" />
            <div>
              <p className="text-xs text-stone-500">Beds</p>
              <p className="font-bold text-stone-900">{property.beds}</p>
            </div>
          </CardContent></Card>
        )}
        {property.baths && (
          <Card><CardContent className="py-3 px-4 flex items-center gap-2">
            <Bath className="h-4 w-4 text-stone-400" />
            <div>
              <p className="text-xs text-stone-500">Baths</p>
              <p className="font-bold text-stone-900">{property.baths}</p>
            </div>
          </CardContent></Card>
        )}
        {property.sqft && (
          <Card><CardContent className="py-3 px-4 flex items-center gap-2">
            <Ruler className="h-4 w-4 text-stone-400" />
            <div>
              <p className="text-xs text-stone-500">Sq Ft</p>
              <p className="font-bold text-stone-900">{property.sqft.toLocaleString()}</p>
            </div>
          </CardContent></Card>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pros & Cons */}
        <Card>
          <CardHeader><CardTitle>Pros & Cons</CardTitle></CardHeader>
          <CardContent>
            <PropertyActions property={property} showProsConsEditor pros={pros ?? []} cons={cons ?? []} />
          </CardContent>
        </Card>

        {/* Visit Log */}
        <Card>
          <CardHeader><CardTitle>Visit Log</CardTitle></CardHeader>
          <CardContent className="p-0">
            <PropertyActions property={property} showVisitLog visits={visits ?? []} />
          </CardContent>
        </Card>

        {/* Offers */}
        {offers && offers.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Offers</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-stone-100">
                {offers.map(offer => (
                  <li key={offer.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-stone-900">{formatCurrency(offer.amount)}</p>
                      <p className="text-xs text-stone-500">{formatDate(offer.offered_at)}</p>
                    </div>
                    <Badge label={statusLabel(offer.status)} status={offer.status} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {property.notes && (
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{property.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Links */}
        {property.listing_url && (
          <Card>
            <CardHeader><CardTitle>Links</CardTitle></CardHeader>
            <CardContent>
              <a href={property.listing_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4" /> View Listing
              </a>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Neighborhood Stats — full width */}
      <NeighborhoodStats zip={property.zip} />

      {/* AI Features — full width */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
          <span className="h-5 w-5 rounded bg-amber-100 flex items-center justify-center text-xs">✦</span>
          AI Analysis
        </h2>
        <p className="text-sm text-stone-500">Powered by Claude · Reports are cached for 7 days</p>
      </div>

      <LiveValuation propertyId={property.id} listPrice={property.price ?? undefined} />

      <ShouldIBuyReport
        propertyId={property.id}
        propertyAddress={property.address}
      />

      <SellerMotivation propertyId={property.id} />

      <OfferStrategy
        propertyId={property.id}
        listPrice={property.price ?? undefined}
      />

      {/* Sharing — only visible to the owner */}
      {isOwner && (
        <ShareActions
          propertyId={property.id}
          ownerId={user!.id}
          shares={shares ?? []}
        />
      )}
    </div>
  )
}
