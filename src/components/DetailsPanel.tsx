import type { FamilyData, Person } from '../types'
import { findById, fullName, resolvePhotoUrl } from '../lib/familyData'
import { formatDisplayDate, mailtoHref, telHref } from '../lib/formatters'

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
  const siblings = computeSiblings(data, person)

  const d = person.data
  const subtitle = [dateRange(d), d.current_town].filter(Boolean).join(' · ')

  return (
    <aside className="side-panel">
      <div className="side-panel-top">
        <div className="side-panel-avatar">
          {d.avatar ? (
            <img className="avatar" src={resolvePhotoUrl(d.avatar)} alt={fullName(person)} />
          ) : (
            <div className="avatar avatar-placeholder" aria-hidden>
              {initials(person)}
            </div>
          )}
        </div>
        <div className="side-panel-title">
          <h2>{fullName(person)}</h2>
          {subtitle && <div className="muted">{subtitle}</div>}
        </div>
      </div>

      {hasAny(d, ['phone', 'email']) && (
        <Section title="Contact">
          {d.phone && (
            <Row label="Phone">
              <a href={telHref(d.phone)}>{d.phone}</a>
            </Row>
          )}
          {d.email && (
            <Row label="Email">
              <a href={mailtoHref(d.email)}>{d.email}</a>
            </Row>
          )}
        </Section>
      )}

      {hasAny(d, ['high_school', 'college', 'high_school_grad_year', 'college_grad_year']) && (
        <Section title="Education">
          {(d.high_school || d.high_school_grad_year) && (
            <Row label="High school">{schoolLine(d.high_school, d.high_school_grad_year)}</Row>
          )}
          {(d.college || d.college_grad_year) && (
            <Row label="College">{schoolLine(d.college, d.college_grad_year)}</Row>
          )}
        </Section>
      )}

      {hasAny(d, ['current_job', 'current_role']) && (
        <Section title="Work">
          {d.current_job && <Row label="Employer">{d.current_job}</Row>}
          {d.current_role && <Row label="Role">{d.current_role}</Row>}
        </Section>
      )}

      {d.interests && (
        <Section title="Interests">
          <div className="long-text">{d.interests}</div>
        </Section>
      )}

      {(father || mother || spouses.length > 0 || children.length > 0 || siblings.length > 0) && (
        <Section title="Family">
          {father && (
            <Row label="Father">
              <PersonLink person={father} onSelect={onSelect} />
            </Row>
          )}
          {mother && (
            <Row label="Mother">
              <PersonLink person={mother} onSelect={onSelect} />
            </Row>
          )}
          {spouses.length > 0 && (
            <Row label={spouses.length > 1 ? 'Spouses' : 'Spouse'}>
              <PersonList people={spouses} onSelect={onSelect} />
            </Row>
          )}
          {siblings.length > 0 && (
            <Row label={siblings.length > 1 ? 'Siblings' : 'Sibling'}>
              <PersonList people={siblings} onSelect={onSelect} />
            </Row>
          )}
          {children.length > 0 && (
            <Row label={children.length > 1 ? 'Children' : 'Child'}>
              <PersonList people={children} onSelect={onSelect} />
            </Row>
          )}
        </Section>
      )}

      {d.notes && (
        <Section title="Notes">
          <div className="long-text">{d.notes}</div>
        </Section>
      )}
    </aside>
  )
}

function computeSiblings(data: FamilyData, person: Person): Person[] {
  const { father, mother } = person.rels
  if (!father && !mother) return []
  const seen = new Set<string>()
  const out: Person[] = []
  for (const p of data) {
    if (p.id === person.id) continue
    const sameF = father && p.rels.father === father
    const sameM = mother && p.rels.mother === mother
    if ((sameF || sameM) && !seen.has(p.id)) {
      seen.add(p.id)
      out.push(p)
    }
  }
  return out
}

function schoolLine(name: string | undefined, gradYear: string | undefined): string {
  if (name && gradYear) return `${name} · Class of ${gradYear}`
  if (name) return name
  if (gradYear) return `Class of ${gradYear}`
  return ''
}

function initials(p: Person): string {
  const f = p.data.first_name?.[0] ?? ''
  const l = p.data.last_name?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

function dateRange(d: Person['data']): string {
  const b = formatDisplayDate(d.birthday)
  const dd = formatDisplayDate(d.deathday)
  if (b && dd) return `${b} – ${dd}`
  if (b) return b
  if (dd) return `† ${dd}`
  if (d.deceased) return '†'
  return ''
}

function hasAny(d: Person['data'], keys: Array<keyof Person['data']>): boolean {
  return keys.some((k) => {
    const v = d[k]
    return typeof v === 'string' && v.length > 0
  })
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel-section">
      <h3 className="panel-section-title">{title}</h3>
      <div className="panel-section-body">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel-row">
      <div className="panel-row-label">{label}</div>
      <div className="panel-row-value">{children}</div>
    </div>
  )
}

function PersonLink({ person, onSelect }: { person: Person; onSelect: (p: Person) => void }) {
  return (
    <button type="button" className="person-link" onClick={() => onSelect(person)}>
      {fullName(person)}
    </button>
  )
}

function PersonList({ people, onSelect }: { people: Person[]; onSelect: (p: Person) => void }) {
  return (
    <span className="person-list">
      {people.map((p, i) => (
        <span key={p.id}>
          {i > 0 && ', '}
          <PersonLink person={p} onSelect={onSelect} />
        </span>
      ))}
    </span>
  )
}
