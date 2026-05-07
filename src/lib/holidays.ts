/**
 * A pragmatic set of holidays for Cantonese-American families.
 *
 * Each entry has a name + emoji + a date resolver. Date resolvers either
 * return a fixed `MM-DD` string (independent of year) or compute the
 * `MM-DD` for a specific year (for things like Thanksgiving / lunar holidays).
 *
 * `holidaysOnDate(year, month, day)` returns all holidays that fall on that
 * specific calendar date.
 */

interface FixedHoliday {
  name: string
  emoji: string
  month: number
  day: number
}

interface ComputedHoliday {
  name: string
  emoji: string
  /** Returns "MM-DD" for the given year, or null if not applicable. */
  dateFor: (year: number) => string | null
}

const FIXED: FixedHoliday[] = [
  { name: "New Year's Day",    emoji: '🎉', month: 1,  day: 1 },
  { name: "Valentine's Day",   emoji: '💕', month: 2,  day: 14 },
  { name: "St. Patrick's Day", emoji: '☘️', month: 3,  day: 17 },
  { name: 'Earth Day',         emoji: '🌍', month: 4,  day: 22 },
  { name: 'Independence Day',  emoji: '🎆', month: 7,  day: 4 },
  { name: 'Juneteenth',        emoji: '✊🏾', month: 6, day: 19 },
  { name: 'Halloween',         emoji: '🎃', month: 10, day: 31 },
  { name: 'Veterans Day',      emoji: '🎖️', month: 11, day: 11 },
  { name: 'Christmas Eve',     emoji: '🎄', month: 12, day: 24 },
  { name: 'Christmas',         emoji: '🎄', month: 12, day: 25 },
  { name: 'Boxing Day',        emoji: '📦', month: 12, day: 26 },
  { name: "New Year's Eve",    emoji: '🎊', month: 12, day: 31 },
]

/** Lunar New Year (1st day) — uses our table from astrology.ts. */
const LUNAR_NEW_YEAR: Record<number, string> = {
  1900: '01-31', 1901: '02-19', 1902: '02-08', 1903: '01-29', 1904: '02-16',
  1905: '02-04', 1906: '01-25', 1907: '02-13', 1908: '02-02', 1909: '01-22',
  1910: '02-10', 1911: '01-30', 1912: '02-18', 1913: '02-06', 1914: '01-26',
  1915: '02-14', 1916: '02-03', 1917: '01-23', 1918: '02-11', 1919: '02-01',
  1920: '02-20', 1921: '02-08', 1922: '01-28', 1923: '02-16', 1924: '02-05',
  1925: '01-24', 1926: '02-13', 1927: '02-02', 1928: '01-23', 1929: '02-10',
  1930: '01-30', 1931: '02-17', 1932: '02-06', 1933: '01-26', 1934: '02-14',
  1935: '02-04', 1936: '01-24', 1937: '02-11', 1938: '01-31', 1939: '02-19',
  1940: '02-08', 1941: '01-27', 1942: '02-15', 1943: '02-05', 1944: '01-25',
  1945: '02-13', 1946: '02-02', 1947: '01-22', 1948: '02-10', 1949: '01-29',
  1950: '02-17', 1951: '02-06', 1952: '01-27', 1953: '02-14', 1954: '02-03',
  1955: '01-24', 1956: '02-12', 1957: '01-31', 1958: '02-18', 1959: '02-08',
  1960: '01-28', 1961: '02-15', 1962: '02-05', 1963: '01-25', 1964: '02-13',
  1965: '02-02', 1966: '01-21', 1967: '02-09', 1968: '01-30', 1969: '02-17',
  1970: '02-06', 1971: '01-27', 1972: '02-15', 1973: '02-03', 1974: '01-23',
  1975: '02-11', 1976: '01-31', 1977: '02-18', 1978: '02-07', 1979: '01-28',
  1980: '02-16', 1981: '02-05', 1982: '01-25', 1983: '02-13', 1984: '02-02',
  1985: '02-20', 1986: '02-09', 1987: '01-29', 1988: '02-17', 1989: '02-06',
  1990: '01-27', 1991: '02-15', 1992: '02-04', 1993: '01-23', 1994: '02-10',
  1995: '01-31', 1996: '02-19', 1997: '02-07', 1998: '01-28', 1999: '02-16',
  2000: '02-05', 2001: '01-24', 2002: '02-12', 2003: '02-01', 2004: '01-22',
  2005: '02-09', 2006: '01-29', 2007: '02-18', 2008: '02-07', 2009: '01-26',
  2010: '02-14', 2011: '02-03', 2012: '01-23', 2013: '02-10', 2014: '01-31',
  2015: '02-19', 2016: '02-08', 2017: '01-28', 2018: '02-16', 2019: '02-05',
  2020: '01-25', 2021: '02-12', 2022: '02-01', 2023: '01-22', 2024: '02-10',
  2025: '01-29', 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13',
  2030: '02-03', 2031: '01-23', 2032: '02-11', 2033: '01-31', 2034: '02-19',
  2035: '02-08', 2036: '01-28', 2037: '02-15', 2038: '02-04', 2039: '01-24',
  2040: '02-12', 2041: '02-01', 2042: '01-22', 2043: '02-10', 2044: '01-30',
  2045: '02-17', 2046: '02-06', 2047: '01-26', 2048: '02-14', 2049: '02-02',
  2050: '01-23',
}

/** Mid-Autumn Festival (15th day of 8th lunar month). */
const MID_AUTUMN: Record<number, string> = {
  2018: '09-24', 2019: '09-13', 2020: '10-01', 2021: '09-21', 2022: '09-10',
  2023: '09-29', 2024: '09-17', 2025: '10-06', 2026: '09-25', 2027: '09-15',
  2028: '10-03', 2029: '09-22', 2030: '09-12', 2031: '10-01', 2032: '09-19',
  2033: '09-08', 2034: '09-27', 2035: '09-16', 2036: '10-04', 2037: '09-24',
  2038: '09-13', 2039: '10-02', 2040: '09-20', 2041: '09-10', 2042: '09-28',
  2043: '09-17', 2044: '10-05', 2045: '09-25', 2046: '09-15', 2047: '10-04',
  2048: '09-22', 2049: '09-11', 2050: '09-30',
}

const COMPUTED: ComputedHoliday[] = [
  {
    name: 'Lunar New Year',
    emoji: '🧧',
    dateFor: (year) => LUNAR_NEW_YEAR[year] ?? null,
  },
  {
    name: 'Lantern Festival',
    emoji: '🏮',
    dateFor: lanternFor,
  },
  {
    name: 'Ching Ming (Tomb-Sweeping)',
    emoji: '🪦',
    dateFor: chingMingFor,
  },
  {
    name: 'Dragon Boat Festival',
    emoji: '🛶',
    dateFor: (year) => DRAGON_BOAT[year] ?? null,
  },
  {
    name: 'Mid-Autumn Festival',
    emoji: '🥮',
    dateFor: (year) => MID_AUTUMN[year] ?? null,
  },
  // US federal Mondays
  { name: 'Martin Luther King Jr. Day', emoji: '🕊️', dateFor: (y) => nthWeekday(y, 1, 1, 3) },
  { name: "Presidents' Day",            emoji: '🎩', dateFor: (y) => nthWeekday(y, 2, 1, 3) },
  { name: 'Memorial Day',               emoji: '🌹', dateFor: (y) => lastWeekday(y, 5, 1) },
  { name: 'Labor Day',                  emoji: '🛠️', dateFor: (y) => nthWeekday(y, 9, 1, 1) },
  { name: 'Columbus Day',               emoji: '🚢', dateFor: (y) => nthWeekday(y, 10, 1, 2) },
  // Christian / spring movable feasts
  { name: 'Good Friday', emoji: '✝️', dateFor: goodFridayFor },
  { name: 'Easter',      emoji: '🐰', dateFor: easterFor },
  // Sundays
  {
    name: "Mother's Day (US)",
    emoji: '🌷',
    dateFor: mothersDayFor,
  },
  {
    name: "Father's Day (US)",
    emoji: '👔',
    dateFor: fathersDayFor,
  },
  {
    name: 'Thanksgiving (US)',
    emoji: '🦃',
    dateFor: thanksgivingFor,
  },
  {
    name: 'Black Friday',
    emoji: '🛍️',
    dateFor: blackFridayFor,
  },
]

/** Black Friday = day after Thanksgiving. */
function blackFridayFor(year: number): string {
  const tg = thanksgivingFor(year)
  const [m, d] = tg.split('-').map(Number)
  const date = new Date(year, m - 1, d + 1)
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Dragon Boat Festival (5th day of 5th lunar month). */
const DRAGON_BOAT: Record<number, string> = {
  2018: '06-18', 2019: '06-07', 2020: '06-25', 2021: '06-14', 2022: '06-03',
  2023: '06-22', 2024: '06-10', 2025: '05-31', 2026: '06-19', 2027: '06-09',
  2028: '05-28', 2029: '06-16', 2030: '06-05', 2031: '06-24', 2032: '06-12',
  2033: '06-01', 2034: '06-20', 2035: '06-10', 2036: '05-30', 2037: '06-18',
  2038: '06-07', 2039: '06-26', 2040: '06-14', 2041: '06-04', 2042: '06-22',
  2043: '06-12', 2044: '06-01', 2045: '06-19', 2046: '06-09', 2047: '05-29',
  2048: '06-16', 2049: '06-05', 2050: '06-24',
}

/**
 * Lantern Festival = 15th day of the 1st lunar month, i.e., 14 days after
 * Lunar New Year. Derived from the LUNAR_NEW_YEAR table.
 */
function lanternFor(year: number): string | null {
  const cny = LUNAR_NEW_YEAR[year]
  if (!cny) return null
  const [m, d] = cny.split('-').map(Number)
  const date = new Date(year, m - 1, d + 14)
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/**
 * Ching Ming (清明) — solar-tied. Approximation: April 4 in years where the
 * year mod 4 leaves 0 or 1 (covers leap and post-leap years through ~2050),
 * else April 5. Rough but matches the standard ephemeris within ±0 days for
 * 2020–2050.
 */
function chingMingFor(year: number): string {
  const r = year % 4
  return r === 0 || r === 1 ? '04-04' : '04-05'
}

/** Easter via Anonymous Gregorian Computus. */
function easterFor(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const mAdjust = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * mAdjust + 114) / 31)
  const day = ((h + l - 7 * mAdjust + 114) % 31) + 1
  return `${pad2(month)}-${pad2(day)}`
}

/** Good Friday = Easter − 2 days. */
function goodFridayFor(year: number): string {
  const easter = easterFor(year)
  const [m, d] = easter.split('-').map(Number)
  const date = new Date(year, m - 1, d - 2)
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Nth occurrence of a weekday in a month. month 1-indexed, dayOfWeek 0=Sun. */
function nthWeekday(year: number, month: number, dayOfWeek: number, n: number): string {
  const first = new Date(year, month - 1, 1).getDay()
  const offset = (dayOfWeek - first + 7) % 7
  const day = 1 + offset + (n - 1) * 7
  return `${pad2(month)}-${pad2(day)}`
}

/** Last occurrence of a weekday in a month. */
function lastWeekday(year: number, month: number, dayOfWeek: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  const lastWeekdayDow = new Date(year, month - 1, lastDay).getDay()
  const offset = (lastWeekdayDow - dayOfWeek + 7) % 7
  const day = lastDay - offset
  return `${pad2(month)}-${pad2(day)}`
}

/** US Thanksgiving = 4th Thursday of November. */
function thanksgivingFor(year: number): string {
  // 4th Thursday of November: 22nd if Nov 1 is Thursday (4th Thu = day 22),
  // else find the offset.
  const firstNov = new Date(year, 10, 1).getDay() // 0=Sun .. 4=Thu
  const offset = (4 - firstNov + 7) % 7 // days to first Thursday
  const day = 1 + offset + 21
  return `11-${pad2(day)}`
}

/** US Mother's Day = 2nd Sunday of May. */
function mothersDayFor(year: number): string {
  const firstMay = new Date(year, 4, 1).getDay()
  const offset = (0 - firstMay + 7) % 7
  const day = 1 + offset + 7
  return `05-${pad2(day)}`
}

/** US Father's Day = 3rd Sunday of June. */
function fathersDayFor(year: number): string {
  const firstJun = new Date(year, 5, 1).getDay()
  const offset = (0 - firstJun + 7) % 7
  const day = 1 + offset + 14
  return `06-${pad2(day)}`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export interface HolidayHit {
  name: string
  emoji: string
}

/** Returns all holidays falling on (year, month, day). Month is 1-indexed. */
export function holidaysOn(year: number, month: number, day: number): HolidayHit[] {
  const key = `${pad2(month)}-${pad2(day)}`
  const out: HolidayHit[] = []
  for (const h of FIXED) {
    if (h.month === month && h.day === day) out.push({ name: h.name, emoji: h.emoji })
  }
  for (const h of COMPUTED) {
    if (h.dateFor(year) === key) out.push({ name: h.name, emoji: h.emoji })
  }
  return out
}

/** Returns the next upcoming holiday (within `daysAhead`) starting from `from`. */
export function upcomingHoliday(from: Date, daysAhead = 14): { date: Date; holiday: HolidayHit } | null {
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    const hits = holidaysOn(d.getFullYear(), d.getMonth() + 1, d.getDate())
    if (hits.length > 0) return { date: d, holiday: hits[0] }
  }
  return null
}
