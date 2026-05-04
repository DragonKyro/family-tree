import { useEffect, useRef } from 'react'
import f3 from 'family-chart'
import type { FamilyData, Person } from '../types'

interface Props {
  data: FamilyData
  mainId?: string
  onSelect: (person: Person) => void
}

export function FamilyTree({ data, mainId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current) return

    const el = containerRef.current
    el.classList.add('f3')
    el.innerHTML = ''

    const clone = structuredClone(data) as FamilyData
    if (mainId) {
      clone.forEach((p) => {
        if (p.id === mainId) p.main = true
        else delete p.main
      })
    }

    const chart = f3
      .createChart(el, clone)
      .setTransitionTime(500)
      .setCardXSpacing(260)
      .setCardYSpacing(160)
      .setSingleParentEmptyCard(false)
      .setOrientationVertical()

    const card = chart
      .setCard(f3.CardHtml)
      .setStyle('imageRect')
      .setCardDisplay([
        (d: { data: Person['data'] }) => fullNameFromRaw(d.data),
        (d: { data: Person['data'] }) => dateLine(d.data),
      ])
      .setCardDim({ width: 220, height: 80, img_width: 60, img_height: 60, img_x: 5, img_y: 10 })
      .setMiniTree(true)
      .setOnHoverPathToMain()

    card.setOnCardClick((_e: MouseEvent, d: { data: Person }) => {
      chart.updateMainId(d.data.id)
      chart.updateTree({ initial: false })
      onSelectRef.current(d.data)
    })

    chart.updateTree({ initial: true })
    chartRef.current = chart

    return () => {
      el.innerHTML = ''
      chartRef.current = null
    }
  }, [data])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !mainId) return
    chart.updateMainId(mainId)
    chart.updateTree({ initial: false, tree_position: 'main_to_middle' })
  }, [mainId])

  return <div ref={containerRef} className="tree-canvas" style={{ width: '100%', height: '100%' }} />
}

function fullNameFromRaw(data: Person['data']): string {
  return [data.first_name, data.last_name].filter(Boolean).join(' ').trim()
}

function dateLine(data: Person['data']): string {
  const b = data.birthday || ''
  const d = data.deathday || ''
  if (b && d) return `${b} – ${d}`
  if (b) return b
  if (d) return `† ${d}`
  return ''
}
