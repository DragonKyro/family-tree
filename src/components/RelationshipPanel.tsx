import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { FamilyData, Person } from '../types'
import { findById, fullName, isSynthetic } from '../lib/familyData'
import { getKinship } from '../lib/kinship'
import { isSpeechAvailable, speakCantonese } from '../lib/speech'

interface Props {
  data: FamilyData
  initialFromId?: string | null
  onClose: () => void
  /** Fires whenever either slot's selected id changes — drives the lineage-path highlight. */
  onSelectionChange?: (fromId: string | null, toId: string | null) => void
}

interface PickerSlot {
  query: string
  selectedId: string | null
}

type SlotKey = 'from' | 'to'

const EMPTY_SLOT: PickerSlot = { query: '', selectedId: null }

/** Imperative API exposed to App so a tree click can populate the active slot. */
export interface RelationshipPanelHandle {
  populate: (person: Person) => void
}

export const RelationshipPanel = forwardRef<RelationshipPanelHandle, Props>(
  function RelationshipPanel({ data, initialFromId, onClose, onSelectionChange }, ref) {
    const [from, setFrom] = useState<PickerSlot>(() =>
      initialFromId
        ? { selectedId: initialFromId, query: nameOrEmpty(findById(data, initialFromId)) }
        : EMPTY_SLOT,
    )
    const [to, setTo] = useState<PickerSlot>(EMPTY_SLOT)
    const [activeSlot, setActiveSlot] = useState<SlotKey>(initialFromId ? 'to' : 'from')

    const fromInputRef = useRef<HTMLInputElement>(null)
    const toInputRef = useRef<HTMLInputElement>(null)

    // Tree clicks (from App via ref) flow through here.
    useImperativeHandle(
      ref,
      () => ({
        populate(person: Person) {
          const slot: PickerSlot = { query: fullName(person), selectedId: person.id }
          setActiveSlot((current) => {
            if (current === 'from') {
              setFrom(slot)
              return 'to'
            }
            setTo(slot)
            return 'from'
          })
        },
      }),
      [],
    )

    // Esc to close, ignored if focus is in a search input (so typing doesn't fight it).
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    // Keep focus in whichever slot is currently active. Re-runs when the active
    // slot changes OR when its selected id changes (i.e., right after populate).
    useEffect(() => {
      const r = activeSlot === 'from' ? fromInputRef : toInputRef
      r.current?.focus()
    }, [activeSlot, from.selectedId, to.selectedId])

    // Notify parent of selection changes so it can draw the lineage path on the tree.
    // Also clear the path when this panel unmounts.
    useEffect(() => {
      onSelectionChange?.(from.selectedId, to.selectedId)
    }, [from.selectedId, to.selectedId, onSelectionChange])
    useEffect(() => {
      return () => {
        onSelectionChange?.(null, null)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fromPerson = from.selectedId ? findById(data, from.selectedId) ?? null : null
    const toPerson = to.selectedId ? findById(data, to.selectedId) ?? null : null

    const result = useMemo(() => {
      if (!fromPerson || !toPerson) return null
      return getKinship(fromPerson.id, toPerson.id, data)
    }, [fromPerson, toPerson, data])

    const swap = () => {
      const a = from
      setFrom(to)
      setTo(a)
    }

    return (
      <div className="tool-panel relationship-panel" role="dialog" aria-label="Family relationship finder">
        <header className="tool-panel-header">
          <div className="month-label">Relationship</div>
          <button className="nav today-btn" onClick={swap} title="Swap A and B">⇄</button>
          <button className="tool-panel-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <p className="rel-hint">
          Type a name <em>or</em> click a card in the tree to fill the highlighted slot.
        </p>

        <div className="rel-row">
          <NamePicker
            label="A"
            data={data}
            slot={from}
            onChange={setFrom}
            isActive={activeSlot === 'from'}
            onActivate={() => setActiveSlot('from')}
            inputRef={fromInputRef}
          />
          <span className="rel-arrow" aria-hidden>→</span>
          <NamePicker
            label="B"
            data={data}
            slot={to}
            onChange={setTo}
            isActive={activeSlot === 'to'}
            onActivate={() => setActiveSlot('to')}
            inputRef={toInputRef}
          />
        </div>

        <div className="rel-result">
          {!fromPerson || !toPerson ? (
            <p className="rel-empty">
              Pick two people. The result is what {fromPerson ? fullName(fromPerson) : 'A'} should call{' '}
              {toPerson ? fullName(toPerson) : 'B'}.
            </p>
          ) : !result ? (
            <p className="rel-empty">No family relationship found between these two.</p>
          ) : (
            <>
              <div className="rel-prompt">
                <strong>{fullName(fromPerson)}</strong> calls{' '}
                <strong>{fullName(toPerson)}</strong>:
              </div>
              <dl className="rel-labels">
                <dt>English</dt>
                <dd>{result.english}</dd>
                <dt>Cantonese</dt>
                <dd>
                  <span className="rel-cantonese">{result.cantonese}</span>
                  {isSpeechAvailable() && (
                    <button
                      type="button"
                      className="speak-btn"
                      onClick={() => speakCantonese(result.cantonese)}
                      aria-label={`Pronounce ${result.cantonese}`}
                      title="Pronounce"
                    >
                      🔊
                    </button>
                  )}
                  <span className="rel-jyutping"> · {result.jyutping}</span>
                </dd>
              </dl>
            </>
          )}
        </div>
      </div>
    )
  },
)

function nameOrEmpty(p: Person | undefined): string {
  return p ? fullName(p) : ''
}

interface NamePickerProps {
  label: string
  data: FamilyData
  slot: PickerSlot
  onChange: (s: PickerSlot) => void
  isActive: boolean
  onActivate: () => void
  inputRef: React.RefObject<HTMLInputElement>
}

function NamePicker({ label, data, slot, onChange, isActive, onActivate, inputRef }: NamePickerProps) {
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const q = slot.query.trim().toLowerCase()
    if (!q) return []
    return data
      .filter((p) => !isSynthetic(p) && fullName(p).toLowerCase().includes(q))
      .slice(0, 10)
  }, [data, slot.query])

  return (
    <div className={`rel-picker${isActive ? ' is-active' : ''}`}>
      <label className="rel-picker-label">{label}</label>
      <input
        ref={inputRef}
        type="search"
        value={slot.query}
        placeholder="Type a name or click on tree"
        onChange={(e) => {
          onChange({ query: e.target.value, selectedId: null })
          setOpen(true)
        }}
        onFocus={() => {
          onActivate()
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && slot.query && matches.length > 0 && (
        <div className="rel-picker-results">
          {matches.map((p) => (
            <button
              key={p.id}
              onMouseDown={(e) => {
                e.preventDefault()
                onChange({ query: fullName(p), selectedId: p.id })
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
