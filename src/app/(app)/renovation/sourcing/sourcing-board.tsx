'use client'
import { useState, useEffect, useTransition } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  pointerWithin, rectIntersection,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'
import { SourcingActions } from './sourcing-actions'

const COLUMNS = [
  { id: 'tentative', label: 'Tentative', bg: 'bg-stone-50',    header: 'bg-stone-200 text-stone-700',   dot: 'bg-stone-400',   ring: 'ring-stone-300'   },
  { id: 'approved',  label: 'Approved',  bg: 'bg-green-50',    header: 'bg-green-100 text-green-800',   dot: 'bg-green-500',   ring: 'ring-green-300'   },
  { id: 'backup',    label: 'Backup',    bg: 'bg-blue-50',     header: 'bg-blue-100 text-blue-800',     dot: 'bg-blue-500',    ring: 'ring-blue-300'    },
  { id: 'later',     label: 'Later',     bg: 'bg-amber-50',    header: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500',   ring: 'ring-amber-300'   },
  { id: 'ordered',   label: 'Ordered',   bg: 'bg-purple-50',   header: 'bg-purple-100 text-purple-800', dot: 'bg-purple-500',  ring: 'ring-purple-300'  },
  { id: 'arrived',   label: 'Arrived',   bg: 'bg-emerald-50',  header: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', ring: 'ring-emerald-300' },
]

export type SourcingItem = {
  id: string
  room_id: string
  category: string
  item_description: string
  total_cost: number | null
  link: string | null
  status: string
  material_finish: string | null
  dimensions: string | null
  notes: string | null
  rooms?: { name: string } | null
  [key: string]: unknown
}

// --- Draggable card ---

interface CardProps {
  item: SourcingItem
  userId: string
  showRoom?: boolean
  isOverlay?: boolean
}

function SourcingCard({ item, userId, showRoom, isOverlay }: CardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })

  return (
    <>
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`bg-white rounded-xl border border-stone-200 p-4 select-none cursor-grab active:cursor-grabbing transition-all
          ${isDragging ? 'opacity-30 shadow-none' : 'shadow-sm hover:shadow-md hover:border-stone-300'}
          ${isOverlay ? 'shadow-xl rotate-1 opacity-100' : ''}
        `}
      >
        {/* Name row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <button
            className="text-left flex-1 min-w-0"
            onClick={e => { e.stopPropagation(); setEditOpen(true) }}
          >
            <p className="font-semibold text-stone-900 leading-snug hover:text-amber-700 transition-colors">
              {item.item_description}
            </p>
          </button>
          <div className="shrink-0" onClick={e => e.stopPropagation()}>
            <SourcingActions mode="edit" roomId={item.room_id} userId={userId} item={item} open={editOpen} onOpenChange={setEditOpen} />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1 text-sm text-stone-500">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-stone-400">{item.category}</span>
            {item.material_finish && (
              <span className="text-stone-400 italic">{item.material_finish}</span>
            )}
          </div>
          {item.total_cost != null && (
            <p className="font-medium text-stone-700">{formatCurrency(item.total_cost)}</p>
          )}
          {item.dimensions && (
            <p className="text-stone-400 text-xs">{item.dimensions}</p>
          )}
          {showRoom && item.rooms?.name && (
            <p className="text-stone-400 text-xs">{item.rooms.name}</p>
          )}
        </div>

        {/* Link */}
        {item.link && (
          <div className="mt-3 pt-3 border-t border-stone-100" onClick={e => e.stopPropagation()}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-800 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View product
            </a>
          </div>
        )}
      </div>
    </>
  )
}

// --- Droppable column ---

interface ColumnProps {
  id: string
  label: string
  bg: string
  header: string
  dot: string
  ring: string
  items: SourcingItem[]
  userId: string
  showRoom?: boolean
}

function SourcingColumn({ id, label, bg, header, dot, ring, items, userId, showRoom }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const total = items.reduce((sum, i) => sum + (i.total_cost ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border-2 min-h-[200px] min-w-[240px] flex-1 transition-all
        ${isOver ? `border-amber-400 ring-2 ring-amber-200` : 'border-stone-200'}
      `}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-[10px] ${header}`}>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-xs opacity-50">({items.length})</span>
        </div>
        {total > 0 && <span className="text-xs font-medium opacity-70">{formatCurrency(total)}</span>}
      </div>

      {/* Cards */}
      <div className={`flex flex-col gap-2 p-2 flex-1 rounded-b-[10px] ${bg}`}>
        {items.map(item => (
          <SourcingCard key={item.id} item={item} userId={userId} showRoom={showRoom} />
        ))}
      </div>
    </div>
  )
}

// --- Board ---

interface BoardProps {
  initialItems: SourcingItem[]
  userId: string
  showRoom?: boolean
}

export function SourcingBoard({ initialItems, userId, showRoom }: BoardProps) {
  const [items, setItems] = useState(initialItems)
  const [activeItem, setActiveItem] = useState<SourcingItem | null>(null)

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])
  const [, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveItem(items.find(i => i.id === active.id) ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveItem(null)
    if (!over) return
    const newStatus = over.id as string
    const item = items.find(i => i.id === active.id)
    if (!item || item.status === newStatus) return

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    await supabase.from('sourcing_items').update({ status: newStatus }).eq('id', item.id)
    startTransition(() => router.refresh())
  }

  // pointer-within first so the column you're hovering wins; fall back to rect overlap
  function collisionDetection(args: Parameters<typeof pointerWithin>[0]) {
    const pointer = pointerWithin(args)
    return pointer.length > 0 ? pointer : rectIntersection(args)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map(col => (
          <SourcingColumn
            key={col.id}
            {...col}
            items={items.filter(i => i.status === col.id)}
            userId={userId}
            showRoom={showRoom}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <SourcingCard item={activeItem} userId={userId} showRoom={showRoom} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
