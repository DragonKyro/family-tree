import { useMemo, useState } from 'react'
import type { FamilyData, Person } from '../types'
import { fullName, searchByName } from '../lib/familyData'

interface Props {
  data: FamilyData
  onSelect: (person: Person) => void
}

export function SearchBox({ data, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() => searchByName(data, query), [data, query])

  return (
    <div className="search-box">
      <input
        type="search"
        placeholder="Search by name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && query && results.length > 0 && (
        <div className="search-results">
          {results.map((p) => (
            <button
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(p)
                setQuery(fullName(p))
                setOpen(false)
              }}
            >
              {fullName(p)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
