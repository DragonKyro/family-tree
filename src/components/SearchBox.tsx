import { useMemo, useState } from 'react'
import type { FamilyData, Person, PersonData } from '../types'
import { fullName, isSynthetic } from '../lib/familyData'

interface Props {
  data: FamilyData
  onSelect: (person: Person) => void
}

type Match = { person: Person; field: string; snippet: string }

const FIELD_LABELS: Record<string, string> = {
  current_town: 'town',
  current_job: 'job',
  current_role: 'role',
  high_school: 'high school',
  college: 'college',
  interests: 'interests',
  email: 'email',
  phone: 'phone',
  notes: 'notes',
}

const FIELD_ALIASES: Record<string, keyof PersonData> = {
  town: 'current_town',
  city: 'current_town',
  job: 'current_job',
  employer: 'current_job',
  role: 'current_role',
  title: 'current_role',
  school: 'high_school',
  hs: 'high_school',
  college: 'college',
  university: 'college',
  interest: 'interests',
  interests: 'interests',
  hobby: 'interests',
  email: 'email',
  phone: 'phone',
  notes: 'notes',
  branch: 'branch',
}

const SEARCHABLE_FIELDS: Array<keyof PersonData> = [
  'current_town',
  'current_job',
  'current_role',
  'high_school',
  'college',
  'interests',
  'email',
  'phone',
  'notes',
]

function getFieldString(d: PersonData, key: keyof PersonData): string {
  const v = d[key]
  return typeof v === 'string' ? v : ''
}

function search(data: FamilyData, query: string): Match[] {
  const q = query.trim()
  if (!q) return []

  // field:value prefix
  const prefix = /^(\w+)\s*:\s*(.+)$/.exec(q)
  if (prefix) {
    const fieldKey = prefix[1].toLowerCase()
    const value = prefix[2].toLowerCase().trim()
    const target = FIELD_ALIASES[fieldKey]
    if (target && value) {
      const out: Match[] = []
      for (const p of data) {
        if (isSynthetic(p)) continue
        const fv = getFieldString(p.data, target)
        if (fv.toLowerCase().includes(value)) {
          out.push({ person: p, field: FIELD_LABELS[target] ?? target, snippet: fv })
        }
        if (out.length >= 30) break
      }
      return out
    }
  }

  const v = q.toLowerCase()
  const out: Match[] = []
  for (const p of data) {
    if (isSynthetic(p)) continue
    const name = fullName(p).toLowerCase()
    if (name.includes(v)) {
      out.push({ person: p, field: 'name', snippet: '' })
      continue
    }
    let matched: { field: string; snippet: string } | null = null
    for (const f of SEARCHABLE_FIELDS) {
      const fv = getFieldString(p.data, f)
      if (fv.toLowerCase().includes(v)) {
        matched = { field: FIELD_LABELS[f] ?? f, snippet: fv }
        break
      }
    }
    if (matched) out.push({ person: p, ...matched })
    if (out.length >= 30) break
  }
  return out
}

export function SearchBox({ data, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = useMemo(() => search(data, query), [data, query])

  return (
    <div className="search-box">
      <input
        type="search"
        placeholder="Search name, town, school… (try town:Seattle)"
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
          {results.map(({ person, field, snippet }) => (
            <button
              key={person.id + field}
              onMouseDown={(e) => {
                e.preventDefault()
                onSelect(person)
                setQuery(fullName(person))
                setOpen(false)
              }}
            >
              <span className="search-name">{fullName(person)}</span>
              {field !== 'name' && (
                <span className="search-field-hint"> · {field}: {snippet}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && query && results.length === 0 && (
        <div className="search-results">
          <div className="search-empty">No matches.</div>
        </div>
      )}
    </div>
  )
}
