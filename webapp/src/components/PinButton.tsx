import { useSelection } from '@/state/SelectionContext'

export function PinButton({ path, className = '' }: { path: string; className?: string }) {
  const { isPinned, togglePin } = useSelection()
  const pinned = isPinned(path)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        togglePin(path)
      }}
      title={pinned ? 'Remove from working set' : 'Add to working set'}
      aria-pressed={pinned}
      className={
        `shrink-0 rounded-md border px-2 py-0.5 text-xs transition-colors ` +
        (pinned
          ? 'border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-300'
          : 'border-neutral-300 text-neutral-500 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600') +
        ' ' +
        className
      }
    >
      {pinned ? '★ pinned' : '☆ pin'}
    </button>
  )
}
