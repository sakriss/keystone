import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-full bg-stone-50">
      <Sidebar />
      {/* Main content — offset for mobile top bar */}
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
