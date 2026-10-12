// Parses the repo root README.md into a path -> { displayName, featured, recentDate }
// map. The README is a hand-curated index (see repo root README.md): a
// "Recently Updated" table followed by one `## Vendor` section per vendor,
// each with a primary markdown table and an optional
// `<details><summary>...</summary>` block holding a second table of
// older/variant links. This is the richest source of canonical names and
// dates we have — richer than filenames alone — so build-index.mjs treats
// it as authoritative and only falls back to filename-derived names for
// files the README doesn't (yet) link to.

const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g
const GENERIC_LINK_TEXT_RE = /^(system prompt.*|prompt|link|all versions|older versions|more products)$/i
const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
}
const DATE_RE = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/

function toIsoDate(text) {
  const m = DATE_RE.exec(text.trim())
  if (!m) return null
  const month = MONTHS[m[1].toLowerCase()]
  if (!month) return null
  return `${m[3]}-${month}-${String(m[2]).padStart(2, '0')}`
}

function stripMarkdown(text) {
  return text.replace(/\*\*/g, '').trim()
}

function isDividerRow(cells) {
  return cells.every((c) => /^:?-+:?$/.test(c.trim()) || c.trim() === '')
}

function isHeaderRow(cells) {
  const joined = cells.map((c) => c.trim().toLowerCase()).join('|')
  return joined === 'model|prompt' || joined === 'product|prompt' || joined === 'what|date|link' || joined === '|'
}

function splitCells(line) {
  // Drop leading/trailing pipe, split on unescaped `|`.
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((c) => c.trim())
}

function extractLinks(cell) {
  const links = []
  let match
  LINK_RE.lastIndex = 0
  while ((match = LINK_RE.exec(cell)) !== null) {
    const [, text, href] = match
    if (/^https?:\/\//i.test(href)) continue // external link (e.g. a diffchecker.com comparison)
    if (href.endsWith('/')) continue // directory link (e.g. "Anthropic/Official/")
    links.push({ text: stripMarkdown(text), href: decodeURIComponent(href) })
  }
  return links
}

function buildDisplayName(rowLabel, linkText) {
  const label = stripMarkdown(rowLabel)
  const link = stripMarkdown(linkText)
  if (!link || GENERIC_LINK_TEXT_RE.test(link)) return label || link
  if (!label || link.toLowerCase() === label.toLowerCase()) return link
  return `${label} · ${link}`
}

/**
 * @param {string} readme raw README.md text
 * @returns {{
 *   linkMeta: Map<string, { displayName: string, featured: boolean, recentDate: string | null }>,
 *   sectionHeadings: string[]
 * }}
 */
export function parseReadme(readme) {
  const lines = readme.split('\n')
  const linkMeta = new Map()
  const sectionHeadings = []

  let insideDetails = false
  let inRecentlyUpdated = false

  const setMeta = (href, displayName, featured, recentDate) => {
    const existing = linkMeta.get(href)
    linkMeta.set(href, {
      displayName: displayName || existing?.displayName || href,
      featured: existing?.featured ?? featured,
      recentDate: recentDate ?? existing?.recentDate ?? null,
    })
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (/^##\s+/.test(line)) {
      const heading = line.replace(/^##\s+/, '').trim()
      inRecentlyUpdated = /^recently updated$/i.test(heading)
      if (!inRecentlyUpdated) sectionHeadings.push(heading)
      continue
    }
    if (/^<details>/i.test(line)) {
      insideDetails = true
      continue
    }
    if (/^<\/details>/i.test(line)) {
      insideDetails = false
      continue
    }
    if (!line.startsWith('|')) continue

    const cells = splitCells(line)
    if (cells.length < 2 || isDividerRow(cells) || isHeaderRow(cells)) continue

    if (inRecentlyUpdated) {
      if (cells.length < 3) continue
      const [labelCell, dateCell, linksCell] = cells
      const recentDate = toIsoDate(dateCell)
      const rowLabel = stripMarkdown(labelCell)
      for (const { text, href } of extractLinks(linksCell)) {
        setMeta(href, buildDisplayName(rowLabel, text), true, recentDate)
      }
    } else {
      const [labelCell, linksCell] = cells
      const rowLabel = stripMarkdown(labelCell)
      for (const { text, href } of extractLinks(linksCell)) {
        setMeta(href, buildDisplayName(rowLabel, text), !insideDetails, null)
      }
    }
  }

  return { linkMeta, sectionHeadings }
}
