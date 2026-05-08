import { useEffect, useMemo, useState } from 'react'
import type { FamilyData, Person } from '../types'
import { fullName } from '../lib/familyData'
import { holidaysOn } from '../lib/holidays'

interface Props {
  data: FamilyData
  onSelectPerson: (p: Person) => void
  onClose: () => void
}

type EventKind = 'birthday' | 'death' | 'anniversary'

interface DayEvent {
  person: Person
  kind: EventKind
  /** For anniversaries: the spouse on the other side of the marriage. */
  spouse?: Person
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function CalendarPanel({ data, onSelectPerson, onClose }: Props) {
  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())

  // Build a unified "MM-DD" → events map covering birthdays, deathdays, and anniversaries.
  // Anniversaries are deduped per couple-day so a wedding date stored on both spouses
  // doesn't render twice.
  const byDate = useMemo(() => {
    const map = new Map<string, DayEvent[]>()
    const byId = new Map(data.map((p) => [p.id, p]))
    const seenAnniversary = new Set<string>()

    const push = (key: string, ev: DayEvent) => {
      const arr = map.get(key) ?? []
      arr.push(ev)
      map.set(key, arr)
    }

    for (const p of data) {
      const b = monthDayKey(p.data.birthday)
      if (b) push(b, { person: p, kind: 'birthday' })
      const dd = monthDayKey(p.data.deathday)
      if (dd) push(dd, { person: p, kind: 'death' })
      const wd = monthDayKey(p.data.wedding_date)
      if (wd && p.rels.spouses?.length) {
        for (const sid of p.rels.spouses) {
          const pair = [p.id, sid].sort().join('|')
          const dedupeKey = `${pair}::${wd}`
          if (seenAnniversary.has(dedupeKey)) continue
          seenAnniversary.add(dedupeKey)
          const sp = byId.get(sid)
          if (sp) push(wd, { person: p, kind: 'anniversary', spouse: sp })
        }
      }
    }
    return map
  }, [data])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrevMonth()
      else if (e.key === 'ArrowRight') goNextMonth()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose])

  const goPrevMonth = () =>
    setView((v) => ({
      year: v.month === 0 ? v.year - 1 : v.year,
      month: v.month === 0 ? 11 : v.month - 1,
    }))
  const goNextMonth = () =>
    setView((v) => ({
      year: v.month === 11 ? v.year + 1 : v.year,
      month: v.month === 11 ? 0 : v.month + 1,
    }))
  const goPrevYear = () => setView((v) => ({ ...v, year: v.year - 1 }))
  const goNextYear = () => setView((v) => ({ ...v, year: v.year + 1 }))
  const goToday = () => {
    setView({ year: today.getFullYear(), month: today.getMonth() })
    setSelectedDay(today.getDate())
  }

  const startDow = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const daysInPrevMonth = new Date(view.year, view.month, 0).getDate()

  type Cell = { day: number; outside: boolean; key: string }
  const cells: Cell[] = []
  for (let i = startDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const month = view.month === 0 ? 12 : view.month
    cells.push({ day: d, outside: true, key: `${pad2(month)}-${pad2(d)}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, outside: false, key: `${pad2(view.month + 1)}-${pad2(d)}` })
  }
  let i = 1
  while (cells.length < 42) {
    const month = view.month === 11 ? 1 : view.month + 2
    cells.push({ day: i, outside: true, key: `${pad2(month)}-${pad2(i)}` })
    i++
  }

  const selectedKey =
    selectedDay != null ? `${pad2(view.month + 1)}-${pad2(selectedDay)}` : null
  const selectedEvents = selectedKey ? byDate.get(selectedKey) ?? [] : []
  const selectedHolidays =
    selectedDay != null ? holidaysOn(view.year, view.month + 1, selectedDay) : []

  return (
    <div className="tool-panel calendar-panel" role="dialog" aria-label="Birthday calendar">
      <header className="tool-panel-header">
        <button className="nav" onClick={goPrevYear} aria-label="Previous year" title="Previous year">«</button>
        <button className="nav" onClick={goPrevMonth} aria-label="Previous month" title="Previous month">‹</button>
        <div className="month-label">{MONTH_NAMES[view.month]} {view.year}</div>
        <button className="nav" onClick={goNextMonth} aria-label="Next month" title="Next month">›</button>
        <button className="nav" onClick={goNextYear} aria-label="Next year" title="Next year">»</button>
        <button className="nav today-btn" onClick={goToday} title="Today">Today</button>
        <button className="tool-panel-close" onClick={onClose} aria-label="Close">×</button>
      </header>

      <div className="calendar-dow-row">
        {DOW.map((d, idx) => <div key={idx} className="calendar-dow">{d}</div>)}
      </div>

      <div className="calendar-grid">
        {cells.map((c, idx) => {
          const events = c.outside ? [] : byDate.get(c.key) ?? []
          const kinds = new Set(events.map((e) => e.kind))
          const cellHolidays = c.outside ? [] : holidaysOn(view.year, view.month + 1, c.day)
          const hasHoliday = cellHolidays.length > 0
          const isToday =
            !c.outside &&
            view.year === today.getFullYear() &&
            view.month === today.getMonth() &&
            c.day === today.getDate()
          const isSelected = !c.outside && c.day === selectedDay
          const cls = [
            'calendar-day',
            c.outside ? 'outside' : '',
            isToday ? 'today' : '',
            kinds.size > 0 ? 'has-event' : '',
            hasHoliday ? 'has-holiday' : '',
            isSelected ? 'selected' : '',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={idx}
              className={cls}
              onClick={() => !c.outside && setSelectedDay(c.day)}
              disabled={c.outside}
              aria-label={`${MONTH_NAMES[view.month]} ${c.day}`}
              title={hasHoliday ? cellHolidays.map((h) => h.name).join(', ') : undefined}
            >
              <span className="day-num">{c.day}</span>
              <span className="day-marks" aria-hidden>
                {hasHoliday && <span className="holiday-dot" />}
                {kinds.has('birthday') && <span className="bday-dot" />}
                {kinds.has('anniversary') && <span className="anniv-dot" />}
                {kinds.has('death') && <span className="death-dot" />}
              </span>
            </button>
          )
        })}
      </div>

      <div className="calendar-people">
        {selectedDay != null && (
          <>
            <h4>
              {MONTH_NAMES[view.month]} {selectedDay}
              {selectedEvents.length > 0 && (
                <span className="muted"> · {selectedEvents.length}</span>
              )}
            </h4>

            {selectedHolidays.map((h) => (
              <div key={h.name} className="calendar-holiday">
                <span aria-hidden>{h.emoji}</span> {h.name}
              </div>
            ))}

            {selectedEvents.map((ev, i) => {
              if (ev.kind === 'anniversary') {
                const a = ev.person
                const b = ev.spouse!
                const yearsText = anniversaryYears(a.data.wedding_date, view.year)
                return (
                  <div key={`anniv-${a.id}-${b.id}`} className="calendar-event">
                    <span aria-hidden className="event-icon">💍</span>
                    <span className="calendar-person-name">
                      <button className="event-link" onClick={() => onSelectPerson(a)}>{fullName(a)}</button>
                      {' & '}
                      <button className="event-link" onClick={() => onSelectPerson(b)}>{fullName(b)}</button>
                    </span>
                    {yearsText && <span className="calendar-person-meta">{yearsText}</span>}
                  </div>
                )
              }
              const p = ev.person
              const meta =
                ev.kind === 'birthday'
                  ? ageLine(p, view.year)
                  : ev.kind === 'death'
                    ? deathLine(p, view.year)
                    : ''
              const icon = ev.kind === 'birthday' ? '🎂' : '🕊️'
              return (
                <button
                  key={`${ev.kind}-${p.id}-${i}`}
                  className="calendar-event calendar-person"
                  onClick={() => onSelectPerson(p)}
                >
                  <span aria-hidden className="event-icon">{icon}</span>
                  <span className="calendar-person-name">{fullName(p)}</span>
                  {meta && <span className="calendar-person-meta">{meta}</span>}
                </button>
              )
            })}

            {selectedEvents.length === 0 && selectedHolidays.length === 0 && (
              <p className="calendar-empty">Nothing on this day.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function monthDayKey(iso: string | undefined): string | null {
  if (!iso) return null
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[1]}-${m[2]}` : null
}

function anniversaryYears(weddingDate: string | undefined, viewYear: number): string {
  if (!weddingDate) return ''
  const m = /^(\d{4})/.exec(weddingDate)
  if (!m) return ''
  const startYear = Number(m[1])
  const years = viewYear - startYear
  if (years < 0) return `since ${startYear}`
  if (years === 0) return 'wedding day'
  return `${years} year${years === 1 ? '' : 's'}`
}

function deathLine(p: Person, viewYear: number): string {
  const dd = p.data.deathday
  if (!dd) return ''
  const m = /^(\d{4})/.exec(dd)
  if (!m) return ''
  const deathYear = Number(m[1])
  const years = viewYear - deathYear
  if (years < 0) return `d. ${deathYear}`
  if (years === 0) return `passed ${deathYear}`
  return `${years} year${years === 1 ? '' : 's'} ago`
}

function ageLine(p: Person, viewYear: number): string {
  const b = p.data.birthday
  if (!b) return ''
  const m = /^(\d{4})/.exec(b)
  if (!m) return ''
  const birthYear = Number(m[1])
  const dm = p.data.deathday ? /^(\d{4})/.exec(p.data.deathday) : null
  if (dm) return `${birthYear} – ${dm[1]}`
  if (p.data.deceased) return `b. ${birthYear}`
  const age = viewYear - birthYear
  if (age < 0) return `b. ${birthYear}`
  return `turns ${age}`
}
