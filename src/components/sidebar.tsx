'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Home, FileCheck, DollarSign, Hammer,
  FolderOpen, ChevronDown, ChevronRight, LogOut, Menu, X, Building2,
  ClipboardList, ShieldCheck, CalendarCheck, Banknote, BedDouble, ShoppingBag,
  Truck, FileWarning, CalendarDays
} from 'lucide-react'

interface NavItem {
  label: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
  excludePaths?: string[]
}

const NAV: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Properties',
    icon: Building2,
    href: '/properties',
  },
  {
    label: 'Purchase Process',
    icon: FileCheck,
    children: [
      { label: 'Pre-Approvals', href: '/purchase/pre-approvals', icon: Banknote },
      { label: 'Inspections', href: '/purchase/inspections', icon: ClipboardList },
      { label: 'Insurance', href: '/purchase/insurance', icon: ShieldCheck },
      { label: 'Closing Checklist', href: '/purchase/closing', icon: CalendarCheck },
      { label: 'Moving Checklist', href: '/purchase/moving-checklist', icon: Truck },
    ],
  },
  {
    label: 'Budget & Finance',
    href: '/budget',
    icon: DollarSign,
  },
  {
    label: 'Maintenance',
    href: '/maintenance',
    icon: CalendarDays,
  },
  {
    label: 'Home Renovation',
    icon: Hammer,
    children: [
      { label: 'Rooms & Projects', href: '/renovation', icon: BedDouble, excludePaths: ['/renovation/sourcing', '/renovation/timeline', '/renovation/permits'] },
      { label: 'Sourcing', href: '/renovation/sourcing', icon: ShoppingBag },
      { label: 'Timeline', href: '/renovation/timeline', icon: CalendarCheck },
      { label: 'Permit Tracker', href: '/renovation/permits', icon: FileWarning },
    ],
  },
  {
    label: 'Documents',
    href: '/documents',
    icon: FolderOpen,
  },
]

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (!item.children) return false
    return item.children.some(c => c.href && pathname.startsWith(c.href))
  })

  const isActive = item.href
    ? pathname === item.href ||
      (item.href !== '/dashboard' &&
        pathname.startsWith(item.href) &&
        !(item.excludePaths?.some(p => pathname.startsWith(p))))
    : false

  if (item.children) {
    return (
      <div>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            'text-stone-300 hover:bg-stone-800 hover:text-white',
            open && 'text-white'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />
          }
        </button>
        {open && (
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-stone-700 pl-3">
            {item.children.map(child => (
              <NavLink key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-amber-600 text-white font-medium'
          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}

function SidebarContent({ onNavClick, hideHeader }: { onNavClick?: () => void; hideHeader?: boolean }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-full flex-col bg-stone-900" onClick={onNavClick}>
      {/* Logo */}
      {!hideHeader && (
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-stone-800">
          <img src="/logo.png" alt="Keystone" className="h-8 w-8 rounded-lg shrink-0 object-cover object-top" />
          <span className="text-white font-bold text-lg tracking-tight">Keystone</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
        {NAV.map(item => (
          <NavLink key={item.label} item={item} />
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-2 py-3 border-t border-stone-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-400 hover:bg-stone-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col h-full">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-stone-900 border-b border-stone-800">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-stone-300 hover:text-white p-1"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Keystone" className="h-7 w-7 rounded-lg shrink-0 object-cover object-top" />
          <span className="text-white font-bold">Keystone</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="w-64 flex-shrink-0">
            <div className="h-full pt-14">
              <SidebarContent onNavClick={() => setMobileOpen(false)} hideHeader />
            </div>
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}
    </>
  )
}
