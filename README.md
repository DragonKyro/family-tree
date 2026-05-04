# family-tree

An interactive family tree for the Lui + Shum families — Vite + React + TypeScript, rendered with [family-chart](https://github.com/donatso/family-chart).

## Run locally

```bash
npm install       # first time only
npm run dev       # starts Vite on http://localhost:5173
```

Vite opens the browser automatically. Stop the server with `Ctrl+C`.

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Typecheck and produce a production bundle in `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run typecheck` | Run TypeScript without emitting |

## Features (v1)

- Pan, zoom, and click a person to re-center the tree
- Side panel with birth/death, parents, spouses, and children (all clickable)
- Photos on cards (drop files in `public/photos/` and reference as `/photos/<file>`)
- Live name search in the header

## Editing family data

All people live in [`src/data/family.json`](src/data/family.json). See [CLAUDE.md](CLAUDE.md) for the record shape and conventions.
