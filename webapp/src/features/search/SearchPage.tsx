import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { search, type SearchResult } from '@/lib/searchIndex'
import { PinButton } from '@/components/PinButton'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const [input, setInput] = useState(query)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setInput(query), [query])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    search(query)
      .then((r) => {
        if (!cancelled) setResults(r)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form
        className="border-b border-neutral-200 p-3 dark:border-neutral-800"
        onSubmit={(e) => {
          e.preventDefault()
          setParams(input.trim() ? { q: input.trim() } : {})
        }}
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search display names, vendors, tags, and full prompt text…"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading && <p className="text-sm text-neutral-500">Searching… (first search loads the index, this can take a moment)</p>}
        {error && <p className="text-sm text-red-600">Search failed: {error}</p>}
        {!loading && query && results.length === 0 && !error && (
          <p className="text-sm text-neutral-500">No results for "{query}".</p>
        )}
        <ul className="space-y-1">
          {results.map((r) => (
            <li key={r.path} className="flex items-center gap-2">
              <Link
                to={`/doc?path=${encodeURIComponent(r.path)}`}
                className="flex-1 truncate text-sm text-neutral-800 hover:text-violet-600 dark:text-neutral-200 dark:hover:text-violet-400"
              >
                <span className="text-neutral-400">{r.vendor} · </span>
                {r.displayName}
              </Link>
              <PinButton path={r.path} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
