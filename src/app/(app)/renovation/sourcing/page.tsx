import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SourcingActions } from './sourcing-actions'
import { SourcingBoard } from './sourcing-board'

export default async function SourcingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: items }, { data: rooms }] = await Promise.all([
    supabase
      .from('sourcing_items')
      .select('*, rooms(name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase.from('rooms').select('id, name').eq('user_id', user!.id).order('sort_order'),
  ])

  const totalApproved = items?.filter(i => i.status === 'approved').reduce((sum, i) => sum + (i.total_cost || 0), 0) ?? 0
  const totalAll = items?.reduce((sum, i) => sum + (i.total_cost || 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Sourcing</h1>
          <p className="text-sm text-stone-500 mt-0.5">Drag items between columns to update their status</p>
        </div>
        {rooms && rooms.length > 0 && (
          <SourcingActions mode="add" roomId={rooms[0].id} userId={user!.id} />
        )}
      </div>

      {/* Summary stats */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Total Items</p>
            <p className="text-xl font-bold text-stone-900">{items.length}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Approved Cost</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalApproved)}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">If All Purchased</p>
            <p className="text-xl font-bold text-stone-900">{formatCurrency(totalAll)}</p>
          </CardContent></Card>
          <Card><CardContent className="py-3 px-4">
            <p className="text-xs text-stone-500">Rooms Tracked</p>
            <p className="text-xl font-bold text-stone-900">{new Set(items.map(i => i.room_id)).size}</p>
          </CardContent></Card>
        </div>
      )}

      {!items?.length ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 mb-3">
              <ShoppingBag className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-1">No sourcing items yet</h3>
            <p className="text-sm text-stone-500 mb-4">Track products, materials, and appliances you plan to purchase.</p>
            {rooms && rooms.length > 0 && (
              <SourcingActions mode="add" roomId={rooms[0].id} userId={user!.id} />
            )}
          </div>
        </Card>
      ) : (
        <SourcingBoard initialItems={items} userId={user!.id} showRoom />
      )}
    </div>
  )
}
