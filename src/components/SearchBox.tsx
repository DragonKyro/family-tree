import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => search(data, query), [data, query])

  // The dropdown is portaled to <body> to escape every parent stacking context
  // (the side-panel was winning the z-index fight via document order). We keep
  // it positioned over the input by tracking the input's bounding rect.
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      if (inputRef.current) setAnchorRect(inputRef.current.getBoundingClientRect())
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  // Reset highlight whenever the result set changes.
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Keep the highlighted suggestion in view when navigating with arrow keys.
  useEffect(() => {
    const container = resultsRef.current
    if (!container) return
    const items = container.querySelectorAll<HTMLButtonElement>('button')
    items[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const choose = (person: Person) => {
    onSelect(person)
    setQuery(fullName(person))
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      // Open the dropdown with ↓ when there are matches but it was closed.
      if (e.key === 'ArrowDown' && results.length > 0) {
        e.preventDefault()
        setOpen(true)
        setActiveIndex(0)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = results[activeIndex]
      if (target) choose(target.person)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  const dropdownStyle: React.CSSProperties | undefined = anchorRect
    ? {
        position: 'fixed',
        top: anchorRect.bottom + 4,
        left: anchorRect.left,
        width: anchorRect.width,
      }
    : undefined

  return (
    <div className="search-box">
      <input
        ref={inputRef}
        type="search"
        placeholder="Search name, town, school… (try town:Seattle)"
        value={query}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results-list"
        aria-autocomplete="list"
        aria-activedescendant={
          open && results.length > 0 ? `search-result-${activeIndex}` : undefined
        }
      />
      {open && query && results.length > 0 && anchorRect &&
        createPortal(
          <div
            className="search-results search-results-portal"
            id="search-results-list"
            role="listbox"
            ref={resultsRef}
            style={dropdownStyle}
          >
            {results.map(({ person, field, snippet }, i) => (
              <button
                key={person.id + field}
                id={`search-result-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={i === activeIndex ? 'active' : undefined}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(person)
                }}
              >
                <span className="search-name">{fullName(person)}</span>
                {field !== 'name' && (
                  <span className="search-field-hint"> · {field}: {snippet}</span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
      {open && query && results.length === 0 && anchorRect &&
        createPortal(
          <div className="search-results search-results-portal" style={dropdownStyle}>
            <div className="search-empty">No matches.</div>
          </div>,
          document.body,
        )}
    </div>
  )
}
