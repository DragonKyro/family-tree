# family-tree

Interactive family tree for the Lui + Shum families. Pure static SPA — no backend, no editing UI on the live site. Data lives in [`data/family.json`](data/family.json) and is bundled at build time. Deployed to GitHub Pages at https://dragonkyro.github.io/family-tree/ on every push to `main` via [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

## Stack

- Vite + React 18 + TypeScript
- [family-chart](https://github.com/donatso/family-chart) (d3-based) for tree rendering

## Features (live)

- Pan / zoom tree; clicking a card focuses the side panel, smoothly re-centers the tree, and auto-expands the side panel if it's collapsed
- Side panel sections, each gated to disappear when empty:
  - **Header:** avatar (clickable → fullscreen lightbox) or initials placeholder; name; alias line (`"nickname" · 中文名` with 🔊 pronunciation button on the Chinese name); subtitle (date range · live age · 📍 town)
  - **Personal:** pronouns / sex / sexuality / religion / languages / MBTI / relationship status (each emoji-prefixed)
  - **Born under:** zodiac + Chinese zodiac (CNY-aware) + element + birthstone
  - **Contact:** phone / email / 12 social platforms (Instagram, Facebook, LinkedIn, X, Threads, Bluesky, TikTok, YouTube, Snapchat, GitHub, Discord, WeChat). Bare handles auto-link to profile URLs; full URLs pass through; Discord/WeChat shown as plain text.
  - **Education / Work / Interests / Family / Notes**
- **Theme toggle** in header — dark by default, light opt-in, persisted to `localStorage`
- **Search** in header — matches name + town/school/job/interests/email/phone/notes; supports `field:value` prefixes (`town:`, `school:`, `college:`, `job:`, `role:`, `branch:`, `interest:`, `email:`, `phone:`, `notes:`, plus aliases like `hs`, `university`, `employer`, `hobby`)
- **MiniMap** in bottom-left of tree area — viewport rect tracks main tree; click or drag to navigate
- **Calendar tool**: month grid with everyone's birthdays as dots; navigation by month/year/Today; click a day to list whose birthday it is
- **Relationship finder**: pick two people, get what one calls the other in English + Cantonese with Jyutping. 🔊 button speaks the Cantonese via the browser's `SpeechSynthesis` (yue-HK voice).
- **Family map**: lazy-loaded Leaflet world map with one pin per relative, geocoded from `current_town` (or `coords` override); pins use the avatar (resolved through `resolvePhotoUrl()` so the GH Pages base path applies).
- All three tool windows are mutually exclusive via `tool` state in [App.tsx](src/App.tsx) (`null | 'calendar' | 'relationship' | 'map'`).
- **Visual encoding:** outlined cards — rust = Lui side, teal = Shum side, gold = immediate family, warm brown = pet (`is_pet: true`). Card body fill = slate blue (male) / dusty rose (female) — family-chart defaults, surfaced in the legend. Deceased = card shaded + grayscaled. Marriage = solid rust line. Divorce = dashed red.
- **Mobile (≤700px):** side panel and all tool windows open full-screen (`100dvh`); app header is sticky; side-panel-top is sticky inside the panel scroll; close button is `position: fixed` so it stays visible regardless of scroll. URL-bar cutoff handled via `dvh`, not `vh`.

## Layout

```
data/
  family.json              # canonical source of truth; imported into the bundle

public/
  photos/                  # static photos served at /photos/<file>
  favicon.svg              # custom family-tree icon for browser tab

src/
  main.tsx                 # React entry
  App.tsx                  # layout + theme + active-tool state + holiday badge + responsive header
  types.ts                 # Person + all enums (Pronouns / Sex / Sexuality / MBTI / Religion / RelationshipStatus / SocialPlatform)
  lib/
    familyData.ts          # JSON load + tree transforms + photo URL helper (resolvePhotoUrl)
    formatters.ts          # date / phone display formatters + formatInterests (capitalize-each-item)
    astrology.ts           # zodiac, Chinese zodiac (CNY-aware), 5-element, birthstone, age
    kinship.ts             # English + Cantonese kinship label from two ids
    speech.ts              # Cantonese pronunciation via window.speechSynthesis (yue-HK)
    geocode.ts             # town → [lat, lng] for the map; cached
    holidays.ts            # upcoming-holiday lookup for the header badge
  components/
    FamilyTree.tsx         # family-chart renderer (useEffect wrapper); exports LayoutNode
    DetailsPanel.tsx       # info panel: header / Personal / Born under / Contact (incl. social) / Education / Work / Interests / Family / Notes
    LightboxImage.tsx      # fullscreen avatar viewer
    SearchBox.tsx          # field-aware name + attribute search
    MiniMap.tsx             # bottom-left thumbnail; viewport rect; click + drag
    CalendarPanel.tsx       # birthday month grid (non-modal tool window)
    RelationshipPanel.tsx   # two name pickers + kinship result + 🔊 (non-modal tool window)
    MapPanel.tsx            # lazy-loaded Leaflet world map of relatives' towns
  styles/
    app.css                # all CSS; CSS vars; dark default, light via [data-theme='light']; responsive ≤700px
```

## Data model

One record per person. `id` is stable and referenced by `rels`.

```ts
{
  id: "p1",
  data: {
    first_name: "Jane",
    last_name: "Lui",
    birthday: "1950-04-12",          // YYYY-MM-DD, optional
    deathday: "",                     // optional
    deceased: false,                  // shows † even without a date
    divorced: false,                  // marks spouse-link from this person dashed-red
    is_pet: false,                    // dogs etc; treated as children of their owners
    gender: "F",                      // "M" | "F"
    avatar: "/photos/jane.jpg",       // path under public/, optional
    branch: "shum",                   // "immediate" | "lui" | "shum" | "placeholder"
    notes: "",
    // Optional profile fields (each can be omitted):
    phone, email,
    high_school, high_school_grad_year,
    college, college_grad_year, college_degree,
    grad_school, grad_school_grad_year, grad_school_degree,
    current_town, current_job, current_role, interests,
    chinese_name,                     // free text, rendered in muted alias line under English name
    nickname,                         // free text, rendered in quotes in the alias line
    languages,                        // string[] — joined by ', ' on display
    religion,                         // 'Christian' | 'Catholic' | 'Buddhist' | 'Taoist' | 'Muslim' | 'Jewish' | 'Hindu' | 'Sikh' | 'Atheist' | 'Agnostic' | 'None'
    pronouns,                         // 'he/him' | 'she/her' | 'they/them' | 'he/they' | 'she/they' | 'any'
    sex,                              // 'male' | 'female' | 'intersex'  (independent of `gender`, which drives card color + kinship)
    sexuality,                        // 'straight' | 'gay' | 'lesbian' | 'bisexual' | 'pansexual' | 'asexual' | 'queer'
    mbti,                             // 'ISTJ' | 'ISFJ' | … (any of the 16 MBTI codes, uppercase)
    relationship_status,              // 'single' | 'situationship' | 'dating' | 'engaged' | 'married' | 'divorced' | 'widowed'
    social: {                          // optional; any subset of supported keys
      instagram: "kyle31412",          // bare handle; @ stripped, auto-linked
      linkedin:  "kyle-lui",           // → linkedin.com/in/kyle-lui
      // also: facebook, twitter, threads, bluesky, tiktok,
      //       youtube, snapchat, github, discord, wechat
      //       (discord/wechat have no profile URL — handle shown as plain text)
      // full URLs (https://…) are passed through as-is
    }
  },
  rels: {
    father: "p2",
    mother: "p3",
    spouses: ["p4"],
    children: ["p5", "p6"]            // ordered by birth — used for elder/younger inference
  }
}
```

family-chart consumes this shape directly. Keep the file sorted loosely by generation, oldest first, so diffs are readable.

## Conventions

- Photos go in `public/photos/`, referenced as `/photos/<file>` in `avatar`. Vite copies `public/` into `dist/` at build, and `resolvePhotoUrl()` ([src/lib/familyData.ts](src/lib/familyData.ts)) prepends the GH Pages base path automatically. Use it for **any** image src that starts with `/photos/` — the map pins do, the side panel does, the lightbox does.
- `vite.config.ts` sets `base: '/family-tree/'` for prod builds — required because GH Pages serves under that subpath.
- IDs are opaque strings; once assigned, never reuse.
- **Always traditional Chinese characters** (HK convention). Watch for simplified leaks: 龙→龍, 国→國, 华→華, 学→學, 长→長, 张→張, 陈→陳, 礼→禮, 义→義, 书→書. Both `chinese_name` data and Cantonese kinship terms must be traditional.
- **`rels.children` is birth-ordered, oldest first.** Cantonese kinship distinguishes elder/younger (姨媽 vs 阿姨, 伯父 vs 叔叔, 大哥 vs 二哥), and the engine uses this list as the fallback when birthdays are missing.
- **Interests** stored as a comma-separated string; [`formatInterests()`](src/lib/formatters.ts) capitalizes the first word of each item on render so JSON casing doesn't leak.
- **Janet Shum** is unhooked from her parents' `children` list at render time in [`buildTreeData()`](src/lib/familyData.ts) so she renders only as Alex's spouse-card; her parental link is overlaid as a custom bridge in [`drawBridgeLinks()`](src/components/FamilyTree.tsx) extending the existing crossbar leftward to her position.
- **Link consolidation:** [`consolidateProgenyLinks()`](src/components/FamilyTree.tsx) hides family-chart's per-child paths and draws one clean fan-out per parent group (one parent drop, one horizontal crossbar, one per-child drop) so corners don't visibly stack with overlapping curves.
- **Tool windows:** non-modal panels anchored to bottom-right of the tree area; mutually exclusive via `tool` state in [App.tsx](src/App.tsx) (`null | 'calendar' | 'relationship' | 'map'`). Buttons live in top-left of tree area. On mobile they open full-screen.
- **Kinship math** ([src/lib/kinship.ts](src/lib/kinship.ts)): BFS through `rels.father`/`rels.mother` builds ancestor maps for both people; the LCA's `(steps_up, steps_down)` plus side info (first step via father vs mother) and elder/younger (birth year first, else `rels.children` order) drives a lookup of English + Cantonese labels. The engine specifically handles:
  - **Sibling numeric ranking** — 大哥 / 二哥 / 三哥 … computed from rank among speaker's older same-gender siblings; falls back to plain 哥哥 / 姐姐 when ambiguous
  - **Aunt/uncle by marriage** — dedicated terms 伯娘 / 嬸嬸 / 姑丈 / 舅母 / 姨丈 (not just `<aunt>(配偶)`)
  - **Cousin's spouse** — gendered 堂嫂 / 堂弟婦 / 堂姐夫 / 堂妹夫 (and 表 variants); 堂/表 inherited from the blood cousin's term, suffix from the in-law's gender
  - **Spouse's sibling** — split by speaker's side: 大舅/舅仔/大姨/姨仔 (husband perspective) vs 大伯/叔仔/姑奶/姑仔 (wife perspective), each split by elder/younger
  - **Sibling's spouse** — split by elder/younger: 阿嫂 / 弟婦 / 姐夫 / 妹夫
  - **First cousin once removed** — direction-aware: 表伯/表叔/表姑/表舅/表姨 (parent's cousin, with paternal/maternal split) vs 表姪/表外甥 (cousin's child)
  - **Great-aunt/uncle** — paternal (姑婆 / 伯公 / 叔公) vs maternal (姨婆 / 舅公) split
  - **Pets** (`is_pet: true`) — resolved as "*[owner-relation]*'s pet" / *X 嘅寵物* via recursive lookup to the owner; pet's owner just sees "pet" / 寵物
- **Cantonese pronunciation** ([src/lib/speech.ts](src/lib/speech.ts)): browser-only via `window.speechSynthesis` with `lang: 'yue-HK'`, voice scored to prefer explicit Cantonese (yue-*, Sin-ji, zh-HK). Multi-variant Cantonese strings (e.g. `姨媽 / 阿姨`) speak only the first variant. No backend, no audio files.
- **Astrology:** zodiac from month/day; Chinese zodiac uses a CNY date table (1900–2050) so people born in early January get the previous year's animal; element rotates every 2 years (Metal/Water/Wood/Fire/Earth, popular color: Gold/Black/Green/Red/Yellow); birthstone by birth month with a per-stone emoji.
- **Theme:** dark is the CSS default (`:root { ... }`); light is opt-in via `:root[data-theme='light']`. Choice persists to `localStorage['family-tree-theme']`.
- **Responsive layout:** the `.app` grid uses `height: 100dvh` (with `100vh` fallback) so iOS Safari URL-bar overlap doesn't clip the header. `@media (max-width: 700px)` collapses to single-column with the side panel and all tool windows opening as full-screen overlays. `.side-panel-top` is `position: sticky` inside the scroll, and `.panel-close` is `position: fixed` so the close button stays accessible at all times.

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173
- `npm run build` — typecheck + production bundle into `dist/`
- `npm run preview` — serve the built bundle locally
- `npm run typecheck` — tsc without emitting
