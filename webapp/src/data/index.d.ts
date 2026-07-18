/**
 * Shared shape of the build-time generated index. `scripts/build-index.mjs`
 * produces JSON matching these types under `public/generated/` (fetched at
 * runtime as static assets); the app only ever reads that generated JSON,
 * never the source repo directly.
 */

export type FileExt = 'md' | 'txt' | 'json' | 'xml' | 'js' | 'py' | 'yaml'

export interface FileEntry {
  /** Path relative to the repo root, e.g. "Anthropic/Claude Code/claude-code-opus-4.8.md" */
  path: string
  /** Top-level vendor folder, e.g. "Anthropic" */
  vendor: string
  /** Slash-joined subfolder chain under the vendor, or null if flat, e.g. "Claude Code/bundled-skills" */
  subcategory: string | null
  /** Filename without extension */
  slug: string
  ext: FileExt
  /** Canonical display name, preferring the README's link text over the filename */
  displayName: string
  /** True if linked from a vendor's primary (non-collapsed) README table */
  featured: boolean
  /** ISO date string from the README's "Recently Updated" table, if present */
  recentDate: string | null
  /** Inferred variant tags from filename, e.g. ["api", "thinking"] */
  tags: string[]
  size: number
  wordCount: number
}

export interface VendorSummary {
  vendor: string
  fileCount: number
  subcategories: string[]
  tags: string[]
}

export interface MetadataIndex {
  /** ISO timestamp of when the index was generated */
  generatedAt: string
  files: FileEntry[]
  vendors: VendorSummary[]
  /** Paths referenced by README.md that could not be resolved to a file on disk */
  unresolvedReadmeLinks: string[]
  /** Paths present on disk but not referenced anywhere in README.md */
  unindexedFiles: string[]
}

/** Shape of each per-vendor content chunk: generated/content/<vendor-lowercase>.json */
export type VendorContentChunk = Record<string, string>
