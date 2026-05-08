import { useEffect, useMemo, useState } from 'react'
import type { FamilyData, Person } from '../types'
import { getAstrology } from '../lib/astrology'
import { fullName } from '../lib/familyData'
import {
  SIGN_CATEGORIES,
  type Sign,
  type SignCategory,
  signsByCategory,
} from '../lib/signs'

export interface FocusedSign {
  category: SignCategory
  /** Sign key — e.g. 'aries', 'rat', 'metal', 'garnet', 'INTJ'. */
  key: string
}

interface Props {
  data: FamilyData
  focused: FocusedSign | null
  onSelectPerson: (p: Person) => void
  onClose: () => void
}

export function SignsPanel({ data, focused, onSelectPerson, onClose }: Props) {
  const [category, setCategory] = useState<SignCategory>(focused?.category ?? 'zodiac')
  const [activeKey, setActiveKey] = useState<string | null>(focused?.key ?? null)
  const [familyOnly, setFamilyOnly] = useState(false)

  // Re-sync when an external focus arrives (e.g. user clicks another row in
  // the side panel while the explorer is already open).
  useEffect(() => {
    if (!focused) return
    setCategory(focused.category)
    setActiveKey(focused.key)
  }, [focused])

  // Esc to close.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Per-sign roster: which family members fall under each sign? ───────────
  // Computed once per family-data ref and shared across categories.
  const roster = useMemo(() => buildRoster(data), [data])

  const signs = useMemo(() => signsByCategory(category), [category])

  const visibleSigns = useMemo(() => {
    if (!familyOnly) return signs
    return signs.filter((s) => (roster[category]?.[s.key]?.length ?? 0) > 0)
  }, [signs, familyOnly, roster, category])

  // Keep the active sign valid: if filtering hid it, fall back to the first
  // visible sign in the current category (or null if none).
  useEffect(() => {
    if (!visibleSigns.length) {
      setActiveKey(null)
      return
    }
    if (!activeKey || !visibleSigns.some((s) => s.key === activeKey)) {
      setActiveKey(visibleSigns[0].key)
    }
  }, [visibleSigns, activeKey])

  const active = activeKey ? signs.find((s) => s.key === activeKey) ?? null : null
  const peopleForActive =
    active ? roster[category]?.[active.key] ?? [] : []

  return (
    <div className="tool-panel signs-panel" role="dialog" aria-label="Signs explorer">
      <header className="tool-panel-header">
        <div className="month-label">Signs</div>
        <label className="signs-family-toggle" title="Only show signs that someone in this family has">
          <input
            type="checkbox"
            checked={familyOnly}
            onChange={(e) => setFamilyOnly(e.target.checked)}
          />
          <span>In family</span>
        </label>
        <button className="tool-panel-close" onClick={onClose} aria-label="Close">×</button>
      </header>

      <div className="signs-tabs" role="tablist">
        {SIGN_CATEGORIES.map((c) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={c.key === category}
            className={`signs-tab${c.key === category ? ' active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            <span aria-hidden>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="signs-body">
        <ul className="signs-list" role="listbox" aria-label={`${category} signs`}>
          {visibleSigns.map((s) => {
            const count = roster[category]?.[s.key]?.length ?? 0
            return (
              <li key={s.key}>
                <button
                  role="option"
                  aria-selected={s.key === activeKey}
                  className={`signs-list-item${s.key === activeKey ? ' active' : ''}`}
                  onClick={() => setActiveKey(s.key)}
                >
                  <span className="signs-list-emoji" aria-hidden>{s.emoji}</span>
                  <span className="signs-list-name">{s.name}</span>
                  {count > 0 && <span className="signs-list-count">{count}</span>}
                </button>
              </li>
            )
          })}
          {visibleSigns.length === 0 && (
            <li className="signs-empty">No one in this family fits this category.</li>
          )}
        </ul>

        <div className="signs-detail">
          {active ? (
            <SignDetail
              sign={active}
              people={peopleForActive}
              onSelectPerson={onSelectPerson}
            />
          ) : (
            <p className="signs-empty">Pick a sign on the left.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Detail pane ─────────────────────────────────────────────────────────────

function SignDetail({
  sign,
  people,
  onSelectPerson,
}: {
  sign: Sign
  people: Person[]
  onSelectPerson: (p: Person) => void
}) {
  const metaEntries = sign.meta ? Object.entries(sign.meta) : []
  return (
    <article className="signs-detail-inner">
      <header className="signs-detail-header">
        <div className="signs-detail-emoji" aria-hidden>{sign.emoji}</div>
        <h3 className="signs-detail-name">{sign.name}</h3>
      </header>

      {metaEntries.length > 0 && (
        <dl className="signs-meta">
          {metaEntries.map(([k, v]) => (
            <div key={k} className="signs-meta-row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {sign.summary && <p className="signs-summary">{sign.summary}</p>}

      {sign.strengths.length > 0 && (
        <Bullets title="Strengths" items={sign.strengths} />
      )}
      {sign.weaknesses.length > 0 && (
        <Bullets title="Weaknesses" items={sign.weaknesses} />
      )}
      {sign.compatibility.length > 0 && (
        <Bullets title="Compatible with" items={sign.compatibility} />
      )}

      {!sign.summary &&
        sign.strengths.length === 0 &&
        sign.weaknesses.length === 0 &&
        sign.compatibility.length === 0 && (
          <p className="signs-empty">Description coming soon.</p>
        )}

      {people.length > 0 && (
        <section className="signs-people">
          <h4 className="signs-people-title">In this family ({people.length})</h4>
          <ul>
            {people.map((p) => (
              <li key={p.id}>
                <button className="person-link" onClick={() => onSelectPerson(p)}>
                  {fullName(p)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="signs-bullets">
      <h4>{title}</h4>
      <ul>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </section>
  )
}

// ── Roster build ────────────────────────────────────────────────────────────

type Roster = Partial<Record<SignCategory, Record<string, Person[]>>>

function buildRoster(data: FamilyData): Roster {
  const out: Roster = {
    zodiac: {},
    chineseZodiac: {},
    element: {},
    birthstone: {},
    mbti: {},
  }
  for (const p of data) {
    const astro = getAstrology(p.data.birthday)
    if (astro) {
      push(out.zodiac!,        astro.zodiacSign.toLowerCase(),       p)
      push(out.chineseZodiac!, astro.chineseZodiac.toLowerCase(),    p)
      push(out.element!,       astro.chineseElement.toLowerCase(),   p)
      if (astro.birthstone) {
        push(out.birthstone!, astro.birthstone.toLowerCase(), p)
      }
    }
    if (p.data.mbti) {
      push(out.mbti!, p.data.mbti, p)
    }
  }
  return out
}

function push(bucket: Record<string, Person[]>, key: string, p: Person) {
  if (!bucket[key]) bucket[key] = []
  bucket[key].push(p)
}
