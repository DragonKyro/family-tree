import { mkdir, writeFile } from 'node:fs/promises'
import { createReadStream, statSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ServerResponse } from 'node:http'

export const PHOTOS_DIR = join(process.cwd(), 'data', 'photos')
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MB

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

/**
 * Sniff the actual image type from the first few bytes. Don't trust the
 * Content-Type header alone — a client could claim image/png while sending
 * HTML or a script.
 */
function sniffImageMime(buf: Buffer): string | null {
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

/** Filenames are UUIDs we generate, but defense-in-depth for path traversal. */
export const PHOTO_NAME_RE = /^[a-f0-9][a-f0-9-]{7,63}\.(jpg|png|gif|webp)$/i

export async function savePhoto(buffer: Buffer, declaredMime: string): Promise<{ path: string }> {
  if (buffer.length === 0) {
    throw new PhotoError('Empty upload', 400)
  }
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new PhotoError(`Photo must be under ${Math.floor(MAX_PHOTO_BYTES / 1024 / 1024)} MB`, 413)
  }
  const actualMime = sniffImageMime(buffer)
  if (!actualMime) {
    throw new PhotoError('Only JPEG, PNG, GIF, or WebP images are allowed', 400)
  }
  const declared = declaredMime.toLowerCase().split(';')[0]?.trim()
  if (declared && declared !== actualMime) {
    throw new PhotoError('Uploaded file contents do not match declared type', 400)
  }
  const ext = MIME_TO_EXT[actualMime]!
  await mkdir(PHOTOS_DIR, { recursive: true })
  const name = `${randomUUID()}.${ext}`
  await writeFile(join(PHOTOS_DIR, name), buffer)
  return { path: `/photos/${name}` }
}

export function servePhoto(name: string, res: ServerResponse): void {
  if (!PHOTO_NAME_RE.test(name)) {
    res.statusCode = 400
    res.end()
    return
  }
  const full = join(PHOTOS_DIR, name)
  let stat
  try {
    stat = statSync(full)
  } catch {
    res.statusCode = 404
    res.end()
    return
  }
  const ext = name.split('.').pop()!.toLowerCase()
  const mime = EXT_TO_MIME[ext] ?? 'application/octet-stream'
  res.setHeader('content-type', mime)
  res.setHeader('content-length', String(stat.size))
  res.setHeader('cache-control', 'public, max-age=86400, immutable')
  const stream = createReadStream(full)
  stream.on('error', () => {
    if (!res.headersSent) res.statusCode = 500
    res.end()
  })
  stream.pipe(res)
}

export class PhotoError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'PhotoError'
  }
}
