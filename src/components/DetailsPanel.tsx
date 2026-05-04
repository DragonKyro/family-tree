import type { FamilyData, Person } from '../types'
import { findById, fullName } from '../lib/familyData'

interface Props {
  person: Person | null
  data: FamilyData
  onSelect: (person: Person) => void
}

export function DetailsPanel({ person, data, onSelect }: Props) {
  if (!person) {
    return (
      <aside className="side-panel">
        <p className="empty-state">Click a person in the tree to see details.</p>
      </aside>
    )
  }

  const father = person.rels.father ? findById(data, person.rels.father) : undefined
  const mother = person.rels.mother ? findById(data, person.rels.mother) : undefined
  const spouses = (person.rels.spouses ?? []).map((id) => findById(data, id)).filter(Boolean) as Person[]
  const children = (person.rels.children ?? []).map((id) => findById(data, id)).filter(Boolean) as Person[]

  return (
    <aside className="side-panel">
      {person.data.avatar && (
        <img className="avatar" src={person.data.avatar} alt={fullName(person)} />
      )}
      <h2>{fullName(person)}</h2>
      <div className="muted">
        {person.data.birthday || '—'}
        {person.data.deathday ? ` · † ${person.data.deathday}` : ''}
      </div>

      <dl>
        {father && (
          <>
            <dt>Father</dt>
            <dd>
              <LinkButton person={father} onSelect={onSelect} />
            </dd>
          </>
        )}
        {mother && (
          <>
            <dt>Mother</dt>
            <dd>
              <LinkButton person={mother} onSelect={onSelect} />
            </dd>
          </>
        )}
        {spouses.length > 0 && (
          <>
            <dt>{spouses.length > 1 ? 'Spouses' : 'Spouse'}</dt>
            <dd>
              {spouses.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ', '}
                  <LinkButton person={s} onSelect={onSelect} />
                </span>
              ))}
            </dd>
          </>
        )}
        {children.length > 0 && (
          <>
            <dt>Children</dt>
            <dd>
              {children.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <LinkButton person={c} onSelect={onSelect} />
                </span>
              ))}
            </dd>
          </>
        )}
      </dl>

      {person.data.notes && <div className="notes">{person.data.notes}</div>}
    </aside>
  )
}

function LinkButton({ person, onSelect }: { person: Person; onSelect: (p: Person) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(person)}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        color: 'var(--accent)',
        cursor: 'pointer',
        font: 'inherit',
        textDecoration: 'underline',
      }}
    >
      {fullName(person)}
    </button>
  )
}
