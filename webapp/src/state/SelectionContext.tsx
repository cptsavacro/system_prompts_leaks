import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'spl.workingSet'

function readInitial(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

interface SelectionContextValue {
  /** The "working set": paths pinned while browsing, feeding Compare / Drafts / Export. */
  pinned: string[]
  isPinned: (path: string) => boolean
  togglePin: (path: string) => void
  addPinned: (paths: string[]) => void
  removePinned: (path: string) => void
  clearPinned: () => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState<string[]>(readInitial)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned))
  }, [pinned])

  const togglePin = useCallback((path: string) => {
    setPinned((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]))
  }, [])

  const addPinned = useCallback((paths: string[]) => {
    setPinned((prev) => [...new Set([...prev, ...paths])])
  }, [])

  const removePinned = useCallback((path: string) => {
    setPinned((prev) => prev.filter((p) => p !== path))
  }, [])

  const isPinned = useCallback((path: string) => pinned.includes(path), [pinned])
  const clearPinned = useCallback(() => setPinned([]), [])

  const value: SelectionContextValue = { pinned, isPinned, togglePin, addPinned, removePinned, clearPinned }
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext)
  if (!ctx) throw new Error('useSelection must be used within SelectionProvider')
  return ctx
}
