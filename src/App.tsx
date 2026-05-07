import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { FamilyTree, type LayoutNode } from './components/FamilyTree'
import { DetailsPanel } from './components/DetailsPanel'
import { SearchBox } from './components/SearchBox'
import { CalendarPanel } from './components/CalendarPanel'
import { RelationshipPanel, type RelationshipPanelHandle } from './components/RelationshipPanel'
import { MiniMap } from './components/MiniMap'
import { findById, isSynthetic, loadFamily } from './lib/familyData'
import { upcomingHoliday } from './lib/holidays'
import type { Person } from './types'

// Leaflet is ~150 KB — only ship it when the user opens the map.
const MapPanel = lazy(() => import('./components/MapPanel'))

type Theme = 'dark' | 'light'
type Tool = null | 'calendar' | 'relationship' | 'map'

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
  const [tool, setTool] = useState<Tool>(null)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const relPanelRef = useRef<RelationshipPanelHandle | null>(null)

  useEffect(() => {
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light')
    else document.documentElement.removeAttribute('data-theme')
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const handleSelect = (person: Person) => {
    if (isSynthetic(person)) return
    // Close the mobile menu whenever a person gets picked (e.g. via search).
    setHeaderMenuOpen(false)
    // When the relationship panel is open, route tree clicks into it instead
    // of moving the side-panel selection.
    if (tool === 'relationship' && relPanelRef.current) {
      relPanelRef.current.populate(person)
      return
    }
    setSelectedId(person.id)
    // Auto-expand the info panel so the user actually sees what they clicked.
    setPanelCollapsed(false)
  }

  const selected = selectedId ? findById(data, selectedId) ?? null : null
  const focusId = selectedId ?? 'kyle-lui'

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  const toggleTool = (t: NonNullable<Tool>) => setTool((cur) => (cur === t ? null : t))

  // Subtle holiday badge in the header for the next 14 days.
  const nextHoliday = useMemo(() => upcomingHoliday(new Date(), 14), [])
  const nextHolidayLabel = useMemo(() => {
    if (!nextHoliday) return null
    const now = new Date()
    const isToday =
      nextHoliday.date.getFullYear() === now.getFullYear() &&
      nextHoliday.date.getMonth() === now.getMonth() &&
      nextHoliday.date.getDate() === now.getDate()
    return isToday
      ? 'Today'
      : nextHoliday.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }, [nextHoliday])

  return (
    <div className={`app${panelCollapsed ? ' panel-collapsed' : ''}${headerMenuOpen ? ' header-menu-open' : ''}`}>
      <header className="app-header">
        <button
          type="button"
          className="header-menu-toggle mobile-only"
          onClick={() => setHeaderMenuOpen((v) => !v)}
          aria-label={headerMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={headerMenuOpen}
        >
          {headerMenuOpen ? '✕' : '☰'}
        </button>
        <h1 className="app-title">Lui + Shum Family Tree</h1>
        <div className="header-controls">
          <div className="legend">
            <span className="legend-item"><span className="legend-swatch immediate" />Immediate</span>
            <span className="legend-item"><span className="legend-swatch lui" />Lui side</span>
            <span className="legend-item"><span className="legend-swatch shum" />Shum side</span>
            <span className="legend-item"><span className="legend-swatch male" />Male</span>
            <span className="legend-item"><span className="legend-swatch female" />Female</span>
            <span className="legend-item"><span className="legend-swatch pet" />Pet</span>
            <span className="legend-item"><span className="legend-swatch deceased" />Deceased</span>
            <span className="legend-item"><span className="legend-swatch marriage" />Marriage</span>
            <span className="legend-item"><span className="legend-swatch divorce" />Divorce</span>
          </div>
          <div className="spacer" />
          {nextHoliday && nextHolidayLabel && (
            <span
              className="holiday-badge"
              title={`${nextHoliday.holiday.name} — ${nextHolidayLabel === 'Today' ? 'today' : nextHolidayLabel}`}
            >
              <span aria-hidden>{nextHoliday.holiday.emoji}</span>
              <span className="holiday-badge-name">{nextHoliday.holiday.name}</span>
              <span className="holiday-badge-date">{nextHolidayLabel}</span>
            </span>
          )}
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
        </div>
      </header>
      {headerMenuOpen && (
        <div
          className="header-menu-backdrop mobile-only"
          onClick={() => setHeaderMenuOpen(false)}
          aria-hidden
        />
      )}
      <main className="tree-area">
        <FamilyTree data={data} onSelect={handleSelect} focusId={focusId} onLayout={setLayoutNodes} />
        <MiniMap nodes={layoutNodes} />

        <div className="tool-buttons">
          <button
            type="button"
            className={`tool-btn ${tool === 'calendar' ? 'active' : ''}`}
            onClick={() => toggleTool('calendar')}
            aria-label="Birthday calendar"
            title="Birthday calendar"
          >
            <CalendarIcon />
          </button>
          <button
            type="button"
            className={`tool-btn ${tool === 'relationship' ? 'active' : ''}`}
            onClick={() => toggleTool('relationship')}
            aria-label="Relationship finder"
            title="Relationship finder"
          >
            <RelationshipIcon />
          </button>
          <button
            type="button"
            className={`tool-btn ${tool === 'map' ? 'active' : ''}`}
            onClick={() => toggleTool('map')}
            aria-label="Family map"
            title="Family map"
          >
            <MapIcon />
          </button>
        </div>

        {tool === 'calendar' && (
          <CalendarPanel
            data={data}
            onSelectPerson={handleSelect}
            onClose={() => setTool(null)}
          />
        )}
        {tool === 'relationship' && (
          <RelationshipPanel
            ref={relPanelRef}
            data={data}
            initialFromId={selectedId}
            onClose={() => setTool(null)}
          />
        )}
        {tool === 'map' && (
          <Suspense fallback={<div className="tool-panel map-panel map-loading">Loading map…</div>}>
            <MapPanel data={data} onClose={() => setTool(null)} onSelectPerson={handleSelect} />
          </Suspense>
        )}
      </main>
      <DetailsPanel
        person={selected}
        data={data}
        onSelect={handleSelect}
        collapsed={panelCollapsed}
        onToggleCollapse={() => setPanelCollapsed((c) => !c)}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  )
}

function RelationshipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7" cy="9" r="3" />
      <circle cx="17" cy="9" r="3" />
      <path d="M2 20c0-3 2.5-5 5-5s5 2 5 5" />
      <path d="M12 20c0-3 2.5-5 5-5s5 2 5 5" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}
