'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, statusLabel } from '@/lib/utils'
import { Bed, Bath, Ruler, ExternalLink, GitCompareArrows } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'

type Property = Database['public']['Tables']['properties']['Row'] & {
  property_visits?: { count: number }[]
  property_pros_cons?: { count: number }[]
}

interface Props {
  properties: Property[]
}

const MAX_COMPARE = 3

function PropertyListInner({ properties }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_COMPARE) {
        next.add(id)
      }
      return next
    })
  }

  function goCompare() {
    router.push(`/properties/compare?ids=${[...selected].join(',')}`)
  }

  const atMax = selected.size >= MAX_COMPARE

  return (
    <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {properties.map(p => {
          const isSelected = selected.has(p.id)
          const isDisabled = atMax && !isSelected

          return (
            <div key={p.id} className="relative">
              {/* Compare toggle */}
              <button
                onClick={() => toggle(p.id)}
                aria-label={isSelected ? 'Remove from compare' : 'Add to compare'}
                disabled={isDisabled}
                className={[
                  'absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors',
                  isSelected
                    ? 'bg-amber-600 border-amber-600 text-white'
                    : isDisabled
                    ? 'bg-stone-100 border-stone-200 text-stone-300 cursor-not-allowed'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-amber-400 hover:text-amber-600',
                ].join(' ')}
              >
                <GitCompareArrows className="h-3 w-3" />
                {isSelected ? 'Added' : 'Compare'}
              </button>

              <Link href={`/properties/${p.id}`}>
                <Card className={[
                  'hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full',
                  isSelected ? 'ring-2 ring-amber-500' : '',
                ].join(' ')}>
                  <CardContent className="p-4 flex flex-col gap-3 h-full pt-8">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900 leading-tight">{p.address}</p>
                        {(p.city || p.state) && (
                          <p className="text-xs text-stone-500 mt-0.5">{[p.city, p.state].filter(Boolean).join(', ')} {p.zip}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge label={statusLabel(p.status)} status={p.status} />
                        {p.is_primary && <span className="text-xs text-amber-600 font-medium">★ Primary</span>}
                      </div>
                    </div>

                    {p.price && (
                      <p className="text-lg font-bold text-stone-900">{formatCurrency(p.price)}</p>
                    )}

                    <div className="flex gap-4 text-xs text-stone-500">
                      {p.beds && (
                        <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.beds} bd</span>
                      )}
                      {p.baths && (
                        <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{p.baths} ba</span>
                      )}
                      {p.sqft && (
                        <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{p.sqft.toLocaleString()} sqft</span>
                      )}
                    </div>

                    {p.listing_url && (
                      <a
                        href={p.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> View listing
                      </a>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Sticky compare bar */}
      {selected.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-full bg-stone-900 px-5 py-3 shadow-xl text-white text-sm">
          <span>
            <span className="font-semibold">{selected.size}</span> properties selected
          </span>
          <Button size="sm" onClick={goCompare}>
            <GitCompareArrows className="h-4 w-4" />
            Compare
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-stone-400 hover:text-white text-xs underline"
          >
            Clear
          </button>
        </div>
      )}
    </>
  )
}

// Wrap in Suspense per Next.js docs recommendation for client components
// on pages that may be prerendered
export function PropertyList({ properties }: Props) {
  return (
    <Suspense fallback={null}>
      <PropertyListInner properties={properties} />
    </Suspense>
  )
}
