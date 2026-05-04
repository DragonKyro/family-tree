import { readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'

export interface StoredFamily {
  data: unknown[]
  version: number
}

const DATA_FILE = join(process.cwd(), 'data', 'family.json')
const TMP_FILE = DATA_FILE + '.tmp'

let writeQueue: Promise<unknown> = Promise.resolve()

export async function readFamily(): Promise<StoredFamily> {
  const raw = await readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) {
    return { data: parsed, version: 0 }
  }
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
    return { data: parsed.data, version: Number(parsed.version) || 0 }
  }
  throw new Error('family.json is malformed')
}

/**
 * Serializes all writes through a promise chain so concurrent requests can't
 * interleave read/modify/write. Atomic on-disk swap via rename().
 */
export function mutateFamily<T>(
  mutator: (current: StoredFamily) => Promise<{ next: StoredFamily; result: T }> | { next: StoredFamily; result: T },
): Promise<T> {
  const run = writeQueue.then(async () => {
    const current = await readFamily()
    const { next, result } = await mutator(current)
    next.version = current.version + 1
    const payload = JSON.stringify(next, null, 2)
    await writeFile(TMP_FILE, payload, 'utf8')
    await rename(TMP_FILE, DATA_FILE)
    return result
  })
  writeQueue = run.catch(() => undefined)
  return run
}
