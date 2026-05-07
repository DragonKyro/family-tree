# Lui + Shum Family Tree

An interactive family tree, hosted on GitHub Pages.

🌳 **Live site:** https://dragonkyro.github.io/family-tree/

## What you can do

- **Browse the tree** — pan, zoom, and click any card to focus a person. The tree smoothly recenters as you click around in the side panel too.
- **Side panel** shows photo, age, zodiac + Chinese zodiac (with element and birthstone), education, work, contact info, family ties, and notes.
- **Search** by name *or* attribute — try `town:Seattle`, `college:Cornell`, `job:Google`, or just type a name. Aliases like `school:`, `hs:`, `hobby:` work too.
- **Birthday calendar** (top-left button) — month grid with everyone's birthdays dotted; click a day to see who, click a name to jump to them in the tree.
- **Relationship finder** (top-left button) — pick any two relatives, get what one calls the other in English and Cantonese (with Jyutping). Handles paternal vs. maternal, elder vs. younger, in-laws, 堂 vs. 表 cousins.
- **Mini-map** in the bottom-left — click or drag to navigate the tree.
- **Light / dark mode** toggle in the header (dark by default; choice is remembered).

## Visual encoding

- Outlined cards — rust = Lui side · teal = Shum side · gold = immediate family · warm brown = pet
- Deceased people are shown with the card shaded / grayscaled (no extra dagger)
- Solid rust line = marriage · dashed red = divorce

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

Vite + React + TypeScript, [family-chart](https://github.com/donatso/family-chart) for tree rendering. Pure static SPA — no backend.
