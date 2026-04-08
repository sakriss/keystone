'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Sparkles, CheckCircle, AlertCircle, X, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { ParsedListing } from '@/app/api/ai/parse-listing/route'
import { FREE_PROPERTY_LIMIT } from '@/lib/premium'

const STATUS_OPTIONS = [
  { value: 'watching', label: 'Watching' },
  { value: 'visited', label: 'Visited' },
  { value: 'offer_made', label: 'Offer Made' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'passed', label: 'Passed' },
]

interface FormFields {
  address: string
  city: string
  state: string
  zip: string
  price: string
  beds: string
  baths: string
  sqft: string
  year_built: string
  listing_url: string
  status: string
  notes: string
}

const EMPTY: FormFields = {
  address: '', city: '', state: '', zip: '',
  price: '', beds: '', baths: '', sqft: '', year_built: '',
  listing_url: '', status: 'watching', notes: '',
}

type AutoFillState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; fieldsFound: string[]; confidence: string }
  | { status: 'error'; message: string }

interface Props {
  propertyCount: number
  isPremium: boolean
}

export function AddPropertyButton({ propertyCount, isPremium }: Props) {
  const atLimit = !isPremium && propertyCount >= FREE_PROPERTY_LIMIT
  const [open, setOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [fields, setFields] = useState<FormFields>(EMPTY)
  const [autoFill, setAutoFill] = useState<AutoFillState>({ status: 'idle' })
  const [lastParsedUrl, setLastParsedUrl] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  function set(key: keyof FormFields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  function handleClose() {
    setOpen(false)
    setFields(EMPTY)
    setAutoFill({ status: 'idle' })
    setLastParsedUrl('')
  }

  async function handleURLPaste(url: string) {
    set('listing_url', url)
    if (!url.startsWith('http')) return
    // Don't re-parse a URL we already parsed
    if (url === lastParsedUrl) return

    setLastParsedUrl(url)
    setAutoFill({ status: 'loading' })
    try {
      const res = await fetch('/api/ai/parse-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json() as ParsedListing & { error?: string }

      if (!res.ok || data.error) {
        setAutoFill({ status: 'error', message: data.error ?? 'Could not parse this listing.' })
        return
      }

      // Pre-fill only fields that were actually found — don't overwrite existing values with null
      setFields(prev => ({
        ...prev,
        address: data.address ?? prev.address,
        city: data.city ?? prev.city,
        state: data.state ?? prev.state,
        zip: data.zip ?? prev.zip,
        price: data.price != null ? String(data.price) : prev.price,
        beds: data.beds != null ? String(data.beds) : prev.beds,
        baths: data.baths != null ? String(data.baths) : prev.baths,
        sqft: data.sqft != null ? String(data.sqft) : prev.sqft,
        year_built: data.yearBuilt != null ? String(data.yearBuilt) : prev.year_built,
        notes: data.notes ?? prev.notes,
      }))

      setAutoFill({
        status: 'success',
        fieldsFound: data.fieldsFound ?? [],
        confidence: data.confidence ?? 'medium',
      })
    } catch {
      setAutoFill({ status: 'error', message: 'Something went wrong. Enter details manually.' })
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('properties').insert({
      user_id: user.id,
      address: fields.address,
      city: fields.city || null,
      state: fields.state || null,
      zip: fields.zip || null,
      price: fields.price ? Number(fields.price) : null,
      beds: fields.beds ? Number(fields.beds) : null,
      baths: fields.baths ? Number(fields.baths) : null,
      sqft: fields.sqft ? Number(fields.sqft) : null,
      year_built: fields.year_built ? Number(fields.year_built) : null,
      listing_url: fields.listing_url || null,
      status: fields.status || 'watching',
      notes: fields.notes || null,
    })

    if (!error) {
      handleClose()
      startTransition(() => router.refresh())
    }
  }

  return (
    <>
      <Button onClick={() => atLimit ? setUpgradeOpen(true) : setOpen(true)} variant={atLimit ? 'secondary' : 'primary'}>
        {atLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {atLimit ? 'Upgrade to Add More' : 'Add Property'}
      </Button>

      {/* Upgrade wall modal */}
      <Modal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} title="Upgrade to Premium">
        <div className="space-y-4 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mx-auto">
            <Lock className="h-6 w-6 text-amber-600" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-stone-900">You&apos;ve reached the free limit</p>
            <p className="text-sm text-stone-500">
              Free accounts can track up to {FREE_PROPERTY_LIMIT} properties. Upgrade to premium for unlimited properties and access to all AI features.
            </p>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Premium includes</p>
            <ul className="space-y-1.5 text-sm text-stone-700">
              {[
                'Unlimited properties',
                'AI "Should I Buy This?" reports',
                'Inspection PDF analyzer',
                'Offer strategy advisor',
                'Renovation ROI estimator',
                'Budget reality check',
                'Live valuations & comps',
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setUpgradeOpen(false)}>Not now</Button>
            <Button className="flex-1" onClick={() => setUpgradeOpen(false)}>
              Upgrade — coming soon
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={open} onClose={handleClose} title="Add Property" size="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* URL auto-fill */}
          <div className="space-y-2">
            <Input
              id="listing_url"
              name="listing_url"
              type="url"
              label="Listing URL"
              placeholder="Paste a listing URL to auto-fill details..."
              value={fields.listing_url}
              onChange={e => set('listing_url', e.target.value)}
              onBlur={e => {
                const url = e.target.value.trim()
                if (url && url !== fields.listing_url) handleURLPaste(url)
              }}
              onPaste={e => {
                const pasted = e.clipboardData.getData('text').trim()
                if (pasted.startsWith('http')) {
                  setTimeout(() => handleURLPaste(pasted), 0)
                }
              }}
            />

            {autoFill.status === 'loading' && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 px-1">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Auto-filling from listing…
              </div>
            )}

            {/* Auto-fill feedback */}
            {autoFill.status === 'success' && (
              <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-green-800 font-medium">
                    Auto-filled {autoFill.fieldsFound.length} fields
                    <span className="font-normal text-green-600 ml-1">
                      ({autoFill.confidence} confidence)
                    </span>
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">Review and correct anything that looks off.</p>
                </div>
                <button type="button" onClick={() => setAutoFill({ status: 'idle' })} className="text-green-400 hover:text-green-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {autoFill.status === 'error' && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800">{autoFill.message}</p>
                </div>
                <button type="button" onClick={() => setAutoFill({ status: 'idle' })} className="text-amber-400 hover:text-amber-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          {autoFill.status !== 'idle' && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-100" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-stone-400">Property Details</span></div>
            </div>
          )}

          <Input
            id="address" name="address" label="Address *" placeholder="123 Main St" required
            value={fields.address} onChange={e => set('address', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Input id="city" name="city" label="City" placeholder="Austin"
              value={fields.city} onChange={e => set('city', e.target.value)} />
            <Input id="state" name="state" label="State" placeholder="TX"
              value={fields.state} onChange={e => set('state', e.target.value)} />
            <Input id="zip" name="zip" label="ZIP" placeholder="78701"
              value={fields.zip} onChange={e => set('zip', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input id="price" name="price" type="number" label="List Price" placeholder="450000"
              value={fields.price} onChange={e => set('price', e.target.value)} />
            <Input id="beds" name="beds" type="number" label="Beds" placeholder="3"
              value={fields.beds} onChange={e => set('beds', e.target.value)} />
            <Input id="baths" name="baths" type="number" step="0.5" label="Baths" placeholder="2"
              value={fields.baths} onChange={e => set('baths', e.target.value)} />
            <Input id="sqft" name="sqft" type="number" label="Sq Ft" placeholder="1800"
              value={fields.sqft} onChange={e => set('sqft', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input id="year_built" name="year_built" type="number" label="Year Built" placeholder="1995"
              value={fields.year_built} onChange={e => set('year_built', e.target.value)} />
            <Select id="status" name="status" label="Status" options={STATUS_OPTIONS}
              value={fields.status} onChange={e => set('status', e.target.value)} />
          </div>

          <Textarea id="notes" name="notes" label="Notes" placeholder="Initial impressions…" rows={3}
            value={fields.notes} onChange={e => set('notes', e.target.value)} />

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button type="submit" loading={isPending} disabled={!fields.address}>Save Property</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
