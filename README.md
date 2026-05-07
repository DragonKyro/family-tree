# Lui + Shum Family Tree

An interactive family tree, hosted on GitHub Pages.

🌳 **Live site:** https://dragonkyro.github.io/family-tree/

## Run locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173.

## Updating the tree

The tree is rendered straight from [`data/family.json`](data/family.json) — to add a person, change a name, fix a relationship, or add a photo, edit that file (and drop photos into [`public/photos/`](public/photos/) referenced as `/photos/<filename>`).

Pushing to `main` automatically rebuilds and redeploys the site via [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

## Stack

Vite + React + TypeScript, [family-chart](https://github.com/donatso/family-chart) for tree rendering.
