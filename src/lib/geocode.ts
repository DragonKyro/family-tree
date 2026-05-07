/**
 * Best-effort geocoder using OpenStreetMap's Nominatim service. Free, no key,
 * but rate-limited (~1 req/sec). We cache every successful (and negative)
 * lookup to localStorage so a town only ever hits the network once.
 */

const CACHE_KEY = 'family-tree-geocode-v1'

type CacheEntry = { lat: number; lng: number } | null

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // ignore
  }
}

const inflight = new Map<string, Promise<CacheEntry>>()

export async function geocodeTown(town: string): Promise<[number, number] | null> {
  const key = town.trim().toLowerCase()
  if (!key) return null
  const cache = readCache()
  if (key in cache) {
    const v = cache[key]
    return v ? [v.lat, v.lng] : null
  }
  if (inflight.has(key)) {
    const v = await inflight.get(key)!
    return v ? [v.lat, v.lng] : null
  }

  const promise = (async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(town)}&format=json&limit=1`
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) return null
      const data = (await res.json()) as Array<{ lat: string; lon: string }>
      if (!data?.[0]) {
        const next = readCache()
        next[key] = null
        writeCache(next)
        return null
      }
      const lat = Number(data[0].lat)
      const lng = Number(data[0].lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      const next = readCache()
      next[key] = { lat, lng }
      writeCache(next)
      return next[key]
    } catch {
      return null
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, promise)
  const v = await promise
  return v ? [v.lat, v.lng] : null
}
