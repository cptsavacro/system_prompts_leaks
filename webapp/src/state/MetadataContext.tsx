import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadMetadata } from '@/lib/metadata'
import type { FileEntry, MetadataIndex } from '@/data/index'

interface MetadataContextValue {
  metadata: MetadataIndex | null
  loading: boolean
  error: string | null
  byPath: Map<string, FileEntry>
}

const MetadataContext = createContext<MetadataContextValue | null>(null)

export function MetadataProvider({ children }: { children: ReactNode }) {
  const [metadata, setMetadata] = useState<MetadataIndex | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadMetadata()
      .then((m) => {
        if (!cancelled) setMetadata(m)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const byPath = useMemo(() => {
    const map = new Map<string, FileEntry>()
    for (const f of metadata?.files ?? []) map.set(f.path, f)
    return map
  }, [metadata])

  const value: MetadataContextValue = { metadata, loading: !metadata && !error, error, byPath }
  return <MetadataContext.Provider value={value}>{children}</MetadataContext.Provider>
}

export function useMetadata(): MetadataContextValue {
  const ctx = useContext(MetadataContext)
  if (!ctx) throw new Error('useMetadata must be used within MetadataProvider')
  return ctx
}
