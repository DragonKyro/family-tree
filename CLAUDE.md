# family-tree

Interactive family tree for the Lui + Shum families. Pure static SPA — no backend, no editing UI. Data lives in [`data/family.json`](data/family.json) and is bundled at build time. Deployed to GitHub Pages at https://dragonkyro.github.io/family-tree/ on every push to `main` via [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

## Stack

- Vite + React 18 + TypeScript
- [family-chart](https://github.com/donatso/family-chart) (d3-based) for tree rendering

## Layout

```
data/
  family.json              # source of truth; imported into the SPA bundle

public/
  photos/                  # static photos served at /photos/<file>

src/
  main.tsx                 # React entry
  App.tsx                  # layout: tree canvas + side panel + search
  types.ts                 # Person + shared types
  lib/
    familyData.ts          # JSON load + tree transforms + photo URL helper
    formatters.ts          # date/phone display formatters
  components/
    FamilyTree.tsx         # family-chart renderer (useEffect wrapper)
    DetailsPanel.tsx       # info panel for the selected person
    SearchBox.tsx          # name search
  styles/
    app.css
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
    divorced: false,                  // marks any spouse-link from this person dashed-red
    gender: "F",                      // "M" | "F"
    avatar: "/photos/jane.jpg",       // path under public/, optional
    branch: "shum",                   // "immediate" | "lui" | "shum" | "placeholder"
    notes: "",
    // Optional profile fields:
    phone, email, high_school, high_school_grad_year,
    college, college_grad_year, current_town, current_job,
    current_role, interests
  },
  rels: {
    father: "p2",
    mother: "p3",
    spouses: ["p4"],
    children: ["p5", "p6"]            // ordered by birth
  }
}
```

family-chart consumes this shape directly. Keep the file sorted loosely by generation, oldest first, so diffs are readable.

## Conventions

- Photos go in `public/photos/`, referenced as `/photos/<file>` in `avatar`. Vite copies `public/` into `dist/` at build, and `resolvePhotoUrl()` ([src/lib/familyData.ts](src/lib/familyData.ts)) prepends the GH Pages base path automatically.
- `vite.config.ts` sets `base: '/family-tree/'` for prod builds — required because GH Pages serves under that subpath.
- IDs are opaque strings; once assigned, never reuse.
- Janet Shum is unhooked from her parents' `children` list at render time in [`buildTreeData()`](src/lib/familyData.ts) so she renders only as Alex's spouse-card; her parental link is drawn as a custom bridge in [`FamilyTree.tsx`](src/components/FamilyTree.tsx).

## Commands

- `npm run dev` — Vite dev server on http://localhost:5173
- `npm run build` — typecheck + production bundle into `dist/`
- `npm run preview` — serve the built bundle locally
- `npm run typecheck` — tsc without emitting
