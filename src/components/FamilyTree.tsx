import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import f3 from 'family-chart'
import type { FamilyData, Person } from '../types'
import { buildTreeData, SYNTHETIC_ROOT_ID } from '../lib/familyData'

interface Props {
  data: FamilyData
  onSelect: (person: Person) => void
  focusId?: string
}

export function FamilyTree({ data, onSelect, focusId = 'kyle-lui' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const didCenterRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const el = containerRef.current
    el.classList.add('f3')
    el.innerHTML = ''
    didCenterRef.current = false

    const treeData = buildTreeData(data)

    const chart = f3
      .createChart(el, treeData)
      .setTransitionTime(500)
      .setCardXSpacing(260)
      .setCardYSpacing(160)
      .setSingleParentEmptyCard(false)
      .setOrientationVertical()
      .setAncestryDepth(100)
      .setProgenyDepth(100)
      .setAfterUpdate(() => {
        hideSyntheticRoot(el)
        tagLinks(el, treeData)
        drawBridgeLinks(chart, el)
        if (!didCenterRef.current) {
          centerOnPerson(chart, el, focusId)
          didCenterRef.current = true
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
        cardEl.classList.remove(...branches)
        const branch = (d?.data?.data as Record<string, unknown>)?.branch as string | undefined
        if (branch) cardEl.classList.add(`branch-${branch}`)
      })

    card.setOnCardClick((_e: MouseEvent, d: { data: Person }) => {
      if (d?.data?.id === SYNTHETIC_ROOT_ID) return
      onSelectRef.current(d.data)
    })

    chart.updateTree({ initial: true })

    return () => {
      el.innerHTML = ''
    }
  }, [data])

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
  source?: { data?: { data?: { divorced?: boolean } } } | Array<{ data?: { data?: { divorced?: boolean } } }>
  target?: { data?: { data?: { divorced?: boolean } } } | Array<{ data?: { data?: { divorced?: boolean } } }>
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
      }
    } else {
      path.classList.add('parent-link')
    }
  })
}

/**
 * Janet is shown as Alex's spouse-card (to avoid a duplicate Janet), which
 * means family-chart draws no line from her to her biological parents
 * Gong Gong + Po Po. We overlay a dashed curve to preserve that link.
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

  type Node = { data: { id: string }; x: number; y: number; added?: boolean }
  const nodes = tree.data as Node[]

  const bridges: Array<{ childId: string; fatherId?: string; motherId?: string }> = [
    { childId: 'janet-shum', fatherId: 'gf-shum', motherId: 'gm-shum' },
  ]

  const line = d3.line<[number, number]>().curve(d3.curveMonotoneY)

  for (const { childId, fatherId, motherId } of bridges) {
    const child = nodes.find((n) => n.data.id === childId && n.added) ?? nodes.find((n) => n.data.id === childId)
    const father = fatherId ? nodes.find((n) => n.data.id === fatherId) : undefined
    const mother = motherId ? nodes.find((n) => n.data.id === motherId) : undefined
    if (!child || (!father && !mother)) continue

    const p1 = father ?? mother!
    const p2 = mother ?? father!
    const px = (p1.x + p2.x) / 2
    const py = (p1.y + p2.y) / 2
    const hy = child.y + (py - child.y) / 2

    const points: [number, number][] = [
      [child.x, child.y],
      [child.x, hy],
      [child.x, hy],
      [px, hy],
      [px, hy],
      [px, py],
    ]
    const dAttr = line(points)
    if (!dAttr) continue
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', dAttr)
    path.setAttribute('class', 'bridge-link')
    path.setAttribute('data-bridge', childId)
    customG.appendChild(path)
  }
}

function centerOnPerson(chart: any, el: HTMLElement, id: string) {
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
    transition_time: 0,
  })
}

function dateLine(data: Person['data']): string {
  const b = data.birthday || ''
  const d = data.deathday || ''
  const dag = data.deceased ? '†' : ''
  if (b && d) return `${b} – ${d}`
  if (b && dag) return `${b} ${dag}`
  if (b) return b
  if (d) return `† ${d}`
  if (dag) return '†'
  return ''
}
