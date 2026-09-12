# Demo

A light, cream-toned showcase built around one line: **Your Future Website.**

It's a static site — plain HTML, CSS and ES modules, no build step, no
dependencies, no tracking. The landing page presents four sample small-business
homepages and previews each one live inside a miniature browser frame.

> Everything here is placeholder content. Names, prices, addresses and photos
> are invented, and the images are generated SVG placeholders.

## Pages

| Page | Business | Theme |
| --- | --- | --- |
| `index.html` | The showcase: hero, scrolling strip, four demo previews, what's included, closing band | — |
| `sites/maison/` | Maison Crème — French bistro | `bistro` (brick) |
| `sites/daily-grind/` | The Daily Grind — café & bakery | `cafe` (sage) |
| `sites/ridgeline/` | Ridgeline Plumbing — plumbers & gas fitters | `trade` (slate blue) |
| `sites/alder/` | Alder Street Market — fruit, veg & pantry | `grocery` (green) |

The four deliberately cover different kinds of local business — two food, two
not — so the same layout can be judged against a service business and a shop.

Each demo is a complete one-page site: sticky header, full-height hero, scrolling
fact strip, a list section (menu / services / shelves), photo wall, hours and
contact plus a sample form, and a footer. They all share `demo-site.css` and
re-skin it through `data-theme` on `<body>`, so they read as different businesses
while keeping the same warm cream palette.

## Run it locally

Any static file server works. From this folder:

```bash
npx serve .
# or
python -m http.server 8080
```

Then open the printed URL. Opening `index.html` straight off disk mostly works,
but the miniature previews need `http://`, so use a server.

## Deploy to Vercel

This folder is its own repository, so on Vercel **the project root is the site** —
there is no subfolder to point at and no build to run.

When you import the repo, use these settings:

| Setting | Value |
| --- | --- |
| Framework Preset | **Other** |
| Root Directory | `./` — leave as-is |
| Build Command | *empty* (turn **Override** off) |
| Output Directory | *empty* (turn **Override** off) |
| Install Command | *empty* (turn **Override** off) |
| Environment Variables | none |

Vercel then serves the files exactly as they are. `vercel.json` adds trailing
slashes and a long cache header for `assets/`.

From the CLI instead:

```bash
npm i -g vercel   # once
vercel            # preview deploy
vercel --prod     # production deploy
```

Either way the result is a plain static site — no serverless functions, no
runtime, nothing to keep warm.

## Files

```
Demo/
├── index.html          showcase / "Your Future Website"
├── styles.css          design system for the showcase
├── app.js              reveals, sticky header, staged headline, preview scaling
├── demo-site.css       shared stylesheet for the four demo pages
├── demo-site.js        reveals, sticky bar, scrolling strip, sample form
├── vercel.json         static deploy config
└── assets/             generated SVG placeholders (no stock photos needed)
```

## Notes on the moving parts

- **Animation** is all CSS transitions plus an `IntersectionObserver`; nothing
  animates on a timer and nothing blocks rendering.
- **`prefers-reduced-motion`** is respected everywhere — reveals resolve to their
  final state and looping animations stop.
- **The previews are real pages.** Each card holds an `<iframe>` rendering the
  demo at 1440px wide and scaled to fit its frame, so what you see in the grid is
  the actual site, not a screenshot. The iframes are inert (no pointer events, not
  focusable) and load lazily; the "Open" link loads the real page.
- **Placeholder art is vector**, so it stays crisp at any size and the whole thing
  ships in a few kilobytes.

## Swapping in real content

Replace the copy in the relevant `sites/*/index.html`, drop real photography into
`assets/` (keeping the filenames), and change `data-theme` on `<body>` if you want
a different accent — the options are `bistro`, `cafe`, `trade` and `grocery`. No
other code needs to change.

To add a fifth business, copy any `sites/` folder, edit the copy and the
`data-theme`, then add one card to `index.html` alongside the others. The card is
a miniature browser frame whose `<iframe>` points at the new page.
