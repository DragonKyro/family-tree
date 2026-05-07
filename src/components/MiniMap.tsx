import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import f3 from 'family-chart'
import type { LayoutNode } from './FamilyTree'

interface Props {
  nodes: LayoutNode[]
}

const MAP_W = 200
const MAP_H = 140
const PAD = 6

const BRANCH_COLORS: Record<string, string> = {
  immediate: 'var(--branch-immediate)',
  lui: 'var(--branch-lui)',
  shum: 'var(--branch-shum)',
}

export function MiniMap({ nodes }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewport, setViewport] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Skip the synthetic root and any other 'placeholder' nodes.
  const real = useMemo(() => nodes.filter((n) => n.branch && n.branch !== 'placeholder'), [nodes])

  const bbox = useMemo(() => {
    if (real.length === 0) return null
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of real) {
      if (n.x < minX) minX = n.x
      if (n.x > maxX) maxX = n.x
      if (n.y < minY) minY = n.y
      if (n.y > maxY) maxY = n.y
    }
    // Add card half-width/height padding so cards aren't clipped at edges.
    minX -= 110
    maxX += 110
    minY -= 40
    maxY += 40
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY }
  }, [real])

  const scale = useMemo(() => {
    if (!bbox) return 1
    return Math.min((MAP_W - PAD * 2) / bbox.w, (MAP_H - PAD * 2) / bbox.h)
  }, [bbox])

  const offset = useMemo(() => {
    if (!bbox) return { x: 0, y: 0 }
    const drawW = bbox.w * scale
    const drawH = bbox.h * scale
    return {
      x: (MAP_W - drawW) / 2 - bbox.minX * scale,
      y: (MAP_H - drawH) / 2 - bbox.minY * scale,
    }
  }, [bbox, scale])

  // Track the main tree's pan/zoom and project it to a viewport rect.
  useEffect(() => {
    if (!bbox) return
    let raf = 0
    const tick = () => {
      const main = document.querySelector('.tree-area svg.main_svg') as SVGSVGElement | null
      if (main) {
        const listener = getZoomListener(main)
        if (listener) {
          const t = readZoomTransform(listener)
          const rect = main.getBoundingClientRect()
          // The visible region in tree-space:
          // any screen pixel (sx, sy) maps to tree-space ((sx - t.x) / t.k, (sy - t.y) / t.k)
          // (family-chart applies y separately without k, but reading __zoom gives the
          //  combined transform — close enough for a minimap rectangle)
          setViewport({
            x: -t.x / t.k,
            y: -t.y / t.k,
            w: rect.width / t.k,
            h: rect.height / t.k,
          })
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [bbox])

  const isDraggingRef = useRef(false)
  const movedDuringDragRef = useRef(false)

  const project = useCallback(
    (clientX: number, clientY: number, transitionTime: number) => {
      const svg = svgRef.current
      if (!svg) return
      const pt = svg.getBoundingClientRect()
      const mx = ((clientX - pt.left) / pt.width) * MAP_W
      const my = ((clientY - pt.top) / pt.height) * MAP_H
      const tx = (mx - offset.x) / scale
      const ty = (my - offset.y) / scale
      panMainTo(tx, ty, transitionTime)
    },
    [offset.x, offset.y, scale],
  )

  if (!bbox) return null

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = true
    movedDuringDragRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
    project(e.clientX, e.clientY, 0)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return
    movedDuringDragRef.current = true
    project(e.clientX, e.clientY, 0)
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
    // If it was a clean click (no drag), give a smooth transition into place.
    if (!movedDuringDragRef.current) project(e.clientX, e.clientY, 350)
  }

  return (
    <div className="minimap" aria-label="Tree minimap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="img"
      >
        <rect className="minimap-bg" x={0} y={0} width={MAP_W} height={MAP_H} />
        {real.map((n) => {
          const x = n.x * scale + offset.x
          const y = n.y * scale + offset.y
          return (
            <rect
              key={n.id + (n.added ? '-s' : '')}
              x={x - 6}
              y={y - 2}
              width={12}
              height={4}
              rx={1}
              fill={BRANCH_COLORS[n.branch ?? ''] ?? 'var(--muted)'}
            />
          )
        })}
        {viewport && (
          <rect
            className="minimap-viewport"
            x={viewport.x * scale + offset.x}
            y={viewport.y * scale + offset.y}
            width={viewport.w * scale}
            height={viewport.h * scale}
          />
        )}
      </svg>
    </div>
  )
}

function getZoomListener(main: SVGSVGElement): Element | null {
  const ownObj = (main as unknown as { __zoomObj?: unknown }).__zoomObj
  if (ownObj) return main
  return (main.parentNode as Element | null) ?? null
}

function readZoomTransform(el: Element): { x: number; y: number; k: number } {
  const z = (el as unknown as { __zoom?: { x: number; y: number; k: number } }).__zoom
  return z ? { x: z.x, y: z.y, k: z.k } : { x: 0, y: 0, k: 1 }
}

function panMainTo(treeX: number, treeY: number, transitionTime = 0) {
  const main = document.querySelector('.tree-area svg.main_svg') as SVGSVGElement | null
  if (!main) return
  const rect = main.getBoundingClientRect()
  const listener = getZoomListener(main)
  const k = listener ? readZoomTransform(listener).k : 1
  f3.handlers.cardToMiddle?.({
    datum: { x: treeX, y: treeY, data: { id: '__minimap__' } },
    svg: main,
    svg_dim: { width: rect.width, height: rect.height },
    scale: k,
    transition_time: transitionTime,
  })
}
