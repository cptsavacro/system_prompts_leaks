import { NavLink, Outlet } from 'react-router-dom'
import { useSelection } from '@/state/SelectionContext'

const NAV_ITEMS = [
  { to: '/', label: 'Browse', end: true },
  { to: '/search', label: 'Search' },
  { to: '/compare', label: 'Compare' },
  { to: '/drafts', label: 'Drafts' },
  { to: '/export', label: 'Export' },
]

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return (
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
    (isActive
      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800')
  )
}

export function Layout() {
  const { pinned, clearPinned } = useSelection()

  return (
    <div className="flex h-full min-h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <span className="font-semibold">System Prompts Leaks</span>
        <span className="text-xs text-neutral-500">offline reader &amp; workbench</span>
        <nav className="ml-auto flex flex-wrap items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>
            Working set: <strong className="text-neutral-800 dark:text-neutral-200">{pinned.length}</strong>
          </span>
          {pinned.length > 0 && (
            <button type="button" onClick={clearPinned} className="underline hover:text-neutral-700 dark:hover:text-neutral-300">
              clear
            </button>
          )}
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
