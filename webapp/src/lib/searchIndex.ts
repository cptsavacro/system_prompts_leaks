import MiniSearch from 'minisearch'
import type { FileExt } from '@/data/index'

const ASSET_BASE = import.meta.env.BASE_URL

export interface SearchResult {
  path: string
  displayName: string
  vendor: string
  ext: FileExt
  score: number
}

// Must mirror the MiniSearch config used to build search-index.json in
// scripts/build-index.mjs — MiniSearch needs matching field config to
// deserialize a prebuilt index.
const MINISEARCH_OPTIONS = {
  fields: ['displayName', 'vendor', 'subcategory', 'tags', 'content'],
  storeFields: ['path', 'displayName', 'vendor', 'ext'],
  searchOptions: { boost: { displayName: 3, tags: 2 }, prefix: true, fuzzy: 0.2 },
}

let searchPromise: Promise<MiniSearch> | null = null

function loadSearchIndex(): Promise<MiniSearch> {
  if (!searchPromise) {
    searchPromise = fetch(`${ASSET_BASE}generated/search-index.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load search-index.json: ${res.status}`)
        return res.text()
      })
      .then((text) => MiniSearch.loadJSON(text, MINISEARCH_OPTIONS))
      .catch((err: unknown) => {
        // Don't cache a failed load — a transient issue (offline before the
        // service worker has cached it, an SW update, a network blip)
        // shouldn't lock search out for the rest of the session.
        searchPromise = null
        throw err
      })
  }
  return searchPromise
}

/** Kicks off the (potentially large) search index fetch without blocking on the result. */
export function prefetchSearchIndex(): void {
  void loadSearchIndex()
}

export async function search(query: string, limit = 50): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const index = await loadSearchIndex()
  return index
    .search(trimmed)
    .slice(0, limit)
    .map((r) => ({
      path: r.path as string,
      displayName: r.displayName as string,
      vendor: r.vendor as string,
      ext: r.ext as FileExt,
      score: r.score,
    }))
}
