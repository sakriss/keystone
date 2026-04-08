import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, statusLabel } from '@/lib/utils'
import Link from 'next/link'
import {
  Building2, DollarSign, Hammer, FileText, ArrowRight,
  TrendingUp, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: properties },
    { data: preApprovals },
    { data: inspections },
    { data: rooms },
    { data: documents },
    { data: budgetItems },
    { data: inspectionItems },
  ] = await Promise.all([
    supabase.from('properties').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('pre_approvals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
    supabase.from('inspections').select('*, properties(address)').order('created_at', { ascending: false }).limit(3),
    supabase.from('rooms').select('*, room_projects(*)').eq('user_id', user!.id),
    supabase.from('documents').select('*').eq('user_id', user!.id),
    supabase.from('budget_items').select('*').eq('user_id', user!.id),
    supabase.from('inspection_items').select('*').eq('status', 'open').limit(5),
  ])

  const totalMonthlyBudget = budgetItems?.reduce((sum, item) => {
    if (item.frequency === 'monthly') return sum + (item.estimated_monthly || 0)
    if (item.frequency === 'annual') return sum + (item.estimated_monthly || 0) / 12
    return sum
  }, 0) ?? 0

  const activeProjects = rooms?.flatMap(r => (r.room_projects as { status: string }[] || []).filter(p => p.status === 'in_progress')).length ?? 0
  const primaryProperty = properties?.find(p => p.is_primary) ?? properties?.[0]

  const stats = [
    {
      label: 'Properties Tracked',
      value: properties?.length ?? 0,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/properties',
    },
    {
      label: 'Est. Monthly Cost',
      value: formatCurrency(totalMonthlyBudget),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
      href: '/budget',
    },
    {
      label: 'Active Reno Projects',
      value: activeProjects,
      icon: Hammer,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/renovation',
    },
    {
      label: 'Documents Stored',
      value: documents?.length ?? 0,
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      href: '/documents',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <p className="text-sm text-stone-500 mt-1">
          {primaryProperty
            ? `Tracking ${properties?.length ?? 0} propert${(properties?.length ?? 0) === 1 ? 'y' : 'ies'}`
            : 'Welcome to Keystone — start by adding a property.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-3 py-4 px-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-stone-900 truncate">{stat.value}</p>
                  <p className="text-xs text-stone-500 leading-tight">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Properties</CardTitle>
              <Link href="/properties" className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!properties?.length ? (
              <div className="px-5 py-8 text-center text-sm text-stone-400">
                No properties yet. <Link href="/properties" className="text-amber-600 hover:underline">Add one</Link>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {properties.map(p => (
                  <li key={p.id}>
                    <Link href={`/properties/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">{p.address}</p>
                        <p className="text-xs text-stone-500">{p.city}{p.state ? `, ${p.state}` : ''} {p.price ? `· ${formatCurrency(p.price)}` : ''}</p>
                      </div>
                      <Badge label={statusLabel(p.status)} status={p.status} className="ml-3 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pre-Approvals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pre-Approvals</CardTitle>
              <Link href="/purchase/pre-approvals" className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!preApprovals?.length ? (
              <div className="px-5 py-8 text-center text-sm text-stone-400">
                No pre-approvals yet. <Link href="/purchase/pre-approvals" className="text-amber-600 hover:underline">Add one</Link>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {preApprovals.map(pa => {
                  const expired = pa.expires_at && new Date(pa.expires_at) < new Date()
                  const expiringSoon = pa.expires_at && !expired && new Date(pa.expires_at) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  return (
                    <li key={pa.id} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">{pa.lender_name}</p>
                        <p className="text-xs text-stone-500">
                          {formatCurrency(pa.amount)}
                          {pa.interest_rate ? ` · ${pa.interest_rate}%` : ''}
                          {pa.expires_at ? ` · Exp. ${formatDate(pa.expires_at)}` : ''}
                        </p>
                      </div>
                      {expired && <AlertCircle className="h-4 w-4 text-red-500 shrink-0 ml-2" />}
                      {expiringSoon && <Clock className="h-4 w-4 text-amber-500 shrink-0 ml-2" />}
                      {!expired && !expiringSoon && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 ml-2" />}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Open Inspection Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Open Inspection Items</CardTitle>
              <Link href="/purchase/inspections" className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!inspectionItems?.length ? (
              <div className="px-5 py-8 text-center text-sm text-stone-400">
                No open inspection items.
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {inspectionItems.map(item => (
                  <li key={item.id} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm text-stone-800 truncate">{item.description}</p>
                    <Badge label={item.priority} status={item.priority} className="ml-3 shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Renovation Rooms */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Renovation Rooms</CardTitle>
              <Link href="/renovation" className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!rooms?.length ? (
              <div className="px-5 py-8 text-center text-sm text-stone-400">
                No rooms yet. <Link href="/renovation" className="text-amber-600 hover:underline">Add a room</Link>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {rooms.slice(0, 5).map(room => {
                  const projects = (room.room_projects as { status: string }[] || [])
                  const inProgress = projects.filter(p => p.status === 'in_progress').length
                  const done = projects.filter(p => p.status === 'completed').length
                  return (
                    <li key={room.id}>
                      <Link href={`/renovation/${room.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 transition-colors">
                        <p className="text-sm font-medium text-stone-900">{room.name}</p>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {inProgress > 0 && <Badge label={`${inProgress} active`} status="in_progress" />}
                          {done > 0 && <Badge label={`${done} done`} status="completed" />}
                          {!projects.length && <span className="text-xs text-stone-400">No projects</span>}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
