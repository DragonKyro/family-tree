import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { handleApi } from './handler'
import { servePhoto } from './photos'

const FAMILY_PASSWORD = process.env.FAMILY_PASSWORD ?? 'shum'

function checkPassword(req: IncomingMessage): boolean {
  const url = new URL(req.url ?? '', 'http://local')
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

export function familyApiPlugin(): Plugin {
  const attach = (server: { middlewares: { use: (path: string, fn: Function) => void } }) => {
    server.middlewares.use('/api', (req: IncomingMessage, res: ServerResponse, next: Function) => {
      handleApi(req, res).catch((err) => next(err))
    })
    server.middlewares.use('/photos', (req: IncomingMessage, res: ServerResponse) => {
      if (!checkPassword(req)) {
        res.statusCode = 401
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ error: 'Wrong password' }))
        return
      }
      const rawUrl = req.url ?? ''
      const name = rawUrl.replace(/^\//, '').replace(/\?.*$/, '')
      servePhoto(decodeURIComponent(name), res)
    })
  }

  return {
    name: 'family-tree-api',
    configureServer(server) {
      attach(server as any)
    },
    configurePreviewServer(server) {
      attach(server as any)
    },
  }
}
