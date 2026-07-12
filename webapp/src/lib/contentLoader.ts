import type { VendorContentChunk } from '@/data/index'

const ASSET_BASE = import.meta.env.BASE_URL

const chunkPromises = new Map<string, Promise<VendorContentChunk>>()

function loadVendorChunk(vendor: string): Promise<VendorContentChunk> {
  const key = vendor.toLowerCase()
  let promise = chunkPromises.get(key)
  if (!promise) {
    promise = fetch(`${ASSET_BASE}generated/content/${key}.json`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load content chunk for ${vendor}: ${res.status}`)
      return res.json() as Promise<VendorContentChunk>
    })
    chunkPromises.set(key, promise)
  }
  return promise
}

/** Lazily loads a single document's raw text, fetching its vendor's chunk once and caching it. */
export async function loadContent(vendor: string, path: string): Promise<string> {
  const chunk = await loadVendorChunk(vendor)
  const content = chunk[path]
  if (content === undefined) throw new Error(`Path not found in ${vendor} content chunk: ${path}`)
  return content
}

/** Loads content for multiple documents, deduplicating vendor chunk fetches. */
export async function loadContentBatch(
  refs: { vendor: string; path: string }[],
): Promise<Map<string, string>> {
  const vendors = [...new Set(refs.map((r) => r.vendor))]
  const chunks = new Map(await Promise.all(vendors.map(async (v) => [v, await loadVendorChunk(v)] as const)))
  const result = new Map<string, string>()
  for (const { vendor, path } of refs) {
    const content = chunks.get(vendor)?.[path]
    if (content !== undefined) result.set(path, content)
  }
  return result
}
