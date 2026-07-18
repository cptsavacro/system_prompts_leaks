import { useMemo, useState } from 'react'
import { useMetadata } from '@/state/MetadataContext'
import { useSelection } from '@/state/SelectionContext'
import { FilterBar } from '@/components/FilterBar'
import { filterFiles, formatBytes } from '@/lib/filter'
import { loadContentBatch } from '@/lib/contentLoader'
import { downloadBlob } from '@/lib/download'
import type { FileEntry } from '@/data/index'

type Schema = 'flat' | 'chat'
type Scope = 'filtered' | 'working-set'

function toFlatRecord(entry: FileEntry, text: string) {
  return {
    vendor: entry.vendor,
    product: entry.subcategory ?? entry.slug,
    displayName: entry.displayName,
    path: entry.path,
    tags: entry.tags,
    wordCount: entry.wordCount,
    text,
  }
}

function toChatRecord(text: string) {
  return { messages: [{ role: 'system', content: text }] }
}

export function ExportPage() {
  const { metadata, loading, error, byPath } = useMetadata()
  const { pinned } = useSelection()
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [schema, setSchema] = useState<Schema>('flat')
  const [scope, setScope] = useState<Scope>('filtered')
  const [busy, setBusy] = useState(false)

  const allTags = useMemo(() => [...new Set(metadata?.files.flatMap((f) => f.tags) ?? [])].sort(), [metadata])

  const filtered = useMemo(
    () => (metadata ? filterFiles(metadata.files, { vendors: selectedVendors, tags: selectedTags }) : []),
    [metadata, selectedVendors, selectedTags],
  )

  const workingSetEntries = useMemo(
    () => pinned.map((p) => byPath.get(p)).filter((e): e is FileEntry => Boolean(e)),
    [byPath, pinned],
  )

  const selectionForExport = scope === 'filtered' ? filtered : workingSetEntries
  const totalSize = selectionForExport.reduce((n, f) => n + f.size, 0)

  const handleExport = async () => {
    if (selectionForExport.length === 0) return
    setBusy(true)
    try {
      const contents = await loadContentBatch(selectionForExport.map((e) => ({ vendor: e.vendor, path: e.path })))
      const lines = selectionForExport.map((entry) => {
        const text = contents.get(entry.path) ?? ''
        const record = schema === 'flat' ? toFlatRecord(entry, text) : toChatRecord(text)
        return JSON.stringify(record)
      })
      const filename = `system-prompts-${schema}-${scope}-${new Date().toISOString().slice(0, 10)}.jsonl`
      downloadBlob(filename, lines.join('\n') + '\n', 'application/x-ndjson')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-neutral-500">Loading index…</div>
  if (error) return <div className="p-6 text-sm text-red-600">Failed to load index: {error}</div>
  if (!metadata) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-4 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" checked={scope === 'filtered'} onChange={() => setScope('filtered')} />
          Filtered set
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" checked={scope === 'working-set'} onChange={() => setScope('working-set')} />
          Working set ({pinned.length})
        </label>
        <div className="ml-4 flex items-center gap-1 text-sm">
          <span className="text-neutral-500">Schema:</span>
          <select
            value={schema}
            onChange={(e) => setSchema(e.target.value as Schema)}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="flat">Flat ({'{vendor, product, text, ...}'})</option>
            <option value="chat">Chat / fine-tuning ({'{messages: [{role: "system", ...}]}'})</option>
          </select>
        </div>
      </div>

      {scope === 'filtered' && (
        <FilterBar
          vendors={metadata.vendors}
          allTags={allTags}
          selectedVendors={selectedVendors}
          selectedTags={selectedTags}
          onToggleVendor={(v) => setSelectedVendors((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))}
          onToggleTag={(t) => setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
          onClear={() => {
            setSelectedVendors([])
            setSelectedTags([])
          }}
        />
      )}

      <div className="flex flex-1 flex-col items-start gap-3 p-4">
        <p className="text-sm">
          {selectionForExport.length} document(s) selected · ~{formatBytes(totalSize)} of raw text
        </p>
        <button
          type="button"
          disabled={selectionForExport.length === 0 || busy}
          onClick={() => void handleExport()}
          className="rounded-md border border-violet-500 px-4 py-2 text-sm font-medium text-violet-700 disabled:opacity-40 dark:text-violet-300"
        >
          {busy ? 'Building JSONL…' : `Export ${selectionForExport.length} document(s) as .jsonl`}
        </button>
        {scope === 'working-set' && pinned.length === 0 && (
          <p className="text-xs text-neutral-500">Pin documents from Browse or Search to build a working set to export.</p>
        )}
      </div>
    </div>
  )
}
