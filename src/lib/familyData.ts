import familyJson from '../data/family.json'
import type { FamilyData, Person } from '../types'

export const SYNTHETIC_ROOT_ID = 'family-root'
export const LUI_ROOT_ID = 'gf-lui'
export const SHUM_ROOT_ID = 'gf-shum'

export function loadFamily(): FamilyData {
  return familyJson as FamilyData
}

/**
 * family-chart walks only ancestors (up) and descendants (down) from the "main"
 * person, so aunts/uncles/cousins are never visited. To render the full tree
 * we graft a hidden synthetic root above both grandparent couples.
 *
 * Kyle's mother Janet would otherwise appear twice — once as Gong Gong's
 * descendant in the Shum subtree, once as Alex's spouse in the Lui subtree —
 * so we unhook her from Gong Gong + Po Po's children lists at render time.
 * Her `rels.father`/`rels.mother` stay intact in the source data, so the
 * details panel still shows her parents correctly.
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
    data: {
      first_name: '',
      last_name: '',
      gender: 'M',
      branch: 'placeholder',
    },
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
