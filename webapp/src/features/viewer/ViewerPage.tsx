import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useMetadata } from '@/state/MetadataContext'
import { loadContent } from '@/lib/contentLoader'
import { downloadBlob } from '@/lib/download'
import { PinButton } from '@/components/PinButton'
import { formatBytes } from '@/lib/filter'

export function ViewerPage() {
  const [params] = useSearchParams()
  const path = params.get('path') ?? ''
  const { byPath, loading: metaLoading } = useMetadata()
  const entry = byPath.get(path)

  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendered, setRendered] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!entry) return
    let cancelled = false
    setContent(null)
    setError(null)
    loadContent(entry.vendor, entry.path)
      .then((c) => {
        if (!cancelled) setContent(c)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [entry])

  if (metaLoading) return <div className="p-6 text-sm text-neutral-500">Loading index…</div>
  if (!entry) return <div className="p-6 text-sm text-red-600">No such document: {path}</div>

  const canRenderMarkdown = entry.ext === 'md'
  const displayContent = entry.ext === 'json' && content ? tryPrettyJson(content) : content

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{entry.displayName}</h1>
          <p className="truncate text-xs text-neutral-500">
            {entry.path} · {formatBytes(entry.size)} · {entry.wordCount.toLocaleString()} words
            {entry.recentDate && <> · {entry.recentDate}</>}
          </p>
        </div>
        {canRenderMarkdown && (
          <button
            type="button"
            onClick={() => setRendered((v) => !v)}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
          >
            {rendered ? 'Show raw' : 'Render markdown'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (!content) return
            void navigator.clipboard.writeText(content).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
        >
          {copied ? 'Copied!' : 'Copy raw'}
        </button>
        <button
          type="button"
          onClick={() => content && downloadBlob(`${entry.slug}.${entry.ext}`, content, 'text/plain;charset=utf-8')}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
        >
          Download
        </button>
        <Link
          to={`/compare?paths=${encodeURIComponent(entry.path)}`}
          className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
        >
          Open in Compare
        </Link>
        <PinButton path={entry.path} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {error && <p className="text-sm text-red-600">Failed to load content: {error}</p>}
        {!error && !content && <p className="text-sm text-neutral-500">Loading document…</p>}
        {content && rendered && canRenderMarkdown && (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
        {content && (!rendered || !canRenderMarkdown) && (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">{displayContent}</pre>
        )}
      </div>
    </div>
  )
}

function tryPrettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}
