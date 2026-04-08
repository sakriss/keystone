'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, ThumbsUp, ThumbsDown, Trash2, Star, Calendar, Edit } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'

type Property = Database['public']['Tables']['properties']['Row']
type ProCon = Database['public']['Tables']['property_pros_cons']['Row']
type Visit = Database['public']['Tables']['property_visits']['Row']

const STATUS_OPTIONS = [
  { value: 'watching', label: 'Watching' },
  { value: 'visited', label: 'Visited' },
  { value: 'offer_made', label: 'Offer Made' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'passed', label: 'Passed' },
]

interface Props {
  property: Property
  showProsConsEditor?: boolean
  pros?: ProCon[]
  cons?: ProCon[]
  showVisitLog?: boolean
  visits?: Visit[]
}

export function PropertyActions({ property, showProsConsEditor, pros, cons, showVisitLog, visits }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [proText, setProText] = useState('')
  const [conText, setConText] = useState('')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const [visitNotes, setVisitNotes] = useState('')
  const [visitRating, setVisitRating] = useState('3')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const refresh = () => startTransition(() => router.refresh())

  async function addPro() {
    if (!proText.trim()) return
    await supabase.from('property_pros_cons').insert({ property_id: property.id, type: 'pro', text: proText.trim() })
    setProText('')
    refresh()
  }

  async function addCon() {
    if (!conText.trim()) return
    await supabase.from('property_pros_cons').insert({ property_id: property.id, type: 'con', text: conText.trim() })
    setConText('')
    refresh()
  }

  async function deleteProCon(id: string) {
    await supabase.from('property_pros_cons').delete().eq('id', id)
    refresh()
  }

  async function addVisit() {
    await supabase.from('property_visits').insert({
      property_id: property.id,
      visited_at: visitDate,
      notes: visitNotes || null,
      overall_rating: Number(visitRating),
    })
    setVisitNotes('')
    setVisitRating('3')
    refresh()
  }

  async function updateProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    await supabase.from('properties').update({
      address: fd.get('address') as string,
      city: (fd.get('city') as string) || null,
      state: (fd.get('state') as string) || null,
      zip: (fd.get('zip') as string) || null,
      price: fd.get('price') ? Number(fd.get('price')) : null,
      beds: fd.get('beds') ? Number(fd.get('beds')) : null,
      baths: fd.get('baths') ? Number(fd.get('baths')) : null,
      sqft: fd.get('sqft') ? Number(fd.get('sqft')) : null,
      year_built: fd.get('year_built') ? Number(fd.get('year_built')) : null,
      listing_url: (fd.get('listing_url') as string) || null,
      status: fd.get('status') as string,
      notes: (fd.get('notes') as string) || null,
      is_primary: fd.get('is_primary') === 'on',
    }).eq('id', property.id)
    setEditOpen(false)
    refresh()
  }

  // Render just the edit button when no special mode
  if (!showProsConsEditor && !showVisitLog) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Edit className="h-4 w-4" /> Edit
        </Button>
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Property" size="lg">
          <form onSubmit={updateProperty} className="flex flex-col gap-4">
            <Input id="e_address" name="address" label="Address *" defaultValue={property.address} required />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Input id="e_city" name="city" label="City" defaultValue={property.city ?? ''} />
              <Input id="e_state" name="state" label="State" defaultValue={property.state ?? ''} />
              <Input id="e_zip" name="zip" label="ZIP" defaultValue={property.zip ?? ''} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input id="e_price" name="price" type="number" label="Price" defaultValue={property.price ?? ''} />
              <Input id="e_beds" name="beds" type="number" label="Beds" defaultValue={property.beds ?? ''} />
              <Input id="e_baths" name="baths" type="number" step="0.5" label="Baths" defaultValue={property.baths ?? ''} />
              <Input id="e_sqft" name="sqft" type="number" label="Sq Ft" defaultValue={property.sqft ?? ''} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input id="e_year" name="year_built" type="number" label="Year Built" defaultValue={property.year_built ?? ''} />
              <Select id="e_status" name="status" label="Status" options={STATUS_OPTIONS} defaultValue={property.status} />
            </div>
            <Input id="e_url" name="listing_url" type="url" label="Listing URL" defaultValue={property.listing_url ?? ''} />
            <Textarea id="e_notes" name="notes" label="Notes" defaultValue={property.notes ?? ''} rows={3} />
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="is_primary" defaultChecked={property.is_primary} className="rounded" />
              Mark as primary property
            </label>
            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isPending}>Save</Button>
            </div>
          </form>
        </Modal>
      </>
    )
  }

  if (showProsConsEditor) {
    return (
      <div className="space-y-4">
        {/* Pros */}
        <div>
          <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1.5">
            <ThumbsUp className="h-4 w-4" /> Pros ({pros?.length ?? 0})
          </p>
          <ul className="space-y-1.5 mb-2">
            {pros?.map(item => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-green-50 px-3 py-2">
                <span className="text-sm text-green-800">{item.text}</span>
                <button onClick={() => deleteProCon(item.id)} className="text-green-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              value={proText}
              onChange={e => setProText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPro())}
              placeholder="Add a pro..."
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Button size="sm" onClick={addPro} variant="secondary"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        {/* Cons */}
        <div>
          <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1.5">
            <ThumbsDown className="h-4 w-4" /> Cons ({cons?.length ?? 0})
          </p>
          <ul className="space-y-1.5 mb-2">
            {cons?.map(item => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2">
                <span className="text-sm text-red-800">{item.text}</span>
                <button onClick={() => deleteProCon(item.id)} className="text-red-300 hover:text-red-600 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              value={conText}
              onChange={e => setConText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCon())}
              placeholder="Add a con..."
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Button size="sm" onClick={addCon} variant="secondary"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    )
  }

  if (showVisitLog) {
    return (
      <div>
        <ul className="divide-y divide-stone-100">
          {!visits?.length ? (
            <li className="px-5 py-6 text-center text-sm text-stone-400">No visits logged yet.</li>
          ) : (
            visits.map(v => (
              <li key={v.id} className="px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-stone-400" />
                    <span className="text-sm font-medium text-stone-800">{formatDate(v.visited_at)}</span>
                  </div>
                  {v.overall_rating && (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < v.overall_rating! ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`} />
                      ))}
                    </div>
                  )}
                </div>
                {v.notes && <p className="text-sm text-stone-600 mt-1 ml-6">{v.notes}</p>}
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-stone-100 px-5 py-4 bg-stone-50 rounded-b-xl space-y-3">
          <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Log a Visit</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={visitDate}
              onChange={e => setVisitDate(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <select
              value={visitRating}
              onChange={e => setVisitRating(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {[1,2,3,4,5].map(r => <option key={r} value={r}>{'★'.repeat(r)} {r}/5</option>)}
            </select>
          </div>
          <input
            value={visitNotes}
            onChange={e => setVisitNotes(e.target.value)}
            placeholder="Notes from visit..."
            className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <Button size="sm" onClick={addVisit} loading={isPending}>
            <Plus className="h-3.5 w-3.5" /> Log Visit
          </Button>
        </div>
      </div>
    )
  }

  return null
}
