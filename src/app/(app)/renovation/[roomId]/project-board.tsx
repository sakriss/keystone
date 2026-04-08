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
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, User, Calendar, Link2, ExternalLink } from 'lucide-react'
import { ProjectActions } from './project-actions'

const COLUMNS = [
  { id: 'on_hold',     label: 'On Hold',     bg: 'bg-stone-50',   header: 'bg-stone-200 text-stone-700',    dot: 'bg-stone-400'   },
  { id: 'planned',     label: 'Planned',     bg: 'bg-blue-50',    header: 'bg-blue-100 text-blue-800',      dot: 'bg-blue-500'    },
  { id: 'in_progress', label: 'In Progress', bg: 'bg-amber-50',   header: 'bg-amber-100 text-amber-800',    dot: 'bg-amber-500'   },
  { id: 'completed',   label: 'Completed',   bg: 'bg-green-50',   header: 'bg-green-100 text-green-800',    dot: 'bg-green-500'   },
  { id: 'cancelled',   label: 'Cancelled',   bg: 'bg-red-50',     header: 'bg-red-100 text-red-800',        dot: 'bg-red-400'     },
]

export type Project = {
  id: string
  room_id: string
  title: string
  description: string | null
  status: string
  priority: string
  is_diy: boolean
  budget_estimate: number | null
  actual_cost: number | null
  contractor_name: string | null
  contractor_phone: string | null
  contractor_quote: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  project_resources: { id: string; title: string; url: string | null; resource_type: string | null }[]
  room_photos: unknown[]
  [key: string]: unknown
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-stone-100 text-stone-600',
}

// --- Draggable card ---

interface CardProps {
  project: Project
  roomId: string
  isOverlay?: boolean
}

function ProjectCard({ project, roomId, isOverlay }: CardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: project.id })

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
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <button
            className="text-left flex-1 min-w-0"
            onClick={e => { e.stopPropagation(); setEditOpen(true) }}
          >
            <p className="font-semibold text-stone-900 leading-snug hover:text-amber-700 transition-colors">
              {project.title}
            </p>
            {project.description && (
              <p className="text-sm text-stone-500 mt-0.5 line-clamp-2">{project.description}</p>
            )}
          </button>
          <div className="shrink-0" onClick={e => e.stopPropagation()}>
            <ProjectActions mode="edit" project={project} roomId={roomId} open={editOpen} onOpenChange={setEditOpen} />
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`text-xs rounded-full px-2.5 py-1 font-medium capitalize ${PRIORITY_COLORS[project.priority] ?? PRIORITY_COLORS.medium}`}>
            {project.priority}
          </span>
          {project.is_diy && (
            <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-1 font-medium">DIY</span>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-1.5 text-sm text-stone-500">
          {project.budget_estimate != null && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span>{formatCurrency(project.budget_estimate)} est.</span>
              {project.actual_cost != null && (
                <span className="text-stone-400">· {formatCurrency(project.actual_cost)} actual</span>
              )}
            </div>
          )}
          {project.contractor_name && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>{project.contractor_name}</span>
            </div>
          )}
          {(project.start_date || project.end_date) && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {project.start_date ? formatDate(project.start_date) : '—'}
                {project.end_date ? ` → ${formatDate(project.end_date)}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Resources */}
        {project.project_resources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-100" onClick={e => e.stopPropagation()}>
            {project.project_resources.map(r => (
              <a
                key={r.id}
                href={r.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-stone-100 hover:bg-amber-50 px-2.5 py-1 text-xs text-stone-500 hover:text-amber-700 transition-colors"
              >
                <Link2 className="h-3 w-3" /> {r.title}
                {r.url && <ExternalLink className="h-2.5 w-2.5" />}
              </a>
            ))}
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
  projects: Project[]
  roomId: string
}

function ProjectColumn({ id, label, bg, header, dot, projects, roomId }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const total = projects.reduce((sum, p) => sum + (p.budget_estimate ?? 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border-2 min-h-[200px] min-w-[260px] flex-1 transition-all
        ${isOver ? 'border-amber-400 ring-2 ring-amber-200' : 'border-stone-200'}
      `}
    >
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-[10px] ${header}`}>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-xs opacity-50">({projects.length})</span>
        </div>
        {total > 0 && <span className="text-xs font-medium opacity-70">{formatCurrency(total)}</span>}
      </div>

      <div className={`flex flex-col gap-2 p-2 flex-1 rounded-b-[10px] ${bg}`}>
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} roomId={roomId} />
        ))}
      </div>
    </div>
  )
}

// --- Board ---

interface BoardProps {
  initialProjects: Project[]
  roomId: string
}

export function ProjectBoard({ initialProjects, roomId }: BoardProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])
  const [, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  function handleDragStart({ active }: DragStartEvent) {
    setActiveProject(projects.find(p => p.id === active.id) ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveProject(null)
    if (!over) return
    const newStatus = over.id as string
    const project = projects.find(p => p.id === active.id)
    if (!project || project.status === newStatus) return

    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: newStatus } : p))
    await supabase.from('room_projects').update({ status: newStatus }).eq('id', project.id)
    startTransition(() => router.refresh())
  }

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
          <ProjectColumn
            key={col.id}
            {...col}
            projects={projects.filter(p => p.status === col.id)}
            roomId={roomId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeProject ? (
          <ProjectCard project={activeProject} roomId={roomId} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
