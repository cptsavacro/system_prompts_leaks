import type { VendorSummary } from '@/data/index'

interface FilterBarProps {
  vendors: VendorSummary[]
  allTags: string[]
  selectedVendors: string[]
  selectedTags: string[]
  onToggleVendor: (vendor: string) => void
  onToggleTag: (tag: string) => void
  onClear: () => void
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full border px-3 py-1 text-sm transition-colors ' +
        (active
          ? 'border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300'
          : 'border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600')
      }
    >
      {label}
    </button>
  )
}

export function FilterBar({
  vendors,
  allTags,
  selectedVendors,
  selectedTags,
  onToggleVendor,
  onToggleTag,
  onClear,
}: FilterBarProps) {
  const hasFilters = selectedVendors.length > 0 || selectedTags.length > 0
  return (
    <div className="flex flex-col gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Vendor</span>
        {vendors.map((v) => (
          <Chip
            key={v.vendor}
            label={`${v.vendor} (${v.fileCount})`}
            active={selectedVendors.includes(v.vendor)}
            onClick={() => onToggleVendor(v.vendor)}
          />
        ))}
      </div>
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Tag</span>
          {allTags.map((t) => (
            <Chip key={t} label={t} active={selectedTags.includes(t)} onClick={() => onToggleTag(t)} />
          ))}
        </div>
      )}
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="w-fit text-xs text-neutral-500 underline hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
