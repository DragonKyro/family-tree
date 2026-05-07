import { useEffect, useMemo, useState } from 'react'
import type { FamilyData, Person } from '../types'
import { fullName } from '../lib/familyData'
import { holidaysOn } from '../lib/holidays'

interface Props {
  data: FamilyData
  onSelectPerson: (p: Person) => void
  onClose: () => void
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

  const byDate = useMemo(() => {
    const map = new Map<string, Person[]>()
    for (const p of data) {
      const b = p.data.birthday
      if (!b) continue
      const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(b)
      if (!m) continue
      const key = `${m[1]}-${m[2]}`
      const arr = map.get(key) ?? []
      arr.push(p)
      map.set(key, arr)
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
  const selectedPeople = selectedKey ? byDate.get(selectedKey) ?? [] : []
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
          const hasBday = !c.outside && byDate.has(c.key)
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
            hasBday ? 'has-bday' : '',
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
                {hasBday && <span className="bday-dot" />}
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
              {selectedPeople.length > 0 && (
                <span className="muted"> · {selectedPeople.length}</span>
              )}
            </h4>

            {selectedHolidays.map((h) => (
              <div key={h.name} className="calendar-holiday">
                <span aria-hidden>{h.emoji}</span> {h.name}
              </div>
            ))}

            {selectedPeople.map((p) => {
              const meta = ageLine(p, view.year)
              return (
                <button key={p.id} className="calendar-person" onClick={() => onSelectPerson(p)}>
                  <span className="calendar-person-name">
                    {fullName(p)}
                    {p.data.deceased && <span aria-hidden> †</span>}
                  </span>
                  {meta && <span className="calendar-person-meta">{meta}</span>}
                </button>
              )
            })}

            {selectedPeople.length === 0 && selectedHolidays.length === 0 && (
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
