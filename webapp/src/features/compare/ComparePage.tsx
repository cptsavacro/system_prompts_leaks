import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diffLines, type Change } from 'diff'
import { useMetadata } from '@/state/MetadataContext'
import { useSelection } from '@/state/SelectionContext'
import { loadContentBatch } from '@/lib/contentLoader'

function DiffView({ before, after }: { before: string; after: string }) {
  const changes: Change[] = useMemo(() => diffLines(before, after), [before, after])
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
      {changes.map((part, i) => (
        <span
          key={i}
          className={
            part.added
              ? 'block bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
              : part.removed
                ? 'block bg-red-500/15 text-red-800 line-through dark:text-red-300'
                : 'block'
          }
        >
          {part.value}
        </span>
      ))}
    </pre>
  )
}

export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const { byPath, loading: metaLoading } = useMetadata()
  const { pinned } = useSelection()

  const pathsParam = params.get('paths')
  const paths = useMemo(
    () => (pathsParam ? pathsParam.split(',').map((p) => decodeURIComponent(p)).filter(Boolean) : pinned),
    [pathsParam, pinned],
  )

  const [contents, setContents] = useState<Map<string, string>>(new Map())
  const [showDiff, setShowDiff] = useState(false)

  useEffect(() => {
    const refs = paths
      .map((p) => byPath.get(p))
      .filter((e): e is NonNullable<typeof e> => Boolean(e))
      .map((e) => ({ vendor: e.vendor, path: e.path }))
    if (refs.length === 0) return
    let cancelled = false
    loadContentBatch(refs).then((result) => {
      if (!cancelled) setContents(result)
    })
    return () => {
      cancelled = true
    }
  }, [paths, byPath])

  if (metaLoading) return <div className="p-6 text-sm text-neutral-500">Loading index…</div>

  const entries = paths.map((p) => byPath.get(p)).filter((e): e is NonNullable<typeof e> => Boolean(e))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <p className="text-sm font-medium">Comparing {entries.length} document(s)</p>
        {!pathsParam && <p className="text-xs text-neutral-500">(showing the current working set — pin more from Browse/Search)</p>}
        {entries.length === 2 && (
          <button
            type="button"
            onClick={() => setShowDiff((v) => !v)}
            className="ml-auto rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
          >
            {showDiff ? 'Show side-by-side' : 'Show line diff'}
          </button>
        )}
        {pathsParam && (
          <button
            type="button"
            onClick={() => setParams({})}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
          >
            Use working set instead
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {entries.length === 0 && (
          <p className="text-sm text-neutral-500">Nothing to compare yet. Pin documents from Browse or Search, then come back here.</p>
        )}
        {entries.length === 2 && showDiff ? (
          <DiffView before={contents.get(entries[0].path) ?? ''} after={contents.get(entries[1].path) ?? ''} />
        ) : (
          <div className="flex h-full min-h-[60vh] gap-3">
            {entries.map((entry) => (
              <div key={entry.path} className="flex min-w-[320px] flex-1 flex-col rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold dark:border-neutral-800 dark:bg-neutral-900">
                  {entry.vendor} · {entry.displayName}
                </div>
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed">
                  {contents.get(entry.path) ?? 'Loading…'}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
