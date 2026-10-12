import type { MetadataIndex } from '@/data/index'

const ASSET_BASE = import.meta.env.BASE_URL

let metadataPromise: Promise<MetadataIndex> | null = null

/** Fetches and caches the eagerly-loaded metadata.json (small: FileEntry[] + vendor tree). */
export function loadMetadata(): Promise<MetadataIndex> {
  if (!metadataPromise) {
    metadataPromise = fetch(`${ASSET_BASE}generated/metadata.json`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load metadata.json: ${res.status}`)
      return res.json() as Promise<MetadataIndex>
    })
  }
  return metadataPromise
}
