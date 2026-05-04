import familyJson from '../data/family.json'
import type { FamilyData, Person } from '../types'

export function loadFamily(): FamilyData {
  return familyJson as FamilyData
}

export function findById(data: FamilyData, id: string): Person | undefined {
  return data.find((p) => p.id === id)
}

export function fullName(p: Person): string {
  return [p.data.first_name, p.data.last_name].filter(Boolean).join(' ').trim()
}

export function searchByName(data: FamilyData, query: string): Person[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return data.filter((p) => fullName(p).toLowerCase().includes(q)).slice(0, 20)
}

export function pickMainId(data: FamilyData): string | undefined {
  return (data.find((p) => p.main) ?? data[0])?.id
}
