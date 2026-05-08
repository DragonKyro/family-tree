/**
 * Find the shortest chain of relatives connecting two people via parent / child / spouse
 * edges. Returns an ordered list of person ids from `fromId` to `toId`, or [] if no path.
 *
 * Used to visually highlight the kinship route on the tree when the relationship-finder
 * has both slots filled.
 */

import type { FamilyData } from '../types'

export function findFamilyPath(fromId: string, toId: string, data: FamilyData): string[] {
  if (fromId === toId) return [fromId]
  const byId = new Map(data.map((p) => [p.id, p]))
  if (!byId.has(fromId) || !byId.has(toId)) return []

  // BFS — record each visited node's predecessor so we can reconstruct the path.
  const cameFrom = new Map<string, string | null>()
  cameFrom.set(fromId, null)
  const queue: string[] = [fromId]

  while (queue.length) {
    const cur = queue.shift()!
    if (cur === toId) break
    const p = byId.get(cur)
    if (!p) continue
    const neighbors: string[] = []
    if (p.rels.father) neighbors.push(p.rels.father)
    if (p.rels.mother) neighbors.push(p.rels.mother)
    if (p.rels.spouses) neighbors.push(...p.rels.spouses)
    if (p.rels.children) neighbors.push(...p.rels.children)
    // Direct sibling edges: people sharing at least one parent. Without these,
    // BFS would route Kyle → Kara via a parent, which produces an awkward
    // "highlight one parent only" visual. Sibling-as-1-step is also semantically
    // closer to how people think about the relationship.
    for (const parentId of [p.rels.father, p.rels.mother]) {
      if (!parentId) continue
      const parent = byId.get(parentId)
      if (!parent?.rels.children) continue
      for (const sibId of parent.rels.children) {
        if (sibId !== cur) neighbors.push(sibId)
      }
    }
    for (const n of neighbors) {
      if (cameFrom.has(n)) continue
      cameFrom.set(n, cur)
      queue.push(n)
    }
  }

  if (!cameFrom.has(toId)) return []

  const path: string[] = []
  let cur: string | null = toId
  while (cur != null) {
    path.unshift(cur)
    cur = cameFrom.get(cur) ?? null
  }
  return path
}
