/**
 * Compute zodiac sign, Chinese zodiac, birthstone, and age from a YYYY-MM-DD
 * birthday. All return null when the input isn't parseable.
 */

import type { PersonData } from '../types'

export interface Astro {
  zodiacSign: string
  zodiacSymbol: string
  chineseZodiac: string
  chineseZodiacEmoji: string
  chineseElement: string
  chineseElementColor: string
  chineseElementEmoji: string
  birthstone: string
  birthstoneEmoji: string
}

const ZODIAC: Array<{ sign: string; symbol: string; from: [number, number]; to: [number, number] }> = [
  { sign: 'Capricorn',   symbol: '♑', from: [12, 22], to: [1, 19] },
  { sign: 'Aquarius',    symbol: '♒', from: [1, 20],  to: [2, 18] },
  { sign: 'Pisces',      symbol: '♓', from: [2, 19],  to: [3, 20] },
  { sign: 'Aries',       symbol: '♈', from: [3, 21],  to: [4, 19] },
  { sign: 'Taurus',      symbol: '♉', from: [4, 20],  to: [5, 20] },
  { sign: 'Gemini',      symbol: '♊', from: [5, 21],  to: [6, 20] },
  { sign: 'Cancer',      symbol: '♋', from: [6, 21],  to: [7, 22] },
  { sign: 'Leo',         symbol: '♌', from: [7, 23],  to: [8, 22] },
  { sign: 'Virgo',       symbol: '♍', from: [8, 23],  to: [9, 22] },
  { sign: 'Libra',       symbol: '♎', from: [9, 23],  to: [10, 22] },
  { sign: 'Scorpio',     symbol: '♏', from: [10, 23], to: [11, 21] },
  { sign: 'Sagittarius', symbol: '♐', from: [11, 22], to: [12, 21] },
]

const CHINESE = [
  { name: 'Rat',     emoji: '🐀' },
  { name: 'Ox',      emoji: '🐂' },
  { name: 'Tiger',   emoji: '🐅' },
  { name: 'Rabbit',  emoji: '🐇' },
  { name: 'Dragon',  emoji: '🐉' },
  { name: 'Snake',   emoji: '🐍' },
  { name: 'Horse',   emoji: '🐎' },
  { name: 'Goat',    emoji: '🐐' },
  { name: 'Monkey',  emoji: '🐒' },
  { name: 'Rooster', emoji: '🐓' },
  { name: 'Dog',     emoji: '🐕' },
  { name: 'Pig',     emoji: '🐖' },
]

/**
 * The 60-year Chinese cycle pairs each animal with one of five elements
 * (Wu Xing). The element rotates every two years. Colloquially each element
 * also has a color name — "Metal Dragon" is popularly the "Golden Dragon".
 *
 * Year-last-digit → element:
 *   0,1 → Metal,  2,3 → Water,  4,5 → Wood,  6,7 → Fire,  8,9 → Earth
 */
const ELEMENTS = [
  { name: 'Metal', color: 'Gold',  emoji: '🪙' },
  { name: 'Water', color: 'Black', emoji: '💧' },
  { name: 'Wood',  color: 'Green', emoji: '🌳' },
  { name: 'Fire',  color: 'Red',   emoji: '🔥' },
  { name: 'Earth', color: 'Yellow', emoji: '🪨' },
]

// Chinese New Year dates 1900–2050 as "MM-DD" within that calendar year.
// Anyone born BEFORE this date in their birth year belongs to the previous
// year's animal. Source: standard ephemeris.
const CNY: Record<number, string> = {
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

const BIRTHSTONES: Array<{ name: string; emoji: string } | null> = [
  null, // 1-indexed
  { name: 'Garnet',     emoji: '🔴' },
  { name: 'Amethyst',   emoji: '🟣' },
  { name: 'Aquamarine', emoji: '🔷' },
  { name: 'Diamond',    emoji: '💎' },
  { name: 'Emerald',    emoji: '🟢' },
  { name: 'Pearl',      emoji: '⚪' },
  { name: 'Ruby',       emoji: '❤️' },
  { name: 'Peridot',    emoji: '🟩' },
  { name: 'Sapphire',   emoji: '🔵' },
  { name: 'Opal',       emoji: '🌈' },
  { name: 'Topaz',      emoji: '🟡' },
  { name: 'Turquoise',  emoji: '🟦' },
]

interface ParsedDate { year: number; month: number; day: number }

function parseDate(s: string | undefined): ParsedDate | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

function effectiveChineseYear({ year, month, day }: ParsedDate): number {
  // If born before that year's Chinese New Year, count toward the previous year.
  const cnyKey = CNY[year]
  if (cnyKey) {
    const [cnyM, cnyD] = cnyKey.split('-').map(Number)
    if (month < cnyM || (month === cnyM && day < cnyD)) {
      return year - 1
    }
  }
  return year
}

function chineseZodiacForBirthday(parsed: ParsedDate): { name: string; emoji: string } {
  const year = effectiveChineseYear(parsed)
  // 2020 is Year of the Rat (index 0). The cycle then advances: Ox, Tiger, …
  const idx = ((year - 2020) % 12 + 12) % 12
  return CHINESE[idx]
}

function chineseElementForBirthday(parsed: ParsedDate): { name: string; color: string; emoji: string } {
  const year = effectiveChineseYear(parsed)
  // Element index = floor((year mod 10) / 2) but with Metal=0 starting at years
  // ending in 0/1 (e.g., 2000 = Metal Dragon = "Golden Dragon").
  const idx = Math.floor(((year % 10) + 10) % 10 / 2)
  return ELEMENTS[idx]
}

function zodiacForBirthday({ month, day }: ParsedDate): { sign: string; symbol: string } {
  for (const { sign, symbol, from, to } of ZODIAC) {
    if (sign === 'Capricorn') {
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { sign, symbol }
      continue
    }
    if (
      (month === from[0] && day >= from[1]) ||
      (month === to[0] && day <= to[1])
    ) {
      return { sign, symbol }
    }
  }
  // Fallback (shouldn't reach)
  return { sign: 'Capricorn', symbol: '♑' }
}

export function getAstrology(birthday: string | undefined): Astro | null {
  const parsed = parseDate(birthday)
  if (!parsed) return null
  const z = zodiacForBirthday(parsed)
  const cz = chineseZodiacForBirthday(parsed)
  const el = chineseElementForBirthday(parsed)
  const bs = BIRTHSTONES[parsed.month]
  return {
    zodiacSign: z.sign,
    zodiacSymbol: z.symbol,
    chineseZodiac: cz.name,
    chineseZodiacEmoji: cz.emoji,
    chineseElement: el.name,
    chineseElementColor: el.color,
    chineseElementEmoji: el.emoji,
    birthstone: bs?.name ?? '',
    birthstoneEmoji: bs?.emoji ?? '💎',
  }
}

/**
 * Compute age from birthday up to either deathday or today. Returns label like
 * "75 years old" or "62 at death" or null when birthday is missing.
 */
export function getAgeText(d: PersonData, today: Date = new Date()): string | null {
  const birth = parseDate(d.birthday)
  if (!birth) return null
  const death = parseDate(d.deathday)
  const end = death
    ? new Date(death.year, death.month - 1, death.day)
    : today
  const birthDate = new Date(birth.year, birth.month - 1, birth.day)
  let years = end.getFullYear() - birthDate.getFullYear()
  const beforeBirthday =
    end.getMonth() < birthDate.getMonth() ||
    (end.getMonth() === birthDate.getMonth() && end.getDate() < birthDate.getDate())
  if (beforeBirthday) years--
  if (years < 0) return null
  if (death || d.deceased) {
    return death ? `${years} at death` : `b. ${birth.year}`
  }
  return `${years} years old`
}
