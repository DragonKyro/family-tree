/**
 * Compute what one person should call another, in English and Cantonese.
 *
 * Walks each person's ancestor chain via rels.father/rels.mother, finds the
 * lowest common ancestor (LCA), and maps the (steps_up_from_A, steps_down_to_B)
 * pair to a kinship label. Falls back to "via spouse" detours for in-laws.
 *
 * Cantonese kinship is famously precise (paternal vs maternal, elder vs
 * younger, etc.); we cover the common cases — anything past second cousin
 * collapses to a generic "distant relative" label.
 */

import type { FamilyData, Person } from '../types'

export interface Kinship {
  english: string
  cantonese: string
  jyutping: string
}

interface ByIdMap {
  get(id: string): Person | undefined
}

interface AncestorInfo {
  distance: number
  firstStep: 'father' | 'mother' | null
}

interface LCAInfo {
  lcaId: string
  fromUp: number
  toUp: number
  fromVia: 'father' | 'mother' | null
}

const SELF: Kinship = { english: 'themselves', cantonese: '自己', jyutping: 'zi6 gei2' }

export function getKinship(fromId: string, toId: string, data: FamilyData): Kinship | null {
  const byId = new Map(data.map((p) => [p.id, p]))
  const from = byId.get(fromId)
  const to = byId.get(toId)
  if (!from || !to) return null

  // Pets have no Cantonese kinship terms of their own. Resolve to the owner's kinship,
  // then suffix with "pet" / 嘅寵物 — e.g. "cousin's pet" / "表兄弟嘅寵物".
  if (to.data.is_pet) {
    const owners = [to.rels.father, to.rels.mother].filter(Boolean) as string[]
    if (owners.includes(fromId)) {
      return { english: 'pet', cantonese: '寵物', jyutping: 'cung2 mat6' }
    }
    for (const ownerId of owners) {
      const k = getKinship(fromId, ownerId, data)
      if (k) {
        return {
          english: `${k.english}'s pet`,
          cantonese: `${k.cantonese}嘅寵物`,
          jyutping: `${k.jyutping} ge3 cung2 mat6`,
        }
      }
    }
    return { english: 'pet', cantonese: '寵物', jyutping: 'cung2 mat6' }
  }

  const direct = directKinship(from, to, byId)
  if (direct) return direct

  // Try going through `from`'s spouse: A's spouse → B = "spouse's <rel>"
  for (const sid of from.rels.spouses ?? []) {
    const sp = byId.get(sid)
    if (!sp) continue
    const k = directKinship(sp, to, byId)
    if (k) return prefixViaSpouse(k, sp, from)
  }

  // Try going through `to`'s spouse: A → B's spouse = "<rel>'s spouse" (or specific in-law label)
  for (const sid of to.rels.spouses ?? []) {
    const sp = byId.get(sid)
    if (!sp) continue
    const k = directKinship(from, sp, byId)
    if (k) return suffixViaSpouse(k, to, sp)
  }

  return null
}

// ---- Core: direct (blood) kinship via LCA ----

function directKinship(from: Person, to: Person, byId: ByIdMap): Kinship | null {
  if (from.id === to.id) return SELF

  if (from.rels.spouses?.includes(to.id)) {
    return to.data.gender === 'F'
      ? { english: 'wife', cantonese: '老婆', jyutping: 'lou5 po4' }
      : { english: 'husband', cantonese: '老公', jyutping: 'lou5 gung1' }
  }

  const fromAnc = ancestors(from.id, byId)
  const toAnc = ancestors(to.id, byId)

  let best: (LCAInfo & { total: number }) | null = null
  for (const [id, info] of fromAnc) {
    const t = toAnc.get(id)
    if (!t) continue
    const total = info.distance + t.distance
    if (!best || total < best.total) {
      best = {
        lcaId: id,
        fromUp: info.distance,
        toUp: t.distance,
        fromVia: info.firstStep,
        total,
      }
    }
  }
  if (!best) return null
  return labelFromLCA(from, to, best, byId)
}

function ancestors(id: string, byId: ByIdMap): Map<string, AncestorInfo> {
  const map = new Map<string, AncestorInfo>()
  const queue: Array<{ id: string; distance: number; firstStep: 'father' | 'mother' | null }> = [
    { id, distance: 0, firstStep: null },
  ]
  while (queue.length) {
    const node = queue.shift()!
    const existing = map.get(node.id)
    if (existing && existing.distance <= node.distance) continue
    map.set(node.id, { distance: node.distance, firstStep: node.firstStep })
    const p = byId.get(node.id)
    if (!p) continue
    if (p.rels.father)
      queue.push({ id: p.rels.father, distance: node.distance + 1, firstStep: node.firstStep ?? 'father' })
    if (p.rels.mother)
      queue.push({ id: p.rels.mother, distance: node.distance + 1, firstStep: node.firstStep ?? 'mother' })
  }
  return map
}

function labelFromLCA(from: Person, to: Person, info: LCAInfo, byId: ByIdMap): Kinship {
  const { fromUp, toUp, fromVia } = info
  const isPaternal = fromVia === 'father'
  const isMaternal = fromVia === 'mother'
  const g = to.data.gender

  // B is A's ancestor
  if (toUp === 0) return ancestorLabel(fromUp, isPaternal, isMaternal, g)

  // B is A's descendant
  if (fromUp === 0) {
    const bridge = findBridgingChild(from.id, to.id, byId)
    return descendantLabel(toUp, g, bridge?.data.gender ?? 'M')
  }

  // Sibling
  if (fromUp === 1 && toUp === 1) {
    return siblingLabel(from, to, byId, info.lcaId, g)
  }

  // Aunt/uncle
  if (fromUp === 2 && toUp === 1) {
    return auntUncleLabel(from, to, isPaternal, isMaternal, g, byId, info.lcaId)
  }

  // Niece/nephew
  if (fromUp === 1 && toUp === 2) {
    return nieceNephewLabel(from, to, g, byId, info.lcaId)
  }

  // First cousin
  if (fromUp === 2 && toUp === 2) {
    return cousinLabel(from, to, byId, info.lcaId, isPaternal, isMaternal, g)
  }

  // Great-aunt/uncle — paternal vs maternal split.
  if (fromUp === 3 && toUp === 1) {
    if (isPaternal) {
      return g === 'F'
        ? { english: 'paternal great-aunt', cantonese: '姑婆', jyutping: 'gu1 po4' }
        : { english: 'paternal great-uncle', cantonese: '伯公 / 叔公', jyutping: 'baak3 gung1 / suk1 gung1' }
    }
    if (isMaternal) {
      return g === 'F'
        ? { english: 'maternal great-aunt', cantonese: '姨婆', jyutping: 'ji4 po4' }
        : { english: 'maternal great-uncle', cantonese: '舅公', jyutping: 'kau5 gung1' }
    }
    return g === 'F'
      ? { english: 'great-aunt', cantonese: '姑婆 / 姨婆', jyutping: 'gu1 po4 / ji4 po4' }
      : { english: 'great-uncle', cantonese: '伯公 / 叔公 / 舅公', jyutping: 'baak3 gung1 / suk1 gung1 / kau5 gung1' }
  }

  // Great-niece/nephew
  if (fromUp === 1 && toUp === 3) {
    return g === 'F'
      ? { english: 'grand-niece', cantonese: '姪孫女 / 外甥孫女', jyutping: 'zat6 syun1 neoi5 / ngoi6 saang1 syun1 neoi5' }
      : { english: 'grand-nephew', cantonese: '姪孫 / 外甥孫', jyutping: 'zat6 syun1 / ngoi6 saang1 syun1' }
  }

  // First cousin once removed — split by direction. Up means parent's cousin (older
  // generation); down means cousin's child (younger generation). Different terms entirely.
  if (fromUp === 3 && toUp === 2) {
    return parentCousinLabel(g, isPaternal, isMaternal)
  }
  if (fromUp === 2 && toUp === 3) {
    return cousinChildLabel(g)
  }

  // Second cousin
  if (fromUp === 3 && toUp === 3) {
    return { english: 'second cousin', cantonese: '遠房表親', jyutping: 'jyun5 fong4 biu2 can1' }
  }

  return { english: 'distant relative', cantonese: '親戚', jyutping: 'can1 cik1' }
}

// ---- Specific category labels ----

function ancestorLabel(up: number, paternal: boolean, maternal: boolean, g: 'M' | 'F'): Kinship {
  if (up === 1) {
    return g === 'M'
      ? { english: 'father', cantonese: '爸爸', jyutping: 'baa4 baa1' }
      : { english: 'mother', cantonese: '媽媽', jyutping: 'maa4 maa1' }
  }
  if (up === 2) {
    if (paternal) {
      return g === 'M'
        ? { english: 'paternal grandfather', cantonese: '爺爺', jyutping: 'je4 je4' }
        : { english: 'paternal grandmother', cantonese: '嫲嫲', jyutping: 'maa4 maa4' }
    }
    if (maternal) {
      return g === 'M'
        ? { english: 'maternal grandfather', cantonese: '公公', jyutping: 'gung1 gung1' }
        : { english: 'maternal grandmother', cantonese: '婆婆', jyutping: 'po4 po4' }
    }
    return g === 'M'
      ? { english: 'grandfather', cantonese: '祖父', jyutping: 'zou2 fu6' }
      : { english: 'grandmother', cantonese: '祖母', jyutping: 'zou2 mou5' }
  }
  if (up === 3) {
    if (paternal) {
      return g === 'M'
        ? { english: 'paternal great-grandfather', cantonese: '太爺', jyutping: 'taai3 je4' }
        : { english: 'paternal great-grandmother', cantonese: '太嫲', jyutping: 'taai3 maa4' }
    }
    if (maternal) {
      return g === 'M'
        ? { english: 'maternal great-grandfather', cantonese: '太公', jyutping: 'taai3 gung1' }
        : { english: 'maternal great-grandmother', cantonese: '太婆', jyutping: 'taai3 po4' }
    }
  }
  const greats = up - 2
  return g === 'M'
    ? { english: `${greats}× great-grandfather`, cantonese: '高祖父', jyutping: 'gou1 zou2 fu6' }
    : { english: `${greats}× great-grandmother`, cantonese: '高祖母', jyutping: 'gou1 zou2 mou5' }
}

function descendantLabel(down: number, g: 'M' | 'F', viaChildGender: 'M' | 'F'): Kinship {
  if (down === 1) {
    return g === 'M'
      ? { english: 'son', cantonese: '仔', jyutping: 'zai2' }
      : { english: 'daughter', cantonese: '女', jyutping: 'neoi5' }
  }
  if (down === 2) {
    if (viaChildGender === 'M') {
      return g === 'M'
        ? { english: 'grandson (via son)', cantonese: '孫', jyutping: 'syun1' }
        : { english: 'granddaughter (via son)', cantonese: '孫女', jyutping: 'syun1 neoi5' }
    }
    return g === 'M'
      ? { english: 'grandson (via daughter)', cantonese: '外孫', jyutping: 'ngoi6 syun1' }
      : { english: 'granddaughter (via daughter)', cantonese: '外孫女', jyutping: 'ngoi6 syun1 neoi5' }
  }
  if (down === 3) {
    return g === 'M'
      ? { english: 'great-grandson', cantonese: '曾孫', jyutping: 'zang1 syun1' }
      : { english: 'great-granddaughter', cantonese: '曾孫女', jyutping: 'zang1 syun1 neoi5' }
  }
  return g === 'M'
    ? { english: `${down - 2}× great-grandson`, cantonese: '玄孫', jyutping: 'jyun4 syun1' }
    : { english: `${down - 2}× great-granddaughter`, cantonese: '玄孫女', jyutping: 'jyun4 syun1 neoi5' }
}

function siblingLabel(from: Person, to: Person, byId: ByIdMap, lcaId: string, g: 'M' | 'F'): Kinship {
  const elder = isOlder(to, from, lcaId, byId)
  if (g === 'M') {
    if (elder === true) {
      // Numeric ranking: 大哥 / 二哥 / 三哥 ... when we can determine to's position among
      // from's older brothers. Falls back to generic 哥哥 when ambiguous.
      const rank = olderSameGenderRank(from, to, 'M', byId, lcaId)
      if (rank) {
        return {
          english: rank === 1 ? 'eldest brother' : `${ordinal(rank)} oldest brother`,
          cantonese: `${NUMERIC_HANZI[rank - 1] ?? `第${rank}`}哥`,
          jyutping: `${NUMERIC_JYUTPING[rank - 1] ?? `dai6 ${rank}`} go1`,
        }
      }
      return { english: 'older brother', cantonese: '哥哥', jyutping: 'go4 go1' }
    }
    if (elder === false) return { english: 'younger brother', cantonese: '弟弟', jyutping: 'dai4 dai2' }
    return { english: 'brother', cantonese: '兄弟', jyutping: 'hing1 dai6' }
  }
  if (elder === true) {
    const rank = olderSameGenderRank(from, to, 'F', byId, lcaId)
    if (rank) {
      return {
        english: rank === 1 ? 'eldest sister' : `${ordinal(rank)} oldest sister`,
        cantonese: `${NUMERIC_HANZI[rank - 1] ?? `第${rank}`}姐`,
        jyutping: `${NUMERIC_JYUTPING[rank - 1] ?? `dai6 ${rank}`} ze2`,
      }
    }
    return { english: 'older sister', cantonese: '姐姐', jyutping: 'ze4 ze1' }
  }
  if (elder === false) return { english: 'younger sister', cantonese: '妹妹', jyutping: 'mui4 mui2' }
  return { english: 'sister', cantonese: '姊妹', jyutping: 'zi2 mui6' }
}

const NUMERIC_HANZI = ['大', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const NUMERIC_JYUTPING = ['daai6', 'ji6', 'saam1', 'sei3', 'ng5', 'luk6', 'cat1', 'baat3', 'gau2', 'sap6']

/**
 * Among `from`'s older siblings of the given gender, what's `to`'s position (1-indexed)?
 * Returns null when we can't order the older siblings reliably.
 */
function olderSameGenderRank(
  from: Person,
  to: Person,
  gender: 'M' | 'F',
  byId: ByIdMap,
  lcaId: string,
): number | null {
  const parent = byId.get(lcaId)
  const childIds = parent?.rels.children
  if (!childIds || childIds.length === 0) return null

  const olderSameGender: Person[] = []
  for (const id of childIds) {
    if (id === from.id) continue
    const sib = byId.get(id)
    if (!sib || sib.data.gender !== gender) continue
    if (isOlder(sib, from, lcaId, byId) !== true) continue
    olderSameGender.push(sib)
  }
  if (olderSameGender.length === 0) return null

  olderSameGender.sort((a, b) => {
    const ay = parseYear(a.data.birthday)
    const by = parseYear(b.data.birthday)
    if (ay && by && ay !== by) return ay - by  // earlier year = older
    return childIds.indexOf(a.id) - childIds.indexOf(b.id)
  })

  const idx = olderSameGender.findIndex((s) => s.id === to.id)
  return idx >= 0 ? idx + 1 : null
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

function auntUncleLabel(
  from: Person,
  to: Person,
  paternal: boolean,
  maternal: boolean,
  g: 'M' | 'F',
  byId: ByIdMap,
  lcaId: string,
): Kinship {
  const fromParentId = paternal ? from.rels.father : maternal ? from.rels.mother : null
  const fromParent = fromParentId ? byId.get(fromParentId) : null
  const toIsElder = fromParent ? isOlder(to, fromParent, lcaId, byId) : null

  if (paternal) {
    if (g === 'M') {
      if (toIsElder === true)
        return { english: "paternal uncle (father's older brother)", cantonese: '伯父', jyutping: 'baak3 fu6' }
      if (toIsElder === false)
        return { english: "paternal uncle (father's younger brother)", cantonese: '叔叔', jyutping: 'suk1 suk1' }
      return { english: "father's brother", cantonese: '伯父 / 叔叔', jyutping: 'baak3 fu6 / suk1 suk1' }
    }
    if (toIsElder === true)
      return { english: "paternal aunt (father's older sister)", cantonese: '姑媽', jyutping: 'gu1 maa1' }
    if (toIsElder === false)
      return { english: "paternal aunt (father's younger sister)", cantonese: '姑姐', jyutping: 'gu1 ze1' }
    return { english: "father's sister", cantonese: '姑媽 / 姑姐', jyutping: 'gu1 maa1 / gu1 ze1' }
  }
  if (maternal) {
    if (g === 'M') {
      return { english: "maternal uncle (mother's brother)", cantonese: '舅父', jyutping: 'kau5 fu6' }
    }
    if (toIsElder === true)
      return { english: "maternal aunt (mother's older sister)", cantonese: '姨媽', jyutping: 'ji4 maa1' }
    if (toIsElder === false)
      return { english: "maternal aunt (mother's younger sister)", cantonese: '阿姨', jyutping: 'aa3 ji1' }
    return { english: "mother's sister", cantonese: '姨媽 / 阿姨', jyutping: 'ji4 maa1 / aa3 ji1' }
  }
  return g === 'M'
    ? { english: 'uncle', cantonese: '叔伯舅', jyutping: 'suk1 baak3 kau5' }
    : { english: 'aunt', cantonese: '姑姨', jyutping: 'gu1 ji1' }
}

function nieceNephewLabel(from: Person, to: Person, g: 'M' | 'F', byId: ByIdMap, lcaId: string): Kinship {
  // Find which of `to`'s parents is `from`'s sibling — that parent's gender decides 姪 vs 外甥.
  let throughGender: 'M' | 'F' | null = null
  for (const pid of [to.rels.father, to.rels.mother]) {
    if (!pid) continue
    const parent = byId.get(pid)
    if (!parent) continue
    if (parent.rels.father === lcaId || parent.rels.mother === lcaId) {
      // parent is LCA's child; verify from is also LCA's child
      if (from.rels.father === lcaId || from.rels.mother === lcaId) {
        throughGender = parent.data.gender
        break
      }
    }
  }
  if (throughGender === 'M') {
    return g === 'M'
      ? { english: "nephew (brother's son)", cantonese: '姪', jyutping: 'zat6' }
      : { english: "niece (brother's daughter)", cantonese: '姪女', jyutping: 'zat6 neoi5' }
  }
  if (throughGender === 'F') {
    return g === 'M'
      ? { english: "nephew (sister's son)", cantonese: '外甥', jyutping: 'ngoi6 saang1' }
      : { english: "niece (sister's daughter)", cantonese: '外甥女', jyutping: 'ngoi6 saang1 neoi5' }
  }
  return g === 'M'
    ? { english: 'nephew', cantonese: '姪 / 外甥', jyutping: 'zat6 / ngoi6 saang1' }
    : { english: 'niece', cantonese: '姪女 / 外甥女', jyutping: 'zat6 neoi5 / ngoi6 saang1 neoi5' }
}

function cousinLabel(
  from: Person,
  to: Person,
  byId: ByIdMap,
  lcaId: string,
  paternal: boolean,
  maternal: boolean,
  g: 'M' | 'F',
): Kinship {
  // 堂 (tong4) — same surname line: cousin via father's brother (both are sons of paternal grandparent, paternal-paternal).
  // 表 (biu2) — different surname line: any other cousin (via father's sister, mother's anything).
  // To check 堂: A's path-to-LCA via father AND B's path-to-LCA via father AND LCA is paternal grandparent.

  let toViaParent: Person | null = null
  for (const pid of [to.rels.father, to.rels.mother]) {
    if (!pid) continue
    const p = byId.get(pid)
    if (!p) continue
    if (p.rels.father === lcaId || p.rels.mother === lcaId) {
      toViaParent = p
      break
    }
  }
  const isTong = paternal && toViaParent?.data.gender === 'M'

  const elder = toViaParent && fromHasParent(from, byId)
    ? isOlder(to, from, getCommonParent(from, byId), byId)
    : null

  if (isTong) {
    if (g === 'M') {
      if (elder === true) return { english: 'older paternal cousin (堂)', cantonese: '堂哥', jyutping: 'tong4 go1' }
      if (elder === false) return { english: 'younger paternal cousin (堂)', cantonese: '堂弟', jyutping: 'tong4 dai6' }
      return { english: 'paternal cousin (堂)', cantonese: '堂兄弟', jyutping: 'tong4 hing1 dai6' }
    }
    if (elder === true) return { english: 'older paternal cousin (堂)', cantonese: '堂姐', jyutping: 'tong4 ze2' }
    if (elder === false) return { english: 'younger paternal cousin (堂)', cantonese: '堂妹', jyutping: 'tong4 mui6' }
    return { english: 'paternal cousin (堂)', cantonese: '堂姊妹', jyutping: 'tong4 zi2 mui6' }
  }
  // 表 cousin
  void maternal
  if (g === 'M') {
    if (elder === true) return { english: 'older cousin (表)', cantonese: '表哥', jyutping: 'biu2 go1' }
    if (elder === false) return { english: 'younger cousin (表)', cantonese: '表弟', jyutping: 'biu2 dai6' }
    return { english: 'cousin (表)', cantonese: '表兄弟', jyutping: 'biu2 hing1 dai6' }
  }
  if (elder === true) return { english: 'older cousin (表)', cantonese: '表姐', jyutping: 'biu2 ze2' }
  if (elder === false) return { english: 'younger cousin (表)', cantonese: '表妹', jyutping: 'biu2 mui6' }
  return { english: 'cousin (表)', cantonese: '表姊妹', jyutping: 'biu2 zi2 mui6' }
}

function fromHasParent(p: Person, _byId: ByIdMap): boolean {
  return Boolean(p.rels.father || p.rels.mother)
}

function getCommonParent(_p: Person, _byId: ByIdMap): string {
  // not used directly; placeholder for future precision
  return ''
}

// ---- Helpers ----

function findBridgingChild(fromId: string, toId: string, byId: ByIdMap): Person | null {
  // Walk up from `to`; first ancestor whose father or mother is `fromId` is the bridging child.
  const queue: string[] = [toId]
  const visited = new Set<string>()
  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const p = byId.get(id)
    if (!p) continue
    if (p.rels.father === fromId || p.rels.mother === fromId) return p
    if (p.rels.father) queue.push(p.rels.father)
    if (p.rels.mother) queue.push(p.rels.mother)
  }
  return null
}

function isOlder(a: Person, b: Person, parentId: string, byId: ByIdMap): boolean | null {
  const ay = parseYear(a.data.birthday)
  const by = parseYear(b.data.birthday)
  if (ay && by && ay !== by) return ay < by
  const parent = byId.get(parentId)
  if (parent?.rels.children) {
    const order = parent.rels.children
    const ai = order.indexOf(a.id)
    const bi = order.indexOf(b.id)
    if (ai !== -1 && bi !== -1) return ai < bi
  }
  return null
}

function parseYear(s: string | undefined): number | null {
  if (!s) return null
  const m = /^(\d{4})/.exec(s)
  return m ? Number(m[1]) : null
}

// ---- In-law detours ----

function prefixViaSpouse(k: Kinship, spouse: Person, _from: Person): Kinship {
  // A's spouse → B (k). What does A call B?
  // Special-case parent-in-law and child-in-law (B is parent or child of A's spouse).
  if (k.english === 'father') {
    return spouse.data.gender === 'F'
      ? { english: 'father-in-law (wife\'s father)', cantonese: '外父', jyutping: 'ngoi6 fu6' }
      : { english: 'father-in-law (husband\'s father)', cantonese: '老爺', jyutping: 'lou5 je4' }
  }
  if (k.english === 'mother') {
    return spouse.data.gender === 'F'
      ? { english: 'mother-in-law (wife\'s mother)', cantonese: '外母', jyutping: 'ngoi6 mou5' }
      : { english: 'mother-in-law (husband\'s mother)', cantonese: '奶奶', jyutping: 'naai4 naai2' }
  }
  // Spouse's siblings — Cantonese splits by spouse's side (husband's vs wife's) and elder/younger.
  if (
    k.english.startsWith('older brother') ||
    k.english.startsWith('younger brother') ||
    k.english === 'brother' ||
    k.english.startsWith('older sister') ||
    k.english.startsWith('younger sister') ||
    k.english === 'sister'
  ) {
    return spouseSiblingLabel(k, spouse)
  }
  // Spouse's child = stepchild — uncommon, label generically
  if (k.english === 'son') return { english: 'stepson', cantonese: '繼仔', jyutping: 'gai3 zai2' }
  if (k.english === 'daughter') return { english: 'stepdaughter', cantonese: '繼女', jyutping: 'gai3 neoi5' }
  return {
    english: `spouse's ${k.english}`,
    cantonese: k.cantonese,
    jyutping: k.jyutping,
  }
}

function suffixViaSpouse(k: Kinship, to: Person, _spouse: Person): Kinship {
  // A → B's spouse (k) describes B's spouse from A's perspective. Answer: what does A call B?
  // The in-law's gender is `to.data.gender`; `_spouse` is the blood-related person.
  const inLawIsMale = to.data.gender === 'M'

  // Spouse of a child: in-law's gender decides 新抱 (daughter-in-law) vs 女婿 (son-in-law).
  if (k.english === 'son' || k.english === 'daughter') {
    return inLawIsMale
      ? { english: 'son-in-law', cantonese: '女婿', jyutping: 'neoi5 sai3' }
      : { english: 'daughter-in-law', cantonese: '新抱', jyutping: 'san1 pou5' }
  }
  // Sibling's spouse — split by elder/younger of the blood sibling.
  if (k.english.startsWith('older brother')) {
    return { english: "older brother's wife", cantonese: '阿嫂', jyutping: 'aa3 sou2' }
  }
  if (k.english.startsWith('younger brother')) {
    return { english: "younger brother's wife", cantonese: '弟婦', jyutping: 'dai6 fu5' }
  }
  if (k.english === 'brother') {
    return { english: "brother's wife", cantonese: '阿嫂 / 弟婦', jyutping: 'aa3 sou2 / dai6 fu5' }
  }
  if (k.english.startsWith('older sister')) {
    return { english: "older sister's husband", cantonese: '姐夫', jyutping: 'ze2 fu1' }
  }
  if (k.english.startsWith('younger sister')) {
    return { english: "younger sister's husband", cantonese: '妹夫', jyutping: 'mui6 fu1' }
  }
  if (k.english === 'sister') {
    return { english: "sister's husband", cantonese: '姐夫 / 妹夫', jyutping: 'ze2 fu1 / mui6 fu1' }
  }
  if (
    k.english.includes('uncle') ||
    k.english.includes('aunt') ||
    k.english === "father's brother" ||
    k.english === "father's sister" ||
    k.english === "mother's brother" ||
    k.english === "mother's sister"
  ) {
    return auntUncleSpouseLabel(k)
  }
  if (k.english.includes('cousin')) {
    return cousinSpouseLabel(k, to)
  }
  return {
    english: `${k.english}'s spouse`,
    cantonese: k.cantonese,
    jyutping: k.jyutping,
  }
}

/**
 * Cousin's spouse: 堂嫂 / 表嫂 (older brother's wife), 堂弟婦 / 表弟婦 (younger brother's wife),
 * 堂姐夫 / 表姐夫 (older sister's husband), 堂妹夫 / 表妹夫 (younger sister's husband).
 * 堂 vs 表 is preserved from the blood-cousin term; suffix is chosen by the in-law's gender.
 */
function cousinSpouseLabel(k: Kinship, to: Person): Kinship {
  const isTong = k.cantonese.startsWith('堂')
  const prefix = isTong ? '堂' : '表'
  const prefixJyut = isTong ? 'tong4' : 'biu2'
  const e = k.english
  const inLawIsMale = to.data.gender === 'M'

  if (e.includes('older')) {
    return inLawIsMale
      ? {
          english: "husband of older cousin (sister's husband)",
          cantonese: `${prefix}姐夫`,
          jyutping: `${prefixJyut} ze2 fu1`,
        }
      : {
          english: "wife of older cousin (brother's wife)",
          cantonese: `${prefix}嫂`,
          jyutping: `${prefixJyut} sou2`,
        }
  }
  if (e.includes('younger')) {
    return inLawIsMale
      ? {
          english: "husband of younger cousin (sister's husband)",
          cantonese: `${prefix}妹夫`,
          jyutping: `${prefixJyut} mui6 fu1`,
        }
      : {
          english: "wife of younger cousin (brother's wife)",
          cantonese: `${prefix}弟婦`,
          jyutping: `${prefixJyut} dai6 fu5`,
        }
  }
  // Age unknown — return both options.
  return inLawIsMale
    ? {
        english: 'husband of cousin',
        cantonese: `${prefix}姐夫 / ${prefix}妹夫`,
        jyutping: `${prefixJyut} ze2 fu1 / ${prefixJyut} mui6 fu1`,
      }
    : {
        english: 'wife of cousin',
        cantonese: `${prefix}嫂 / ${prefix}弟婦`,
        jyutping: `${prefixJyut} sou2 / ${prefixJyut} dai6 fu5`,
      }
}

/**
 * Parent's first cousin (one generation up): 表 prefix because it's a cross-surname line.
 * Side (paternal/maternal) and gender narrow the term:
 *   表伯 / 表叔 — parent's male cousin via paternal side (older / younger than parent)
 *   表姑     — parent's female cousin via paternal side
 *   表舅     — parent's male cousin via maternal side
 *   表姨     — parent's female cousin via maternal side
 */
function parentCousinLabel(g: 'M' | 'F', paternal: boolean, maternal: boolean): Kinship {
  if (paternal) {
    return g === 'M'
      ? {
          english: "parent's male cousin (paternal side)",
          cantonese: '表伯 / 表叔',
          jyutping: 'biu2 baak3 / biu2 suk1',
        }
      : { english: "parent's female cousin (paternal side)", cantonese: '表姑', jyutping: 'biu2 gu1' }
  }
  if (maternal) {
    return g === 'M'
      ? { english: "parent's male cousin (maternal side)", cantonese: '表舅', jyutping: 'biu2 kau5' }
      : { english: "parent's female cousin (maternal side)", cantonese: '表姨', jyutping: 'biu2 ji4' }
  }
  return g === 'M'
    ? {
        english: "parent's male cousin",
        cantonese: '表叔 / 表伯 / 表舅',
        jyutping: 'biu2 suk1 / biu2 baak3 / biu2 kau5',
      }
    : { english: "parent's female cousin", cantonese: '表姑 / 表姨', jyutping: 'biu2 gu1 / biu2 ji4' }
}

/**
 * Cousin's child (one generation down): 表姪 / 表姪女 (via cousin treated as brother)
 * or 表外甥 / 表外甥女 (via cousin treated as sister) — without bridging info we offer both.
 */
function cousinChildLabel(g: 'M' | 'F'): Kinship {
  return g === 'M'
    ? {
        english: "cousin's son",
        cantonese: '表姪 / 表外甥',
        jyutping: 'biu2 zat6 / biu2 ngoi6 saang1',
      }
    : {
        english: "cousin's daughter",
        cantonese: '表姪女 / 表外甥女',
        jyutping: 'biu2 zat6 neoi5 / biu2 ngoi6 saang1 neoi5',
      }
}

/**
 * Spouse's sibling (your sibling-in-law via marriage). Cantonese has two distinct families
 * of terms based on whether the speaker is the husband or the wife in the marriage:
 *   Husband (wife's siblings):   大舅 / 舅仔 (brothers), 大姨 / 姨仔 (sisters)
 *   Wife (husband's siblings):   大伯 / 叔仔 (brothers), 姑奶 / 姑仔 (sisters)
 * Each splits by older vs younger relative to the speaker's spouse (i.e., the blood sibling).
 */
function spouseSiblingLabel(k: Kinship, spouse: Person): Kinship {
  // spouse is the blood-related person; if spouse is female the speaker is the husband, etc.
  const speakerIsHusband = spouse.data.gender === 'F'
  const e = k.english

  if (e.startsWith('older brother')) {
    return speakerIsHusband
      ? { english: "wife's older brother", cantonese: '大舅', jyutping: 'daai6 kau5' }
      : { english: "husband's older brother", cantonese: '大伯', jyutping: 'daai6 baak3' }
  }
  if (e.startsWith('younger brother')) {
    return speakerIsHusband
      ? { english: "wife's younger brother", cantonese: '舅仔', jyutping: 'kau5 zai2' }
      : { english: "husband's younger brother", cantonese: '叔仔', jyutping: 'suk1 zai2' }
  }
  if (e === 'brother') {
    return speakerIsHusband
      ? { english: "wife's brother", cantonese: '大舅 / 舅仔', jyutping: 'daai6 kau5 / kau5 zai2' }
      : { english: "husband's brother", cantonese: '大伯 / 叔仔', jyutping: 'daai6 baak3 / suk1 zai2' }
  }
  if (e.startsWith('older sister')) {
    return speakerIsHusband
      ? { english: "wife's older sister", cantonese: '大姨', jyutping: 'daai6 ji1' }
      : { english: "husband's older sister", cantonese: '姑奶', jyutping: 'gu1 naai1' }
  }
  if (e.startsWith('younger sister')) {
    return speakerIsHusband
      ? { english: "wife's younger sister", cantonese: '姨仔', jyutping: 'ji1 zai2' }
      : { english: "husband's younger sister", cantonese: '姑仔', jyutping: 'gu1 zai2' }
  }
  return speakerIsHusband
    ? { english: "wife's sister", cantonese: '大姨 / 姨仔', jyutping: 'daai6 ji1 / ji1 zai2' }
    : { english: "husband's sister", cantonese: '姑奶 / 姑仔', jyutping: 'gu1 naai1 / gu1 zai2' }
}

/**
 * Cantonese in-law aunts/uncles have dedicated terms — not just "<aunt> (配偶)".
 *   伯娘 = father's older brother's wife
 *   嬸嬸 = father's younger brother's wife
 *   姑丈 = father's sister's husband
 *   舅母 = mother's brother's wife
 *   姨丈 = mother's sister's husband
 */
function auntUncleSpouseLabel(k: Kinship): Kinship {
  const e = k.english
  // Paternal uncle's wife
  if (e.includes("father's older brother")) {
    return {
      english: "wife of paternal uncle (father's older brother)",
      cantonese: '伯娘',
      jyutping: 'baak3 noeng4',
    }
  }
  if (e.includes("father's younger brother")) {
    return {
      english: "wife of paternal uncle (father's younger brother)",
      cantonese: '嬸嬸',
      jyutping: 'sam2 sam2',
    }
  }
  if (e === "father's brother" || e.startsWith('paternal uncle')) {
    return {
      english: 'wife of paternal uncle',
      cantonese: '伯娘 / 嬸嬸',
      jyutping: 'baak3 noeng4 / sam2 sam2',
    }
  }
  // Paternal aunt's husband
  if (e === "father's sister" || e.startsWith('paternal aunt')) {
    return { english: 'husband of paternal aunt', cantonese: '姑丈', jyutping: 'gu1 zoeng6' }
  }
  // Maternal uncle's wife
  if (e === "mother's brother" || e.startsWith('maternal uncle')) {
    return { english: 'wife of maternal uncle', cantonese: '舅母', jyutping: 'kau5 mou5' }
  }
  // Maternal aunt's husband
  if (e === "mother's sister" || e.startsWith('maternal aunt')) {
    return { english: 'husband of maternal aunt', cantonese: '姨丈', jyutping: 'ji4 zoeng6' }
  }
  // Generic uncle/aunt-by-marriage fallback (paternal/maternal unknown)
  return {
    english: `${e}'s spouse (by marriage)`,
    cantonese: k.cantonese + ' 配偶',
    jyutping: k.jyutping,
  }
}
