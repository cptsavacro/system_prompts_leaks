import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { MetadataProvider } from '@/state/MetadataContext'
import { SelectionProvider } from '@/state/SelectionContext'
import { BrowsePage } from '@/features/browse/BrowsePage'
import { SearchPage } from '@/features/search/SearchPage'
import { ViewerPage } from '@/features/viewer/ViewerPage'
import { ComparePage } from '@/features/compare/ComparePage'
import { DraftsPage } from '@/features/drafts/DraftsPage'
import { ExportPage } from '@/features/export/ExportPage'
import { prefetchSearchIndex } from '@/lib/searchIndex'

function App() {
  useEffect(() => {
    prefetchSearchIndex()
  }, [])

  return (
    <MetadataProvider>
      <SelectionProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<BrowsePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="doc" element={<ViewerPage />} />
              <Route path="compare" element={<ComparePage />} />
              <Route path="drafts" element={<DraftsPage />} />
              <Route path="export" element={<ExportPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </SelectionProvider>
    </MetadataProvider>
  )
}

export default App
