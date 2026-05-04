/**
 * Family-tree Cloudflare Worker.
 *
 * Sits between the GitHub Pages SPA and the repo that holds family.json + photos.
 * - Reads (family data, photos) fetch from the `main` branch via GitHub API.
 * - Writes (edits, photo uploads) commit to an `edits` branch. The repo owner
 *   reviews + merges to `main` manually. GitHub Pages rebuilds only on `main`,
 *   so a flood of pending edits doesn't thrash the deployed site.
 * - Every request is gated by a shared family password.
 *
 * Env vars (see wrangler.toml + `wrangler secret put`):
 *   GITHUB_TOKEN     – PAT with contents:write on the repo (secret)
 *   FAMILY_PASSWORD  – the shared password, e.g. "shum" (secret)
 *   GITHUB_REPO      – "owner/repo" (vars)
 *   MAIN_BRANCH      – usually "main" (vars)
 *   EDITS_BRANCH     – usually "edits" (vars)
 *   ALLOWED_ORIGIN   – the GH Pages origin, e.g. "https://you.github.io" (vars)
 */

import { normalizeEdits, ValidationError, MAX_BODY_BYTES } from '../server/validation'

interface Env {
  GITHUB_TOKEN: string
  FAMILY_PASSWORD: string
  GITHUB_REPO: string
  MAIN_BRANCH: string
  EDITS_BRANCH: string
  ALLOWED_ORIGIN: string
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_NAME_RE = /^[a-f0-9][a-f0-9-]{7,63}\.(jpg|png|gif|webp)$/i

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin') ?? ''

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, origin) })
    }

    try {
      const pwCheck = checkPassword(req, env)
      if (pwCheck) return pwCheck // 401 on bad password

      const url = new URL(req.url)
      const path = url.pathname

      if (req.method === 'GET' && path === '/api/family') {
        return await getFamily(env, origin)
      }
      if (req.method === 'PUT' && path.startsWith('/api/people/')) {
        const id = decodeURIComponent(path.slice('/api/people/'.length))
        return await putPerson(id, req, env, origin)
      }
      if (req.method === 'POST' && path === '/api/photos') {
        return await postPhoto(req, env, origin)
      }
      if (req.method === 'GET' && path.startsWith('/photos/')) {
        const name = decodeURIComponent(path.slice('/photos/'.length))
        return await getPhoto(name, env, origin)
      }

      return jsonResponse(404, { error: 'Not found' }, env, origin)
    } catch (e) {
      if (e instanceof ValidationError) {
        return jsonResponse(400, { error: e.message, field: e.field }, env, origin)
      }
      console.error('[worker] unhandled', e)
      return jsonResponse(500, { error: 'Internal error' }, env, origin)
    }
  },
}

// ---------- Password check ----------

function checkPassword(req: Request, env: Env): Response | null {
  const expected = env.FAMILY_PASSWORD
  if (!expected) {
    return jsonResponse(500, { error: 'Server missing FAMILY_PASSWORD' }, env, '')
  }
  const url = new URL(req.url)
  const provided =
    req.headers.get('x-family-password') ||
    url.searchParams.get('p') ||
    ''
  if (!timingSafeEqual(provided, expected)) {
    return jsonResponse(401, { error: 'Wrong password' }, env, req.headers.get('origin') ?? '')
  }
  return null
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ---------- CORS ----------

function corsHeaders(env: Env, origin: string): Record<string, string> {
  const allowed = env.ALLOWED_ORIGIN || ''
  const ok = origin && (origin === allowed || origin.startsWith('http://localhost:'))
  return {
    'access-control-allow-origin': ok ? origin : allowed,
    'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
    'access-control-allow-headers': 'content-type, if-match, x-family-password',
    'access-control-expose-headers': 'etag',
    'vary': 'origin',
  }
}

function jsonResponse(status: number, body: unknown, env: Env, origin: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...corsHeaders(env, origin),
      ...extraHeaders,
    },
  })
}

// ---------- Family data ----------

async function getFamily(env: Env, origin: string): Promise<Response> {
  // Read from main — that's what's been "approved" by the maintainer.
  const file = await githubGetFile(env, env.MAIN_BRANCH, 'data/family.json')
  if (!file) return jsonResponse(404, { error: 'family.json not found on main' }, env, origin)
  let parsed: unknown
  try {
    parsed = JSON.parse(file.content)
  } catch {
    return jsonResponse(500, { error: 'family.json is malformed on main' }, env, origin)
  }
  const shape = normalizeStored(parsed)
  return jsonResponse(200, shape, env, origin, { etag: `"${shape.version}"` })
}

interface StoredShape {
  data: unknown[]
  version: number
}

function normalizeStored(raw: unknown): StoredShape {
  if (Array.isArray(raw)) return { data: raw, version: 0 }
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) {
    return { data: (raw as any).data, version: Number((raw as any).version) || 0 }
  }
  throw new Error('malformed')
}

async function putPerson(id: string, req: Request, env: Env, origin: string): Promise<Response> {
  const bodyText = await req.text()
  if (bodyText.length > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: 'Payload too large' }, env, origin)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(bodyText || '{}')
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON' }, env, origin)
  }
  const edits = normalizeEdits(parsed)

  await ensureEditsBranch(env)

  // Read latest family.json from edits branch (falls back to main).
  const existing =
    (await githubGetFile(env, env.EDITS_BRANCH, 'data/family.json')) ??
    (await githubGetFile(env, env.MAIN_BRANCH, 'data/family.json'))
  if (!existing) return jsonResponse(500, { error: 'family.json missing from repo' }, env, origin)

  const shape = normalizeStored(JSON.parse(existing.content))
  const idx = (shape.data as Array<{ id?: string; data?: Record<string, unknown> }>).findIndex(
    (p) => p?.id === id,
  )
  if (idx === -1) return jsonResponse(404, { error: 'Person not found' }, env, origin)

  const record = shape.data[idx] as { id: string; data: Record<string, unknown> }
  record.data = { ...record.data, ...edits }
  shape.version = shape.version + 1
  const newContent = JSON.stringify(shape, null, 2) + '\n'

  const logLine =
    JSON.stringify({
      ts: new Date().toISOString(),
      id,
      keys: Object.keys(edits),
    }) + '\n'
  const existingLog = await githubGetFile(env, env.EDITS_BRANCH, 'data/edit-log.jsonl')
  const newLog = (existingLog?.content ?? '') + logLine

  const msg = `Edit ${id} (${Object.keys(edits).join(', ') || 'no changes'})`
  await githubPutFile(env, env.EDITS_BRANCH, 'data/family.json', newContent, existing.sha ?? undefined, msg)
  await githubPutFile(env, env.EDITS_BRANCH, 'data/edit-log.jsonl', newLog, existingLog?.sha, `Log: ${msg}`)

  return jsonResponse(
    200,
    { version: shape.version, person: record },
    env,
    origin,
    { etag: `"${shape.version}"` },
  )
}

// ---------- Photos ----------

async function postPhoto(req: Request, env: Env, origin: string): Promise<Response> {
  const declared = (req.headers.get('content-type') ?? '').toLowerCase().split(';')[0]?.trim() ?? ''
  if (!declared.startsWith('image/')) {
    return jsonResponse(400, { error: 'Content-Type must be an image/* type' }, env, origin)
  }
  const buf = new Uint8Array(await req.arrayBuffer())
  if (buf.byteLength === 0) {
    return jsonResponse(400, { error: 'Empty upload' }, env, origin)
  }
  if (buf.byteLength > MAX_PHOTO_BYTES) {
    return jsonResponse(413, { error: 'Photo must be under 5 MB' }, env, origin)
  }
  const actual = sniffImageMime(buf)
  if (!actual) {
    return jsonResponse(400, { error: 'Only JPEG, PNG, GIF, or WebP images are allowed' }, env, origin)
  }
  if (declared !== actual) {
    return jsonResponse(400, { error: 'Uploaded file contents do not match declared type' }, env, origin)
  }

  await ensureEditsBranch(env)

  const ext = MIME_TO_EXT[actual]!
  const name = `${crypto.randomUUID()}.${ext}`
  const path = `data/photos/${name}`
  await githubPutFile(env, env.EDITS_BRANCH, path, bufferToBase64(buf), undefined, `Upload photo ${name}`, true)
  return jsonResponse(201, { path: `/photos/${name}` }, env, origin)
}

async function getPhoto(name: string, env: Env, origin: string): Promise<Response> {
  if (!PHOTO_NAME_RE.test(name)) {
    return jsonResponse(400, { error: 'Invalid photo name' }, env, origin)
  }
  // Prefer main, fall back to edits so recent uploads render before review.
  const file =
    (await githubGetFile(env, env.MAIN_BRANCH, `data/photos/${name}`, true)) ??
    (await githubGetFile(env, env.EDITS_BRANCH, `data/photos/${name}`, true))
  if (!file) {
    return new Response('Not found', { status: 404, headers: corsHeaders(env, origin) })
  }
  const ext = name.split('.').pop()!.toLowerCase()
  const mime = EXT_TO_MIME[ext] ?? 'application/octet-stream'
  return new Response(file.bytes, {
    headers: {
      'content-type': mime,
      'cache-control': 'public, max-age=31536000, immutable',
      ...corsHeaders(env, origin),
    },
  })
}

// ---------- Image sniffing ----------

function sniffImageMime(buf: Uint8Array): string | null {
  if (buf.length < 12) return null
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif'
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

// ---------- GitHub API ----------

const GH_API = 'https://api.github.com'

function githubHeaders(env: Env): Record<string, string> {
  return {
    'authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'accept': 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'family-tree-worker',
  }
}

async function githubGetFile(
  env: Env,
  branch: string,
  path: string,
  binary = false,
): Promise<{ content: string; bytes: Uint8Array; sha: string } | null> {
  const u = `${GH_API}/repos/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`
  const res = await fetch(u, { headers: githubHeaders(env) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub GET ${path}@${branch}: ${res.status}`)
  const body = (await res.json()) as { content?: string; encoding?: string; sha: string }
  if (!body.content) return null
  const b64 = body.content.replace(/\n/g, '')
  const bytes = base64ToBuffer(b64)
  const content = binary ? '' : new TextDecoder().decode(bytes)
  return { content, bytes, sha: body.sha }
}

async function githubPutFile(
  env: Env,
  branch: string,
  path: string,
  content: string,
  sha: string | undefined,
  message: string,
  contentIsAlreadyBase64 = false,
): Promise<void> {
  const u = `${GH_API}/repos/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`
  const contentB64 = contentIsAlreadyBase64 ? content : stringToBase64(content)
  const body = {
    message,
    content: contentB64,
    branch,
    ...(sha ? { sha } : {}),
  }
  const res = await fetch(u, {
    method: 'PUT',
    headers: { ...githubHeaders(env), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub PUT ${path}@${branch}: ${res.status} ${text}`)
  }
}

async function ensureEditsBranch(env: Env): Promise<void> {
  const refUrl = `${GH_API}/repos/${env.GITHUB_REPO}/git/ref/heads/${encodeURIComponent(env.EDITS_BRANCH)}`
  const res = await fetch(refUrl, { headers: githubHeaders(env) })
  if (res.ok) return
  if (res.status !== 404) throw new Error(`Check ref ${env.EDITS_BRANCH}: ${res.status}`)

  // Create from main
  const mainRefRes = await fetch(
    `${GH_API}/repos/${env.GITHUB_REPO}/git/ref/heads/${encodeURIComponent(env.MAIN_BRANCH)}`,
    { headers: githubHeaders(env) },
  )
  if (!mainRefRes.ok) throw new Error(`Fetch main ref: ${mainRefRes.status}`)
  const mainRef = (await mainRefRes.json()) as { object: { sha: string } }

  const createRes = await fetch(`${GH_API}/repos/${env.GITHUB_REPO}/git/refs`, {
    method: 'POST',
    headers: { ...githubHeaders(env), 'content-type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${env.EDITS_BRANCH}`, sha: mainRef.object.sha }),
  })
  if (!createRes.ok && createRes.status !== 422) {
    throw new Error(`Create ${env.EDITS_BRANCH}: ${createRes.status} ${await createRes.text()}`)
  }
}

// ---------- base64 helpers (no Buffer in Workers) ----------

function stringToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s)
  return bufferToBase64(bytes)
}

function bufferToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
