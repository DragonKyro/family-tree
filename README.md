# family-tree

Interactive family tree for the Lui + Shum families — Vite + React + TypeScript, rendered with [family-chart](https://github.com/donatso/family-chart), gated by a shared family password.

## Run locally

```bash
npm install
npm run dev         # starts Vite on http://localhost:5173
```

The dev server includes the API middleware, so edits persist to `data/family.json` on your machine. The password is read from `FAMILY_PASSWORD` env var (default: `shum`).

```bash
FAMILY_PASSWORD=mypassword npm run dev
```

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Typecheck + produce a production bundle in `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run typecheck` | Run TypeScript without emitting |

## Features

- Pan, zoom, and click a person to view their details
- Side panel with name, photo, dates, contact, education, work, interests, family ties
- Edit any card — photo upload, per-field validation, consistent formatting on save
- Shared family password gates both read and write
- Search by name (header)

## Editing family data

All people live in [`data/family.json`](data/family.json). See [CLAUDE.md](CLAUDE.md) for the record shape and conventions. Photos live in `data/photos/` with server-generated UUID filenames.

## Deploying

- **SPA** → GitHub Pages, built by [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) on push to `main`.
- **Backend** → Cloudflare Worker (see [worker/README.md](worker/README.md)). Holds the GitHub PAT + family password; commits relatives' edits to an `edits` branch for manual review.

**Privacy caveat:** if the GitHub repo is public, `data/family.json` is readable at `raw.githubusercontent.com` regardless of the password. For real privacy, make the repo private (requires GitHub Pro for free GitHub Pages, or switch SPA hosting to Cloudflare Pages which supports private repos on the free tier).
