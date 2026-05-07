import { useEffect, useRef } from 'react'
import f3 from 'family-chart'
import type { FamilyData, Person } from '../types'
import { buildTreeData, resolvePhotoUrl, SYNTHETIC_ROOT_ID } from '../lib/familyData'

export interface LayoutNode {
  id: string
  x: number
  y: number
  branch?: string
  added?: boolean
}

interface Props {
  data: FamilyData
  onSelect: (person: Person) => void
  focusId?: string
  onLayout?: (nodes: LayoutNode[]) => void
}

export function FamilyTree({ data, onSelect, focusId = 'kyle-lui', onLayout }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onLayoutRef = useRef(onLayout)
  onLayoutRef.current = onLayout
  const chartRef = useRef<any>(null)
  const didCenterRef = useRef(false)

  // Create the chart once. Subsequent data updates are handled in a separate
  // effect so pan/zoom state survives edits.
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    el.classList.add('f3')
    el.innerHTML = ''

    const treeData = buildTreeData(data)
    // family-chart renders <img src={d.data.avatar}> using the value as-is.
    // On GH Pages the SPA is served from /family-tree/, so a stored path like
    // /photos/x.png 404s without the base prefix. Rewrite each avatar to the
    // resolved URL so cards match what the side panel renders via resolvePhotoUrl.
    for (const person of treeData) {
      const av = person.data.avatar
      if (typeof av === 'string' && av.length > 0) {
        person.data.avatar = resolvePhotoUrl(av) ?? av
      }
    }

    const chart = f3
      .createChart(el, treeData)
      .setTransitionTime(400)
      .setCardXSpacing(260)
      .setCardYSpacing(160)
      .setSingleParentEmptyCard(false)
      .setOrientationVertical()
      .setAncestryDepth(100)
      .setProgenyDepth(100)
      .setAfterUpdate(() => {
        hideSyntheticRoot(el)
        const latest = chart.store?.getData?.() as FamilyData | undefined
        if (latest) tagLinks(el, latest)
        consolidateProgenyLinks(el)
        drawBridgeLinks(chart, el)
        if (!didCenterRef.current) {
          centerOnPerson(chart, el, focusId, 0)
          didCenterRef.current = true
        }
        // Notify subscribers (minimap) of latest node positions.
        if (onLayoutRef.current) {
          const tree = chart.store?.getTree?.()
          if (tree?.data) {
            onLayoutRef.current(
              (tree.data as Array<any>).map((n) => ({
                id: n.data?.id,
                x: n.x,
                y: n.y,
                branch: n.data?.data?.branch,
                added: !!n.added,
              })),
            )
          }
        }
      })

    const card = chart
      .setCard(f3.CardHtml)
      .setStyle('imageRect')
      .setCardDisplay([
        (d: { data: Person['data'] }) => fullNameFromRaw(d.data),
        (d: { data: Person['data'] }) => dateLine(d.data),
      ])
      .setCardDim({ width: 220, height: 80, img_width: 60, img_height: 60, img_x: 5, img_y: 10 })
      .setMiniTree(false)
      .setOnCardUpdate(function (this: Element, d: { data: Person }) {
        const cardEl = this.querySelector('.card') as HTMLElement | null
        if (!cardEl) return
        if (d?.data?.id === SYNTHETIC_ROOT_ID) {
          cardEl.classList.add('card-synthetic')
          return
        }
        const branches = ['branch-immediate', 'branch-lui', 'branch-shum', 'branch-placeholder']
        cardEl.classList.remove(...branches, 'is-pet', 'is-deceased')
        const dataObj = d?.data?.data as Record<string, unknown> | undefined
        const branch = dataObj?.branch as string | undefined
        const isPet = Boolean(dataObj?.is_pet)
        const isDeceased =
          Boolean(dataObj?.deceased) ||
          (typeof dataObj?.deathday === 'string' && (dataObj.deathday as string).length > 0)
        // Branch class always applies (gives the family-side border).
        if (branch) cardEl.classList.add(`branch-${branch}`)
        // Pet adds a solid-fill interior on top of the branch border.
        if (isPet) cardEl.classList.add('is-pet')
        if (isDeceased) cardEl.classList.add('is-deceased')
      })

    card.setOnCardClick((_e: MouseEvent, d: { data: Person }) => {
      if (d?.data?.id === SYNTHETIC_ROOT_ID) return
      onSelectRef.current(d.data)
    })

    chart.updateTree({ initial: true })
    chartRef.current = chart

    return () => {
      el.innerHTML = ''
      chartRef.current = null
      didCenterRef.current = false
    }
    // Mount once — data updates flow through the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-center on focus changes (e.g., user clicks a person in the side panel).
  // Skip the very first run — initial centering is handled in setAfterUpdate.
  const skipInitialFocusRef = useRef(true)
  useEffect(() => {
    if (skipInitialFocusRef.current) {
      skipInitialFocusRef.current = false
      return
    }
    const chart = chartRef.current
    const el = containerRef.current
    if (!chart || !el || !focusId) return
    centerOnPerson(chart, el, focusId, 600)
  }, [focusId])

  return <div ref={containerRef} className="tree-canvas" style={{ width: '100%', height: '100%' }} />
}

function fullNameFromRaw(data: Person['data']): string {
  return [data.first_name, data.last_name].filter(Boolean).join(' ').trim()
}

function hideSyntheticRoot(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>(`.card[data-id="${SYNTHETIC_ROOT_ID}"]`).forEach((el) => {
    el.style.visibility = 'hidden'
    el.style.pointerEvents = 'none'
  })
  root.querySelectorAll<SVGPathElement>('path.link').forEach((path) => {
    const datum = (path as unknown as { __data__?: { id?: string } }).__data__
    if (datum?.id?.includes(SYNTHETIC_ROOT_ID)) {
      path.style.display = 'none'
    }
  })
}

type LinkDatum = {
  id?: string
  spouse?: boolean
}

function tagLinks(root: HTMLElement, data: FamilyData) {
  const divorcedIds = new Set(data.filter((p) => p.data.divorced).map((p) => p.id))

  root.querySelectorAll<SVGPathElement>('path.link').forEach((path) => {
    const datum = (path as unknown as { __data__?: LinkDatum }).__data__
    if (!datum) return
    if (datum.spouse) {
      path.classList.add('spouse-link')
      const ids = (datum.id ?? '').split(',').map((s) => s.trim())
      if (ids.length === 2 && ids.every((id) => divorcedIds.has(id))) {
        path.classList.add('divorced')
      } else {
        path.classList.remove('divorced')
      }
    } else {
      path.classList.add('parent-link')
    }
  })
}

type ProgenyNode = { x: number; y: number; data: { id: string }; sx?: number }
type ProgenyLinkDatum = {
  spouse?: boolean
  is_ancestry?: boolean
  source?: ProgenyNode | ProgenyNode[]
  target?: ProgenyNode
}

/**
 * family-chart draws a separate path from each child up to the parent pair, so
 * with N kids you get N overlapping paths converging at the parent — visible
 * as multiple stacked lines at the corners. We hide those and draw a single
 * clean fan-out per parent group: one drop from the parents, one crossbar,
 * one drop per child.
 */
function consolidateProgenyLinks(el: HTMLElement) {
  const linksView = el.querySelector('svg.main_svg .links_view') as SVGGElement | null
  if (!linksView) return

  let consolidatedG = linksView.querySelector('g.consolidated-progeny') as SVGGElement | null
  if (!consolidatedG) {
    consolidatedG = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    consolidatedG.setAttribute('class', 'consolidated-progeny')
    linksView.appendChild(consolidatedG)
  }
  consolidatedG.innerHTML = ''

  const groups = new Map<
    string,
    { paths: SVGPathElement[]; sources: ProgenyNode[]; targets: ProgenyNode[] }
  >()

  el.querySelectorAll<SVGPathElement>('path.link').forEach((path) => {
    const datum = (path as unknown as { __data__?: ProgenyLinkDatum }).__data__
    if (!datum || datum.spouse || datum.is_ancestry) return
    if (!Array.isArray(datum.source) || !datum.target) return
    const sources = datum.source as ProgenyNode[]
    if (sources.some((s) => s?.data?.id === SYNTHETIC_ROOT_ID)) return

    const key = sources.map((s) => s?.data?.id).filter(Boolean).sort().join('|')
    if (!key) return
    if (!groups.has(key)) groups.set(key, { paths: [], sources, targets: [] })
    const g = groups.get(key)!
    g.paths.push(path)
    g.targets.push(datum.target)
  })

  for (const group of groups.values()) {
    if (group.targets.length <= 1) continue // family-chart's link is already clean for one child

    group.paths.forEach((p) => {
      p.style.display = 'none'
    })

    const parentX =
      group.sources.length === 2
        ? (group.sources[0].x + group.sources[1].x) / 2
        : group.sources[0].x
    const parentY = group.sources[0].y
    const childY = group.targets[0].y
    const hy = (parentY + childY) / 2

    const minX = Math.min(parentX, ...group.targets.map((t) => t.x))
    const maxX = Math.max(parentX, ...group.targets.map((t) => t.x))

    const segments: string[] = [
      `M ${parentX} ${parentY} V ${hy}`, // parent drop to crossbar
      `M ${minX} ${hy} H ${maxX}`,        // crossbar
    ]
    for (const t of group.targets) {
      segments.push(`M ${t.x} ${hy} V ${t.y}`) // each child drop
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', segments.join(' '))
    path.setAttribute('class', 'link consolidated')
    consolidatedG.appendChild(path)
  }
}

/**
 * Janet is shown as Alex's spouse-card (to avoid a duplicate Janet), which
 * means family-chart draws no line from her to her biological parents
 * Gong Gong + Po Po. We extend the consolidated crossbar leftward to her
 * card so she visually plugs into the same fan-out as her siblings.
 */
function drawBridgeLinks(chart: any, el: HTMLElement) {
  const tree = chart.store?.getTree?.()
  if (!tree?.data) return

  const viewG = el.querySelector('svg.main_svg .view') as SVGGElement | null
  const linksView = el.querySelector('svg.main_svg .links_view') as SVGGElement | null
  if (!viewG || !linksView) return

  let customG = viewG.querySelector('g.bridge-links') as SVGGElement | null
  if (!customG) {
    customG = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    customG.setAttribute('class', 'bridge-links')
    viewG.insertBefore(customG, linksView)
  }
  customG.innerHTML = ''

  type Node = {
    data: { id: string; rels?: { father?: string; mother?: string } }
    x: number
    y: number
    added?: boolean
  }
  const nodes = tree.data as Node[]

  const bridges: Array<{ childId: string; fatherId?: string; motherId?: string }> = [
    { childId: 'janet-shum', fatherId: 'gf-shum', motherId: 'gm-shum' },
  ]

  for (const { childId, fatherId, motherId } of bridges) {
    const child =
      nodes.find((n) => n.data.id === childId && n.added) ??
      nodes.find((n) => n.data.id === childId)
    const father = fatherId ? nodes.find((n) => n.data.id === fatherId) : undefined
    const mother = motherId ? nodes.find((n) => n.data.id === motherId) : undefined
    if (!child || (!father && !mother)) continue

    const p1 = father ?? mother!
    const p2 = mother ?? father!
    const py = (p1.y + p2.y) / 2
    const hy = (child.y + py) / 2

    // Existing biological siblings (children of these parents already in the tree).
    const siblings = nodes.filter(
      (n) =>
        !n.added &&
        n.data.id !== childId &&
        ((fatherId && n.data.rels?.father === fatherId) ||
          (motherId && n.data.rels?.mother === motherId)),
    )

    // End the bridge at the nearest endpoint of the existing crossbar so it
    // extends seamlessly. If no siblings, fall back to the parent midpoint.
    let endX: number
    if (siblings.length > 0) {
      const xs = siblings.map((s) => s.x)
      const minSibling = Math.min(...xs)
      const maxSibling = Math.max(...xs)
      if (child.x < minSibling) endX = minSibling
      else if (child.x > maxSibling) endX = maxSibling
      else endX = (p1.x + p2.x) / 2
    } else {
      endX = (p1.x + p2.x) / 2
    }

    const segments: string[] = [
      `M ${child.x} ${child.y} V ${hy}`,
      `M ${child.x} ${hy} H ${endX}`,
    ]
    // If we couldn't extend an existing crossbar, drop into the parents directly.
    if (siblings.length === 0) {
      segments.push(`M ${endX} ${hy} V ${py}`)
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', segments.join(' '))
    path.setAttribute('class', 'bridge-link')
    path.setAttribute('data-bridge', childId)
    customG.appendChild(path)
  }
}

function centerOnPerson(chart: any, el: HTMLElement, id: string, transitionTime = 0) {
  const tree = chart.store?.getTree?.()
  if (!tree?.data) return
  const datum = tree.data.find((d: { data?: { id?: string } }) => d?.data?.id === id)
  if (!datum) return
  const svg = el.querySelector('svg.main_svg') as SVGSVGElement | null
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  f3.handlers.cardToMiddle?.({
    datum,
    svg,
    svg_dim: { width: rect.width, height: rect.height },
    scale: 0.85,
    transition_time: transitionTime,
  })
}

function dateLine(data: Person['data']): string {
  // Card shading conveys deceased status — no dagger here. The full date range
  // (when available) still displays for both living and deceased.
  const b = data.birthday || ''
  const d = data.deathday || ''
  if (b && d) return `${b} – ${d}`
  if (b) return b
  if (d) return d
  return ''
}
