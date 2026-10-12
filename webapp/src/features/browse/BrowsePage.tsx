import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMetadata } from '@/state/MetadataContext'
import { FilterBar } from '@/components/FilterBar'
import { PinButton } from '@/components/PinButton'
import { filterFiles, formatBytes } from '@/lib/filter'
import type { FileEntry } from '@/data/index'

function groupByVendorThenSubcategory(files: FileEntry[]): Map<string, Map<string, FileEntry[]>> {
  const byVendor = new Map<string, Map<string, FileEntry[]>>()
  for (const file of files) {
    if (!byVendor.has(file.vendor)) byVendor.set(file.vendor, new Map())
    const bySub = byVendor.get(file.vendor)!
    const key = file.subcategory ?? ''
    if (!bySub.has(key)) bySub.set(key, [])
    bySub.get(key)!.push(file)
  }
  return byVendor
}

export function BrowsePage() {
  const { metadata, loading, error } = useMetadata()
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const allTags = useMemo(
    () => [...new Set(metadata?.files.flatMap((f) => f.tags) ?? [])].sort(),
    [metadata],
  )

  const filtered = useMemo(
    () => (metadata ? filterFiles(metadata.files, { vendors: selectedVendors, tags: selectedTags }) : []),
    [metadata, selectedVendors, selectedTags],
  )

  const grouped = useMemo(() => groupByVendorThenSubcategory(filtered), [filtered])

  if (loading) return <div className="p-6 text-sm text-neutral-500">Loading index…</div>
  if (error) return <div className="p-6 text-sm text-red-600">Failed to load index: {error}</div>
  if (!metadata) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 text-xs text-neutral-500">
          {filtered.length} of {metadata.files.length} files
        </p>
        {[...grouped.entries()].map(([vendor, bySub]) => (
          <details key={vendor} open className="mb-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <summary className="cursor-pointer select-none rounded-t-lg bg-neutral-50 px-3 py-2 text-sm font-semibold dark:bg-neutral-900">
              {vendor} <span className="font-normal text-neutral-500">({[...bySub.values()].reduce((n, a) => n + a.length, 0)})</span>
            </summary>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {[...bySub.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([sub, entries]) => (
                <div key={sub || '(root)'} className="px-3 py-2">
                  {sub && <p className="mb-1 text-xs font-medium text-neutral-500">{sub}</p>}
                  <ul className="space-y-1">
                    {entries
                      .sort((a, b) => a.displayName.localeCompare(b.displayName))
                      .map((f) => (
                        <li key={f.path} className="flex items-center gap-2">
                          <Link
                            to={`/doc?path=${encodeURIComponent(f.path)}`}
                            className="flex-1 truncate text-sm text-neutral-800 hover:text-violet-600 dark:text-neutral-200 dark:hover:text-violet-400"
                          >
                            {f.displayName}
                            {f.tags.length > 0 && (
                              <span className="ml-2 text-xs text-neutral-400">{f.tags.join(', ')}</span>
                            )}
                          </Link>
                          <span className="shrink-0 text-xs text-neutral-400">{formatBytes(f.size)}</span>
                          <PinButton path={f.path} />
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
