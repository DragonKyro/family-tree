import { useMemo, useState } from 'react'
import { FamilyTree } from './components/FamilyTree'
import { DetailsPanel } from './components/DetailsPanel'
import { SearchBox } from './components/SearchBox'
import { loadFamily } from './lib/familyData'
import type { Person } from './types'

export default function App() {
  const data = useMemo(() => loadFamily(), [])
  const [selected, setSelected] = useState<Person | null>(null)

  const handleSelect = (person: Person) => setSelected(person)

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
      </header>
      <main className="tree-area">
        <FamilyTree data={data} onSelect={handleSelect} />
      </main>
      <DetailsPanel person={selected} data={data} onSelect={handleSelect} />
    </div>
  )
}
