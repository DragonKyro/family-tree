import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { FamilyData, Person } from '../types'
import { fullName, isSynthetic, resolvePhotoUrl } from '../lib/familyData'
import { geocodeTown } from '../lib/geocode'

interface Props {
  data: FamilyData
  onClose: () => void
  onSelectPerson: (p: Person) => void
}

interface PersonPin {
  person: Person
  coords: [number, number]
  town: string
}

const BRANCH_COLORS: Record<string, string> = {
  immediate: '#d4a017',
  lui: '#8a3b2e',
  shum: '#2e7d8a',
}

export default function MapPanel({ data, onClose, onSelectPerson }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const [pins, setPins] = useState<PersonPin[] | null>(null)
  const [missing, setMissing] = useState<Person[]>([])

  const candidates = useMemo(
    () =>
      data.filter(
        (p) =>
          !isSynthetic(p) &&
          (p.data.coords ||
            (typeof p.data.current_town === 'string' && p.data.current_town.trim().length > 0)),
      ),
    [data],
  )

  // Geocode all candidates, then store the resolved pins.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const resolved: PersonPin[] = []
      const noLocation: Person[] = []
      for (const person of candidates) {
        const fixed = person.data.coords
        if (Array.isArray(fixed) && fixed.length === 2) {
          resolved.push({ person, coords: [fixed[0], fixed[1]], town: person.data.current_town ?? '' })
          continue
        }
        const town = person.data.current_town?.trim()
        if (!town) continue
        const c = await geocodeTown(town)
        if (cancelled) return
        if (c) resolved.push({ person, coords: c, town })
        else noLocation.push(person)
      }
      if (!cancelled) {
        setPins(resolved)
        setMissing(noLocation)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [candidates])

  // Initialize the map once on mount.
  useEffect(() => {
    if (!mapDivRef.current) return
    const m = L.map(mapDivRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      worldCopyJump: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    }).addTo(m)
    mapRef.current = m
    layerRef.current = L.layerGroup().addTo(m)
    // Force a recalc once the panel has actual size.
    setTimeout(() => m.invalidateSize(), 100)
    return () => {
      m.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  // Render markers when pins change.
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer || !pins) return
    layer.clearLayers()
    if (pins.length === 0) return
    for (const { person, coords, town } of pins) {
      const branch = person.data.branch ?? 'shum'
      const color = BRANCH_COLORS[branch] ?? '#9aa0a6'
      const avatarUrl = resolvePhotoUrl(person.data.avatar)
      const inner = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" alt="" />`
        : `<span class="map-pin-initials">${escapeHtml(initials(person))}</span>`
      const icon = L.divIcon({
        className: 'map-pin-wrapper',
        html: `<div class="map-pin" style="border-color:${color}">${inner}</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      })
      const marker = L.marker(coords, { icon, riseOnHover: true })
      marker.bindPopup(
        `<strong>${escapeHtml(fullName(person))}</strong><br/><span style="color:#6b7280">${escapeHtml(town)}</span>`,
        { closeButton: false },
      )
      marker.on('click', () => onSelectPerson(person))
      marker.addTo(layer)
    }
    // Fit to all markers.
    const bounds = L.latLngBounds(pins.map((p) => p.coords))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 })
  }, [pins, onSelectPerson])

  // Esc to close.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="tool-panel map-panel" role="dialog" aria-label="Family map">
      <header className="tool-panel-header">
        <div className="month-label">Family map</div>
        <button className="tool-panel-close" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="map-canvas" ref={mapDivRef} />
      <div className="map-footer">
        {pins == null ? (
          <span className="muted">Locating relatives…</span>
        ) : (
          <>
            <span>
              {pins.length} placed{pins.length === 1 ? '' : ''}
              {missing.length > 0 && (
                <span className="muted"> · {missing.length} couldn't geocode</span>
              )}
            </span>
            <span className="muted">© OpenStreetMap</span>
          </>
        )}
      </div>
    </div>
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function initials(p: Person): string {
  const f = p.data.first_name?.[0] ?? ''
  const l = p.data.last_name?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
}
