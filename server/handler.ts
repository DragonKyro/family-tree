import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFamily, mutateFamily } from './storage'
import { normalizeEdits, ValidationError, MAX_BODY_BYTES } from './validation'
import { savePhoto, PhotoError, MAX_PHOTO_BYTES } from './photos'

function json(res: ServerResponse, status: number, body: unknown, etag?: string) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  if (etag) res.setHeader('etag', etag)
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return readBodyBytes(req, maxBytes).then((buf) => buf.toString('utf8'))
}

function readBodyBytes(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('Payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function parseIfMatch(header: string | string[] | undefined): number | null {
  if (!header) return null
  const raw = Array.isArray(header) ? header[0] : header
  const stripped = raw.replace(/^W\//i, '').replace(/"/g, '')
  const n = Number(stripped)
  return Number.isFinite(n) ? n : null
}

const FAMILY_PASSWORD = process.env.FAMILY_PASSWORD ?? 'shum'

function checkPassword(req: IncomingMessage, url: URL): boolean {
  const provided =
    (req.headers['x-family-password'] as string | undefined) ||
    url.searchParams.get('p') ||
    ''
  if (provided.length !== FAMILY_PASSWORD.length) return false
  let diff = 0
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ FAMILY_PASSWORD.charCodeAt(i)
  }
  return diff === 0
}

export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '', 'http://local')
  const method = req.method ?? 'GET'

  if (!checkPassword(req, url)) {
    json(res, 401, { error: 'Wrong password' })
    return
  }

  try {
    if (method === 'GET' && url.pathname === '/family') {
      const current = await readFamily()
      json(res, 200, current, `"${current.version}"`)
      return
    }

    if (method === 'POST' && url.pathname === '/photos') {
      const declaredMime = (req.headers['content-type'] ?? '').toString()
      if (!declaredMime.toLowerCase().startsWith('image/')) {
        json(res, 400, { error: 'Content-Type must be an image/* type' })
        return
      }
      const buf = await readBodyBytes(req, MAX_PHOTO_BYTES)
      const result = await savePhoto(buf, declaredMime)
      json(res, 201, result)
      return
    }

    if (method === 'PUT' && url.pathname.startsWith('/people/')) {
      const id = decodeURIComponent(url.pathname.slice('/people/'.length))
      const ifMatch = parseIfMatch(req.headers['if-match'])
      const bodyText = await readBody(req, MAX_BODY_BYTES)
      let parsed: unknown
      try {
        parsed = JSON.parse(bodyText || '{}')
      } catch {
        json(res, 400, { error: 'Invalid JSON' })
        return
      }
      const edits = normalizeEdits(parsed)

      const result = await mutateFamily<{ version: number; person: unknown }>((current) => {
        if (ifMatch != null && current.version !== ifMatch) {
          const err = new Error('version mismatch')
          ;(err as Error & { code?: string }).code = 'CONFLICT'
          throw err
        }
        const idx = (current.data as Array<{ id: string; data: Record<string, unknown> }>).findIndex(
          (p) => p?.id === id,
        )
        if (idx === -1) {
          const err = new Error('not found')
          ;(err as Error & { code?: string }).code = 'NOT_FOUND'
          throw err
        }
        const person = current.data[idx] as { id: string; data: Record<string, unknown> }
        person.data = { ...person.data, ...edits }
        return { next: current, result: { version: current.version + 1, person } }
      })

      json(res, 200, result, `"${result.version}"`)
      return
    }

    json(res, 404, { error: 'Not found' })
  } catch (e) {
    const err = e as Error & { code?: string }
    if (err.code === 'CONFLICT') {
      const current = await readFamily()
      json(res, 409, { error: 'Version mismatch; please reload', version: current.version })
      return
    }
    if (err.code === 'NOT_FOUND') {
      json(res, 404, { error: 'Person not found' })
      return
    }
    if (e instanceof ValidationError) {
      json(res, 400, { error: e.message, field: e.field })
      return
    }
    if (e instanceof PhotoError) {
      json(res, e.status, { error: e.message })
      return
    }
    if (err.message === 'Payload too large') {
      json(res, 413, { error: 'Payload too large' })
      return
    }
    console.error('[api] unhandled error:', err)
    json(res, 500, { error: 'Internal error' })
  }
}
