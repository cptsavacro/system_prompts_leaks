#!/usr/bin/env node
// Build-time ingestion pipeline for the offline reader/workbench/exporter app.
//
// Reads the sibling repo's content folders (`../<Vendor>/**`) and root
// `README.md`, and writes everything the app needs to run fully offline into
// `src/generated/`:
//   - metadata.json      full FileEntry[] + vendor summary tree (eager-loaded)
//   - content/<vendor>.json   { path: rawText } per vendor (lazy-loaded)
//   - search-index.json  a prebuilt MiniSearch index (serialized via toJSON())
//
// Nothing here is committed to git — this script re-derives everything from
// the current working tree on every `npm run dev` / `npm run build`, so
// content added to the repo shows up automatically.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import MiniSearch from 'minisearch'
import { parseReadme } from './parse-readme.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEBAPP_ROOT = join(__dirname, '..')
const REPO_ROOT = join(WEBAPP_ROOT, '..')
// Written under public/ (not src/) so Vite copies it verbatim as static
// assets that the app fetch()es at runtime and lazy-loads per vendor,
// rather than bundling ~9.5MB of content into JS chunks.
const OUT_DIR = join(WEBAPP_ROOT, 'public', 'generated')

const EXCLUDED_TOP_LEVEL = new Set(['.git', '.github', 'webapp', 'node_modules'])
const EXT_MAP = { '.md': 'md', '.txt': 'txt', '.json': 'json', '.xml': 'xml', '.js': 'js', '.py': 'py', '.yaml': 'yaml', '.yml': 'yaml' }

const VARIANT_VOCAB = new Set([
  'api', 'thinking', 'instant', 'raw', 'mini', 'max', 'high', 'medium', 'low',
  'beta', 'preview', 'spark', 'personality',
  'friendly', 'cynical', 'cynic', 'pragmatic', 'candid', 'efficient', 'nerdy',
  'quirky', 'professional', 'robot', 'listener',
])

function inferTags(slug) {
  const tags = new Set()
  const lower = slug.toLowerCase()
  if (/no-tools/.test(lower)) tags.add('no-tools')
  else if (/(^|[-_])tools([-_]|$)|w-tools|with-tools|with-all-tools/.test(lower)) tags.add('with-tools')
  if (/humanreadable|human-readable/.test(lower)) tags.add('human-readable')
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean)
  for (const token of tokens) {
    if (VARIANT_VOCAB.has(token)) tags.add(token)
  }
  return [...tags].sort()
}

function humanizeSlug(slug) {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function walkVendorFiles(vendor) {
  const vendorDir = join(REPO_ROOT, vendor)
  const results = []
  const stack = [vendorDir]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
        continue
      }
      const ext = EXT_MAP[extname(entry.name).toLowerCase()]
      if (!ext) continue // skip unrecognized file types (images, etc.)
      results.push(full)
    }
  }
  return results
}

function buildFileEntry(absPath, linkMeta) {
  const path = relative(REPO_ROOT, absPath).split('\\').join('/')
  const vendor = path.split('/')[0]
  const withoutVendor = path.slice(vendor.length + 1)
  const dir = dirname(withoutVendor)
  const subcategory = dir === '.' ? null : dir
  const filename = basename(withoutVendor)
  const ext = EXT_MAP[extname(filename).toLowerCase()]
  const slug = filename.slice(0, filename.length - extname(filename).length)

  const stat = statSync(absPath)
  const content = readFileSync(absPath, 'utf8')
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  const meta = linkMeta.get(path)

  return {
    entry: {
      path,
      vendor,
      subcategory,
      slug,
      ext,
      displayName: meta?.displayName ?? humanizeSlug(slug),
      featured: meta?.featured ?? false,
      recentDate: meta?.recentDate ?? null,
      tags: inferTags(slug),
      size: stat.size,
      wordCount,
    },
    content,
  }
}

function main() {
  const readmeText = readFileSync(join(REPO_ROOT, 'README.md'), 'utf8')
  const { linkMeta } = parseReadme(readmeText)

  const topLevelDirs = readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !EXCLUDED_TOP_LEVEL.has(e.name))
    .map((e) => e.name)
    .sort()

  const files = []
  const contentByVendor = new Map()
  const onDiskPaths = new Set()

  for (const vendor of topLevelDirs) {
    const absPaths = walkVendorFiles(vendor)
    const vendorContent = {}
    for (const absPath of absPaths) {
      const { entry, content } = buildFileEntry(absPath, linkMeta)
      files.push(entry)
      vendorContent[entry.path] = content
      onDiskPaths.add(entry.path)
    }
    contentByVendor.set(vendor, vendorContent)
  }

  files.sort((a, b) => a.path.localeCompare(b.path))

  const unresolvedReadmeLinks = [...linkMeta.keys()].filter((p) => !onDiskPaths.has(p)).sort()
  const unindexedFiles = files.filter((f) => !linkMeta.has(f.path)).map((f) => f.path).sort()

  const vendors = topLevelDirs.map((vendor) => {
    const vendorFiles = files.filter((f) => f.vendor === vendor)
    return {
      vendor,
      fileCount: vendorFiles.length,
      subcategories: [...new Set(vendorFiles.map((f) => f.subcategory).filter(Boolean))].sort(),
      tags: [...new Set(vendorFiles.flatMap((f) => f.tags))].sort(),
    }
  }).filter((v) => v.fileCount > 0)

  const metadata = {
    generatedAt: new Date().toISOString(),
    files,
    vendors,
    unresolvedReadmeLinks,
    unindexedFiles,
  }

  // MiniSearch index. Full document text is included by default; set
  // INDEX_CONTENT_MODE=snippet to index only the first ~200 words per file
  // instead, trading deep full-text recall for a smaller/faster-to-parse
  // index on low-end devices (see webapp/CLAUDE.md).
  const contentMode = process.env.INDEX_CONTENT_MODE === 'snippet' ? 'snippet' : 'full'
  const miniSearch = new MiniSearch({
    fields: ['displayName', 'vendor', 'subcategory', 'tags', 'content'],
    storeFields: ['path', 'displayName', 'vendor', 'ext'],
    searchOptions: { boost: { displayName: 3, tags: 2 }, prefix: true, fuzzy: 0.2 },
  })
  const searchDocs = files.map((f) => {
    const full = contentByVendor.get(f.vendor)[f.path]
    const content = contentMode === 'snippet' ? full.trim().split(/\s+/).slice(0, 200).join(' ') : full
    return {
      id: f.path,
      displayName: f.displayName,
      vendor: f.vendor,
      subcategory: f.subcategory ?? '',
      tags: f.tags.join(' '),
      content,
      path: f.path,
      ext: f.ext,
    }
  })
  miniSearch.addAll(searchDocs)

  mkdirSync(OUT_DIR, { recursive: true })
  mkdirSync(join(OUT_DIR, 'content'), { recursive: true })

  writeFileSync(join(OUT_DIR, 'metadata.json'), JSON.stringify(metadata))
  writeFileSync(join(OUT_DIR, 'search-index.json'), JSON.stringify(miniSearch.toJSON()))
  for (const [vendor, vendorContent] of contentByVendor) {
    writeFileSync(join(OUT_DIR, 'content', `${vendor.toLowerCase()}.json`), JSON.stringify(vendorContent))
  }

  console.log(`[build-index] indexed ${files.length} files across ${vendors.length} vendors`)
  console.log(`[build-index] search-index content mode: ${contentMode}`)
  if (unresolvedReadmeLinks.length) {
    console.warn(`[build-index] WARNING: ${unresolvedReadmeLinks.length} README link(s) do not resolve to a file on disk:`)
    for (const p of unresolvedReadmeLinks) console.warn(`  - ${p}`)
  }
  if (unindexedFiles.length) {
    console.warn(`[build-index] NOTE: ${unindexedFiles.length} file(s) on disk are not yet linked from README.md (using filename-derived names):`)
    for (const p of unindexedFiles) console.warn(`  - ${p}`)
  }
}

main()
