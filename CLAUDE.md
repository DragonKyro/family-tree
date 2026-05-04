# family-tree

An interactive family tree for the Lui + Shum families.

## Stack

- Vite + React 18 + TypeScript
- [family-chart](https://github.com/donatso/family-chart) (d3-based) for tree rendering
- JSON data file committed to the repo — no backend

## Layout

```
src/
  main.tsx                 # React entry
  App.tsx                  # layout: tree canvas + side panel + search
  types.ts                 # Person + shared types
  data/
    family.json            # source of truth for the tree
  lib/
    familyData.ts          # load + search helpers
  components/
    FamilyTree.tsx         # family-chart renderer (useEffect wrapper)
    DetailsPanel.tsx       # info panel for the selected person
    SearchBox.tsx          # name search that focuses the tree
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

- `npm run dev` — start Vite on localhost:5173
- `npm run build` — typecheck + production bundle into `dist/`
- `npm run preview` — serve the built bundle locally
- `npm run typecheck` — tsc without emitting

## Conventions

- Data edits go in `src/data/family.json`. IDs are opaque strings (`p1`, `p2`, ...); once assigned, never reuse.
- Photos live in `public/photos/` and are referenced as `/photos/<file>`.
- No automated tests yet — verify by running `npm run dev` and clicking through.
