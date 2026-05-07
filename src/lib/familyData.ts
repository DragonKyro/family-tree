import familyJson from '../../data/family.json'
import type { FamilyData, Person } from '../types'

export const SYNTHETIC_ROOT_ID = 'family-root'
export const LUI_ROOT_ID = 'gf-lui'
export const SHUM_ROOT_ID = 'gf-shum'

/**
 * The bundled JSON is either a plain array (older shape) or { data, version }
 * (newer shape from when an API wrote it). We just need the array.
 */
export function loadFamily(): FamilyData {
  const raw = familyJson as unknown
  if (Array.isArray(raw)) return raw as FamilyData
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: FamilyData }).data
  }
  return []
}

/**
 * family-chart walks only ancestors (up) and descendants (down) from the "main"
 * person, so aunts/uncles/cousins are never visited. To render the full tree
 * we graft a hidden synthetic root above both grandparent couples.
 *
 * Janet would otherwise appear twice (as Gong Gong's descendant + as Alex's
 * spouse), so we unhook her from Gong Gong + Po Po's children at render time.
 * Her rels.father/mother stay intact so the side panel still shows her parents.
 */
const BRIDGE_CHILD_IDS = ['janet-shum']

export function buildTreeData(source: FamilyData): FamilyData {
  const clone: FamilyData = structuredClone(source)
  const byId = new Map(clone.map((p) => [p.id, p]))

  clone.forEach((p) => {
    delete p.main
  })

  for (const bridgeId of BRIDGE_CHILD_IDS) {
    const bridge = byId.get(bridgeId)
    if (!bridge) continue
    const parentIds = [bridge.rels.father, bridge.rels.mother].filter(Boolean) as string[]
    for (const pid of parentIds) {
      const parent = byId.get(pid)
      if (!parent?.rels.children) continue
      parent.rels.children = parent.rels.children.filter((id) => id !== bridgeId)
    }
  }

  const root: Person = {
    id: SYNTHETIC_ROOT_ID,
    main: true,
    data: { first_name: '', last_name: '', gender: 'M', branch: 'placeholder' },
    rels: {
      children: [LUI_ROOT_ID, SHUM_ROOT_ID].filter((id) => byId.has(id)),
    },
  }
  clone.unshift(root)
  byId.set(root.id, root)

  return clone
}

export function findById(data: FamilyData, id: string): Person | undefined {
  return data.find((p) => p.id === id)
}

export function fullName(p: Person): string {
  return [p.data.first_name, p.data.last_name].filter(Boolean).join(' ').trim() || '—'
}

export function isSynthetic(p: Person): boolean {
  return p.id === SYNTHETIC_ROOT_ID
}

export function searchByName(data: FamilyData, query: string): Person[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return data
    .filter((p) => !isSynthetic(p) && fullName(p).toLowerCase().includes(q))
    .slice(0, 20)
}

/**
 * Photo paths are stored as "/photos/<file>". On GitHub Pages the site is
 * served from a subpath (e.g. /family-tree/), so we prepend the configured
 * base URL. Vite injects this as import.meta.env.BASE_URL at build time.
 */
export function resolvePhotoUrl(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  if (!path.startsWith('/')) path = '/' + path
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return base + path
}
