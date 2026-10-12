import type { FileEntry } from '@/data/index'

export interface FileFilters {
  vendors: string[]
  tags: string[]
}

export function filterFiles(files: FileEntry[], filters: FileFilters): FileEntry[] {
  return files.filter((f) => {
    if (filters.vendors.length && !filters.vendors.includes(f.vendor)) return false
    if (filters.tags.length && !filters.tags.some((t) => f.tags.includes(t))) return false
    return true
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
