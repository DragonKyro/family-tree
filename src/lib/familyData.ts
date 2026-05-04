import type { FamilyData, FamilyPayload, Person, UpdatePersonResponse } from '../types'
import { getPassword } from './auth'

export const SYNTHETIC_ROOT_ID = 'family-root'
export const LUI_ROOT_ID = 'gf-lui'
export const SHUM_ROOT_ID = 'gf-shum'

/**
 * In dev, same-origin Vite middleware handles /api and /photos directly.
 * In prod, requests go to the deployed Cloudflare Worker whose URL is baked
 * into the build via VITE_API_BASE.
 */
const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, '') ?? ''

export const isProdApi = API_BASE.length > 0

export class AuthError extends Error {
  constructor() {
    super('Wrong password — sign out and try again.')
    this.name = 'AuthError'
  }
}

export class ConflictError extends Error {
  constructor(public serverVersion?: number) {
    super('Someone else saved a change while you were editing. Reload to see the latest.')
    this.name = 'ConflictError'
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public field?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function authHeaders(): HeadersInit {
  return { 'x-family-password': getPassword() }
}

async function handleFailure(res: Response): Promise<never> {
  if (res.status === 401) throw new AuthError()
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { version?: number }
    throw new ConflictError(body.version)
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; field?: string }
  throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body.field)
}

/** Ping the API with current password to verify auth. Returns true on 200. */
export async function verifyPassword(candidate: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/family`, {
    headers: { 'x-family-password': candidate },
  })
  if (res.status === 401) return false
  return res.ok
}

export async function fetchFamily(): Promise<FamilyPayload> {
  const res = await fetch(`${API_BASE}/api/family`, { headers: authHeaders() })
  if (!res.ok) await handleFailure(res)
  return (await res.json()) as FamilyPayload
}

export async function updatePerson(
  id: string,
  edits: Partial<Person['data']>,
  version: number,
): Promise<UpdatePersonResponse> {
  const res = await fetch(`${API_BASE}/api/people/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(),
      'content-type': 'application/json',
      'if-match': `"${version}"`,
    },
    body: JSON.stringify(edits),
  })
  if (!res.ok) await handleFailure(res)
  return (await res.json()) as UpdatePersonResponse
}

export async function uploadPhoto(file: File | Blob): Promise<{ path: string }> {
  const res = await fetch(`${API_BASE}/api/photos`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'content-type': file.type || 'application/octet-stream',
    },
    body: file,
  })
  if (!res.ok) await handleFailure(res)
  return (await res.json()) as { path: string }
}

/**
 * Turn a stored photo path (e.g. "/photos/<uuid>.jpg") into a URL the browser
 * can render. In prod the Worker is a different origin and requires the
 * password, so we pass it in the query string (auth header can't be attached
 * to a plain <img src> request).
 */
export function resolvePhotoUrl(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  if (!path.startsWith('/')) return path
  if (!API_BASE) return path
  const pw = encodeURIComponent(getPassword())
  return `${API_BASE}${path}?p=${pw}`
}

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
