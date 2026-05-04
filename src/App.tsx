import { useMemo, useState } from 'react'
import { FamilyTree } from './components/FamilyTree'
import { DetailsPanel } from './components/DetailsPanel'
import { SearchBox } from './components/SearchBox'
import { findById, loadFamily, pickMainId } from './lib/familyData'
import type { Person } from './types'

export default function App() {
  const data = useMemo(() => loadFamily(), [])
  const initialMainId = useMemo(() => pickMainId(data), [data])
  const [mainId, setMainId] = useState<string | undefined>(initialMainId)

  const selected: Person | null = (mainId && findById(data, mainId)) || null

  const handleSelect = (person: Person) => setMainId(person.id)

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Lui + Shum Family Tree</h1>
        <div className="spacer" />
        <SearchBox data={data} onSelect={handleSelect} />
      </header>
      <main className="tree-area">
        <FamilyTree data={data} mainId={mainId} onSelect={handleSelect} />
      </main>
      <DetailsPanel person={selected} data={data} onSelect={handleSelect} />
    </div>
  )
}
