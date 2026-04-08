import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'
import { FolderOpen, FileText, Download, Trash2 } from 'lucide-react'
import { DocumentActions } from './document-actions'

const CATEGORY_LABELS: Record<string, string> = {
  contract: 'Contract',
  disclosure: 'Disclosure',
  inspection: 'Inspection',
  title: 'Title',
  appraisal: 'Appraisal',
  hoa: 'HOA',
  insurance: 'Insurance',
  mortgage: 'Mortgage',
  warranty: 'Warranty',
  other: 'Other',
}

const CATEGORY_ICONS: Record<string, string> = {
  contract: '📋',
  disclosure: '📝',
  inspection: '🔍',
  title: '🏠',
  appraisal: '📊',
  hoa: '🏘️',
  insurance: '🛡️',
  mortgage: '🏦',
  warranty: '✅',
  other: '📁',
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: properties } = await supabase
    .from('properties')
    .select('id, address')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const { data: documents } = await supabase
    .from('documents')
    .select('*, properties(address)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  type Doc = NonNullable<typeof documents>[number]
  // Group by category
  const byCategory = documents?.reduce((acc, doc) => {
    const cat = doc.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(doc)
    return acc
  }, {} as Record<string, Doc[]>) ?? {} as Record<string, Doc[]>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Document Vault</h1>
          <p className="text-sm text-stone-500 mt-1">{documents?.length ?? 0} document{documents?.length !== 1 ? 's' : ''} stored</p>
        </div>
        <DocumentActions mode="add" properties={properties ?? []} />
      </div>

      {!documents?.length ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title="No documents yet"
            description="Upload and organize all your home purchase documents — contracts, disclosures, inspection reports, and more."
            action={<DocumentActions mode="add" properties={properties ?? []} />}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {(Object.entries(byCategory) as [string, Doc[]][]).map(([cat, docs]) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle>
                  {CATEGORY_ICONS[cat] ?? '📁'} {CATEGORY_LABELS[cat] ?? cat}
                  <span className="ml-2 text-sm font-normal text-stone-400">({docs!.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-stone-100">
                  {docs!.map(doc => (
                    <li key={doc.id} className="flex items-center gap-3 px-5 py-3">
                      <FileText className="h-5 w-5 text-stone-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{doc.title}</p>
                        <div className="flex gap-3 text-xs text-stone-400 flex-wrap">
                          {doc.properties && <span>{(doc.properties as { address: string }).address}</span>}
                          <span>{formatDate(doc.created_at)}</span>
                          {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                        </div>
                        {doc.notes && <p className="text-xs text-stone-500 mt-0.5">{doc.notes}</p>}
                      </div>
                      <DocumentActions mode="download" doc={doc} properties={properties ?? []} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
