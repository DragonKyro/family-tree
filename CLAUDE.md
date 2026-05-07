# family-tree

Interactive family tree for the Lui + Shum families. Pure static SPA — no backend, no editing UI on the live site. Data lives in [`data/family.json`](data/family.json) and is bundled at build time. Deployed to GitHub Pages at https://dragonkyro.github.io/family-tree/ on every push to `main` via [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

## Stack

- Vite + React 18 + TypeScript
- [family-chart](https://github.com/donatso/family-chart) (d3-based) for tree rendering

## Features (live)

- Pan / zoom tree; clicking a card focuses the side panel **and** smoothly re-centers the tree on that person
- Side panel: avatar (or initials), age (live; "X at death" for deceased), zodiac + Chinese zodiac with element + birthstone, contact, education (HS / college / grad school + grad years + degrees), work, interests, family ties, notes
- **Theme toggle** in header — dark by default, light opt-in, persisted to `localStorage`
- **Search** in header — matches name + town/school/job/interests/email/phone/notes; supports `field:value` prefixes (`town:`, `school:`, `college:`, `job:`, `role:`, `branch:`, `interest:`, `email:`, `phone:`, `notes:`, plus aliases like `hs`, `university`, `employer`, `hobby`)
- **MiniMap** in bottom-left of tree area — viewport rect tracks main tree; click or drag to navigate
- **Calendar tool** (top-left button → non-modal panel in bottom-right): month grid with everyone's birthdays as dots; navigation by month/year/Today; click a day to list whose birthday it is
- **Relationship finder** (top-left button → non-modal panel in bottom-right): pick two people, get what one calls the other in English + Cantonese with Jyutping. Mutually exclusive with the calendar.
- **Visual encoding:** outlined cards — rust = Lui side, teal = Shum side, gold = immediate family, warm brown = pet (`is_pet: true`). Deceased = card shaded + grayscaled (no dagger needed). Marriage = solid rust line. Divorce = dashed red line.

## Layout

```
data/
  family.json              # canonical source of truth; imported into the bundle

public/
  photos/                  # static photos served at /photos/<file>
  favicon.svg              # custom family-tree icon for browser tab

src/
  main.tsx                 # React entry
  App.tsx                  # layout + theme + active-tool state
  types.ts                 # Person + shared types
  lib/
    familyData.ts          # JSON load + tree transforms + photo URL helper
    formatters.ts          # date / phone display formatters
    astrology.ts           # zodiac, Chinese zodiac (CNY-aware), 5-element, birthstone, age
    kinship.ts             # English + Cantonese kinship label from two ids
  components/
    FamilyTree.tsx         # family-chart renderer (useEffect wrapper); exports LayoutNode
    DetailsPanel.tsx       # info panel for the selected person
    SearchBox.tsx          # field-aware name + attribute search
    MiniMap.tsx            # bottom-left thumbnail; viewport rect; click + drag
    CalendarPanel.tsx      # birthday month grid (non-modal tool window)
    RelationshipPanel.tsx  # two name pickers + kinship result (non-modal tool window)
  styles/
    app.css                # all CSS; CSS vars; dark default, light via [data-theme='light']
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

- Photos go in `public/photos/`, referenced as `/photos/<file>` in `avatar`. Vite copies `public/` into `dist/` at build, and `resolvePhotoUrl()` ([src/lib/familyData.ts](src/lib/familyData.ts)) prepends the GH Pages base path automatically.
- `vite.config.ts` sets `base: '/family-tree/'` for prod builds — required because GH Pages serves under that subpath.
- IDs are opaque strings; once assigned, never reuse.
- **Janet Shum** is unhooked from her parents' `children` list at render time in [`buildTreeData()`](src/lib/familyData.ts) so she renders only as Alex's spouse-card; her parental link is overlaid as a custom bridge in [`drawBridgeLinks()`](src/components/FamilyTree.tsx) extending the existing crossbar leftward to her position.
- **Link consolidation:** [`consolidateProgenyLinks()`](src/components/FamilyTree.tsx) hides family-chart's per-child paths and draws one clean fan-out per parent group (one parent drop, one horizontal crossbar, one per-child drop) so corners don't visibly stack with overlapping curves.
- **Tool windows:** non-modal panels anchored to bottom-right of the tree area; mutually exclusive via `tool` state in [App.tsx](src/App.tsx) (`null | 'calendar' | 'relationship'`). Buttons live in top-left of tree area.
- **Kinship math:** BFS through `rels.father`/`rels.mother` builds ancestor maps for both people; the lowest common ancestor's `(steps_up, steps_down)` plus side info (first step via father vs mother) and elder/younger (from birth year, else child order in `rels.children`) feed a lookup of English + Cantonese labels in [src/lib/kinship.ts](src/lib/kinship.ts). In-laws use a "via spouse" detour with hand-mapped Cantonese for parent / child / sibling-in-law roles.
- **Astrology:** zodiac from month/day; Chinese zodiac uses a CNY date table (1900–2050) so people born in early January get the previous year's animal; element rotates every 2 years (Metal/Water/Wood/Fire/Earth, popular color: Gold/Black/Green/Red/Yellow); birthstone by birth month with a per-stone emoji.
- **Theme:** dark is the CSS default (`:root { ... }`); light is opt-in via `:root[data-theme='light']`. Choice persists to `localStorage['family-tree-theme']`.

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173
- `npm run build` — typecheck + production bundle into `dist/`
- `npm run preview` — serve the built bundle locally
- `npm run typecheck` — tsc without emitting
