# family-tree

An interactive family tree for the Lui + Shum families.

## Stack

- Vite + React 18 + TypeScript
- [family-chart](https://github.com/donatso/family-chart) (d3-based) for tree rendering
- Dev: Vite middleware serves `/api/*` and `/photos/*` directly from `data/`
- Prod: a thin Cloudflare Worker proxies the same endpoints and commits edits to a GitHub `edits` branch for manual review

## Layout

```
data/
  family.json              # canonical source of truth
  photos/                  # uploaded photos, uuid-named
  edit-log.jsonl           # append-only audit log of who edited what (prod only)

src/
  main.tsx                 # React entry
  App.tsx                  # layout + auth gate + edit flow
  types.ts                 # Person + shared types
  lib/
    familyData.ts          # API client + photo URL resolver
    formatters.ts          # date/phone display formatters
    auth.ts                # client-side password storage
  components/
    FamilyTree.tsx         # family-chart renderer (useEffect wrapper)
    DetailsPanel.tsx       # info panel for the selected person
    SearchBox.tsx          # name search that focuses the tree
    EditDialog.tsx         # modal form with file upload
    LoginGate.tsx          # password prompt shown before the app loads
  styles/
    app.css

server/
  vitePlugin.ts            # Vite middleware (dev only)
  handler.ts               # request routing for /api
  storage.ts               # atomic JSON writes with a serialized queue
  validation.ts            # field sanitization (shared with worker)
  photos.ts                # photo save/serve

worker/
  index.ts                 # Cloudflare Worker (prod backend)
  wrangler.toml
  README.md                # deploy + setup instructions
```

## Data model

One record per person. `id` is stable and referenced by `rels`.

```ts
{
  id: "p1",
  data: {
    first_name: "Jane",
    last_name: "Lui",
    birthday: "1950-04-12",   // optional
    deathday: "",              // optional, "" if living
    gender: "F",               // "M" | "F"
    avatar: "/photos/jane.jpg",// optional
    notes: ""                   // free-form
  },
  rels: {
    father: "p2",              // optional id
    mother: "p3",              // optional id
    spouses: ["p4"],           // ordered; first = current/primary
    children: ["p5", "p6"]     // ordered by birth
  }
}
```

family-chart consumes this shape directly. Keep the file sorted loosely by generation, oldest first, so diffs are readable.

## Commands

- `npm run dev` — start Vite on localhost:5173 with the API middleware attached
- `npm run build` — typecheck + production bundle into `dist/` (SPA only; data + photos not bundled)
- `npm run preview` — serve the built bundle locally
- `npm run typecheck` — tsc without emitting

## Environment

- `FAMILY_PASSWORD` — shared password, default `"shum"`. Used by the Vite middleware (dev) and the Worker (prod, set via `wrangler secret put`).
- `VITE_API_BASE` (build-time) — the Cloudflare Worker URL, e.g. `https://family-tree-api.you.workers.dev`. Set in GitHub Actions as a repository variable. Empty/unset means the SPA talks to same-origin `/api` (dev).

## Dev ↔ prod request flow

Same endpoints, different hosts:

| Endpoint | Dev (Vite middleware) | Prod (Worker) |
|---|---|---|
| `GET /api/family` | reads `data/family.json` | reads `data/family.json` from `main` branch via GitHub API |
| `PUT /api/people/:id` | writes `data/family.json` atomically | commits to `edits` branch + appends to `data/edit-log.jsonl` |
| `POST /api/photos` | writes binary to `data/photos/<uuid>.<ext>` | commits binary to `edits` branch |
| `GET /photos/<name>` | streams file from `data/photos/` | fetches from `main` branch (fallback `edits`), proxies with long cache |

All requests require `X-Family-Password` header (or `?p=` on `<img>` GETs since headers can't be added to img tags).

## Conventions

- Data edits go in `data/family.json`. IDs are opaque strings; once assigned, never reuse.
- Photos are uploaded via the Edit dialog; server assigns a UUID filename, stores at `data/photos/<uuid>.<ext>`, stored path in JSON is `/photos/<uuid>.<ext>`.
- No automated tests yet — verify by running `npm run dev` and clicking through.
