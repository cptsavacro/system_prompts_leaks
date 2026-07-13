import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { deleteDraft, listDrafts, saveDraft, type Draft } from '@/lib/db'
import { loadContentBatch } from '@/lib/contentLoader'
import { downloadBlob } from '@/lib/download'
import { useMetadata } from '@/state/MetadataContext'
import { useSelection } from '@/state/SelectionContext'

export function DraftsPage() {
  const [params, setParams] = useSearchParams()
  const id = params.get('id')
  const { byPath } = useMetadata()
  const { pinned, removePinned, replacePinned } = useSelection()

  const [drafts, setDrafts] = useState<Draft[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [refContents, setRefContents] = useState<Map<string, string>>(new Map())
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const refreshDrafts = () => void listDrafts().then(setDrafts)

  useEffect(refreshDrafts, [])

  // Tracks the draft id whose sourceRefs we've already restored into the
  // working set, so re-renders of `drafts` (e.g. right after Save) don't
  // repeatedly stomp on pins the user makes while a draft stays open.
  const hydratedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!id) {
      hydratedIdRef.current = null
      setTitle('')
      setContent('')
      setSavedAt(null)
      return
    }
    if (hydratedIdRef.current === id) return
    const existing = drafts.find((d) => d.id === id)
    if (existing) {
      setTitle(existing.title)
      setContent(existing.content)
      setSavedAt(existing.updatedAt)
      replacePinned(existing.sourceRefs)
      hydratedIdRef.current = id
    }
  }, [id, drafts, replacePinned])

  useEffect(() => {
    const refs = pinned.map((p) => byPath.get(p)).filter((e): e is NonNullable<typeof e> => Boolean(e))
    if (refs.length === 0) {
      setRefContents(new Map())
      return
    }
    let cancelled = false
    loadContentBatch(refs.map((e) => ({ vendor: e.vendor, path: e.path }))).then((result) => {
      if (!cancelled) setRefContents(result)
    })
    return () => {
      cancelled = true
    }
  }, [pinned, byPath])

  const handleSave = async () => {
    const record = await saveDraft({ id: id ?? undefined, title: title || 'Untitled draft', content, sourceRefs: pinned })
    setSavedAt(record.updatedAt)
    setParams({ id: record.id })
    refreshDrafts()
  }

  const handleNew = () => {
    setParams({})
  }

  const handleDelete = async (draftId: string) => {
    await deleteDraft(draftId)
    if (draftId === id) setParams({})
    refreshDrafts()
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-neutral-200 p-3 dark:border-neutral-800">
        <button
          type="button"
          onClick={handleNew}
          className="mb-3 w-full rounded-md border border-violet-500 px-2 py-1 text-sm text-violet-700 dark:text-violet-300"
        >
          + New draft
        </button>
        <ul className="space-y-1">
          {drafts.map((d) => (
            <li key={d.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setParams({ id: d.id })}
                className={
                  'flex-1 truncate rounded-md px-2 py-1 text-left text-xs ' +
                  (d.id === id ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800')
                }
              >
                {d.title}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(d.id)}
                className="shrink-0 text-xs text-neutral-400 hover:text-red-500"
                title="Delete draft"
              >
                ✕
              </button>
            </li>
          ))}
          {drafts.length === 0 && <li className="text-xs text-neutral-500">No drafts saved yet.</li>}
        </ul>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Draft title"
            className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button type="button" onClick={() => void handleSave()} className="rounded-md border border-violet-500 px-3 py-1 text-sm text-violet-700 dark:text-violet-300">
            Save
          </button>
          <button
            type="button"
            onClick={() => downloadBlob(`${title || 'draft'}.md`, content, 'text/markdown;charset=utf-8')}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
          >
            Download .md
          </button>
          {savedAt && <span className="text-xs text-neutral-400">saved {new Date(savedAt).toLocaleTimeString()}</span>}
        </div>

        <div className="flex min-h-0 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Compose your local system prompt here — copy from the reference panel on the right."
            className="min-h-0 flex-1 resize-none border-r border-neutral-200 bg-white p-3 font-mono text-sm outline-none dark:border-neutral-800 dark:bg-neutral-950"
          />
          <aside className="w-96 shrink-0 overflow-y-auto p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Reference panel — working set ({pinned.length})
            </p>
            {pinned.length === 0 && (
              <p className="text-xs text-neutral-500">Pin documents from Browse/Search/Compare to see their raw text here for copy-paste remixing.</p>
            )}
            <div className="space-y-2">
              {pinned.map((p) => {
                const entry = byPath.get(p)
                if (!entry) return null
                return (
                  <details key={p} className="rounded-md border border-neutral-200 dark:border-neutral-800">
                    <summary className="cursor-pointer select-none px-2 py-1 text-xs font-medium">
                      {entry.vendor} · {entry.displayName}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          removePinned(p)
                        }}
                        className="ml-2 text-neutral-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </summary>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words border-t border-neutral-200 p-2 font-mono text-[11px] leading-relaxed dark:border-neutral-800">
                      {refContents.get(p) ?? 'Loading…'}
                    </pre>
                  </details>
                )
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
