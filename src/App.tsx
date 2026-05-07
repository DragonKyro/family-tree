import { useEffect, useMemo, useState } from 'react'
import { FamilyTree, type LayoutNode } from './components/FamilyTree'
import { DetailsPanel } from './components/DetailsPanel'
import { SearchBox } from './components/SearchBox'
import { CalendarFab } from './components/CalendarFab'
import { MiniMap } from './components/MiniMap'
import { findById, isSynthetic, loadFamily } from './lib/familyData'
import type { Person } from './types'

type Theme = 'dark' | 'light'

const THEME_KEY = 'family-tree-theme'

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // ignore
  }
  return 'dark'
}

export default function App() {
  const data = useMemo(() => loadFamily(), [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([])
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const handleSelect = (person: Person) => {
    if (isSynthetic(person)) return
    setSelectedId(person.id)
  }

  const selected = selectedId ? findById(data, selectedId) ?? null : null
  const focusId = selectedId ?? 'kyle-lui'

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Lui + Shum Family Tree</h1>
        <div className="legend">
          <span className="legend-item"><span className="legend-swatch immediate" />Immediate</span>
          <span className="legend-item"><span className="legend-swatch lui" />Lui side</span>
          <span className="legend-item"><span className="legend-swatch shum" />Shum side</span>
          <span className="legend-item"><span className="legend-swatch marriage" />Marriage</span>
          <span className="legend-item"><span className="legend-swatch divorce" />Divorce</span>
        </div>
        <div className="spacer" />
        <SearchBox data={data} onSelect={handleSelect} />
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>
      <main className="tree-area">
        <FamilyTree data={data} onSelect={handleSelect} focusId={focusId} onLayout={setLayoutNodes} />
        <MiniMap nodes={layoutNodes} />
      </main>
      <DetailsPanel person={selected} data={data} onSelect={handleSelect} />
      <CalendarFab data={data} onSelectPerson={handleSelect} />
    </div>
  )
}
