# Lui + Shum Family Tree

An interactive family tree, hosted on GitHub Pages.

🌳 **Live site:** https://dragonkyro.github.io/family-tree/

## What you can do

- **Browse the tree** — pan, zoom, and click any card to focus a person. The tree smoothly recenters as you click around in the side panel too.
- **Side panel** shows photo, name (with Chinese name + nickname under it), age, zodiac + Chinese zodiac (element + birthstone), **personal** (pronouns / sex / sexuality / religion / languages / MBTI / relationship status), contact + social handles (Instagram, Facebook, LinkedIn, X, Threads, Bluesky, TikTok, YouTube, Snapchat, GitHub, Discord, WeChat), education (HS / college / grad school + degrees), work, interests, family ties, and notes. Each section auto-hides when empty.
- **Click a photo** to open a fullscreen lightbox.
- **Cantonese pronunciation** — 🔊 button next to Chinese names and the relationship-finder Cantonese result. Uses your browser's built-in speech engine (best on Safari macOS / iOS).
- **Search** by name *or* attribute — try `town:Seattle`, `college:Cornell`, `job:Google`, or just type a name. Aliases like `school:`, `hs:`, `hobby:` work too.
- **Birthday calendar** (top-left button) — month grid with everyone's birthdays dotted; click a day to see who, click a name to jump to them in the tree.
- **Relationship finder** (top-left button) — pick any two relatives, get what one calls the other in English and Cantonese (with Jyutping). Handles paternal vs. maternal, elder vs. younger, in-laws, 堂 vs. 表 cousins, sibling numeric ranking (大哥 / 二哥 / 三哥 …) when birth order is known, plus dedicated terms for in-law aunts/uncles (伯娘 / 嬸嬸 / 姑丈 / 舅母 / 姨丈) and cousin spouses (堂嫂 / 表姐夫 …). Pets resolve to "*[owner-relation]*'s pet" / *X 嘅寵物*.
- **Family map** (top-left button) — Leaflet world map with a pin per relative, geocoded from `current_town` (or pinned manually via `coords`).
- **Mini-map** in the bottom-left — click or drag to navigate the tree.
- **Light / dark mode** toggle in the header (dark by default; choice is remembered).
- **Mobile-first responsive** — side panel and tool windows open full-screen on phones; sticky headers keep the close button visible while scrolling.

## Visual encoding

- Outlined cards — rust = Lui side · teal = Shum side · gold = immediate family · warm brown = pet
- Card body fill — slate blue = male · dusty rose = female (family-chart defaults; surfaced in legend)
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

### A few conventions worth knowing

- **Order in `rels.children` matters.** Cantonese kinship terms differ by birth-order (姨媽 = older maternal aunt, 阿姨 = younger), so list children oldest first. The kinship engine uses birth-year if both people have one, then falls back to this list order.
- **Always traditional Chinese**, never simplified — this is a Cantonese-leaning family. e.g. write 龍 not 龙, 國 not 国, 學 not 学.
- **Interests** is a comma-separated string; the renderer auto-capitalizes the first word of each item, so casing in the JSON doesn't matter.
- **Photos** should be square-cropped on the face, ~400px, JPEG. Avatars render circular at 72px in the side panel and on map pins.

## Stack

Vite + React + TypeScript, [family-chart](https://github.com/donatso/family-chart) for tree rendering. Pure static SPA — no backend.
