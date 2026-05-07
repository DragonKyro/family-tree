export function formatDisplayDate(isoDate: string | undefined): string {
  if (!isoDate) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) return isoDate
  const [, y, mm, dd] = m
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const month = monthNames[Number(mm) - 1] ?? mm
  const day = String(Number(dd))
  return `${month} ${day}, ${y}`
}

export function formatPhoneForDisplay(raw: string | undefined): string {
  return raw?.trim() ?? ''
}

export function telHref(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const digits = raw.replace(/\D/g, '')
  if (!digits) return undefined
  return `tel:+${digits}`
}

export function mailtoHref(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  return `mailto:${raw}`
}

// Comma-separated list → capitalize first letter of each element, normalize spacing.
export function formatInterests(raw: string | undefined): string {
  if (!raw) return ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join(', ')
}
