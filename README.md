# Demo

A light, cream-toned showcase built around one line: **Your Future Website.**

It's a static site — plain HTML, CSS and ES modules, no runtime dependencies, no
tracking. Two things live side by side:

1. **Four style directions** — hand-written sample homepages showing the range of
   the layout system.
2. **One page per business** — a full homepage for each of the 25 businesses on
   the prospect list, each at its own address, reachable from a **Businesses**
   button in the top bar.

> Business names come from `Website.xlsx` (the prospect list). Everything else —
> prices, hours, reviews, phone numbers, photos — is invented placeholder
> content, and the images are generated SVG placeholders.

## Pages

| Page | Business | Theme |
| --- | --- | --- |
| `index.html` | The showcase: hero, marquee, four style demos, **all 25 businesses**, what's included, closing band | — |
| `businesses/index.html` | The picker: every business by trade, with a search box. This is what the **Businesses** button opens | — |
| `sites/maison/` | Maison Crème — French bistro | `bistro` (brick) |
| `sites/daily-grind/` | The Daily Grind — café & bakery | `cafe` (sage) |
| `sites/ridgeline/` | Ridgeline Plumbing — plumbers & gas fitters | `trade` (slate blue) |
| `sites/alder/` | Alder Street Market — fruit, veg & pantry | `grocery` (green) |

Those four are the style directions. They are hand-written, they use the plain
defaults, and none of the layout variants below apply to them.

### The 25 business demos

Generated from `businesses.mjs`, one folder each:

| Trade | Count | Pages |
| --- | --- | --- |
| Restaurants & cafés | 8 | `malan-wok` · `flavrhub` · `yuzu-norwest` · `elena-ristorante` · `kn-cafe-pizza` · `pista-house` · `sushi-culture` · `king-of-the-castle` |
| Plumbers | 8 | `cls-plumbing` · `rodman-plumbing` · `core-plumbing-gas` · `plumbers-today` · `plumbers-2-you` · `we-plumb` · `rvf-plumbing` · `tmw-plumbing` |
| Electricians | 9 | `warran-electrical` · `paul-singh-electrical` · `pulse-mobile-auto-electrics` · `onetek-electrical` · `24-7-electrician-baulkham-hills` · `hillz-electronics-security` · `watts-new-electrical` · `jvr-auto-electrics` · `hills-electrical-express` |

The spreadsheet lists *Rodman Plumbing Pty Ltd* twice; it appears here once.

## No two pages look alike

Each business gets its own combination of **hero**, **list layout**, **gallery
layout**, **section order** and **accent palette** — 5 × 3 × 4 arrangements plus
the order swap, paired with 16 themes. The build script asserts that no two
businesses share a combination, so the variety can't quietly collapse when
someone edits the table.

| Axis | Options |
| --- | --- |
| Hero | `split` · `splitLeft` · `center` · `full` (full-bleed image behind a panel) · `offset` (image sits low, stat card hangs off its edge) |
| List | `columns` (two-column menu) · `rows` (numbered single column) · `cards` (paper tiles with a hover lift) |
| Gallery | `wall` · `duo` · `mosaic` · `strip` |
| Order | menu/services first, or the gallery first |
| Accent | 16 themes, from chilli red for the wok kitchen to slate blue for the plumber |

## Editing the content

Everything is generated from one table, so edit `businesses.mjs` and re-run:

```bash
node build-sites.mjs
```

That rewrites all 25 pages, regenerates `businesses/index.html`, and injects the
card grid into `index.html`, between marker comments:

```html
<!-- businesses:grid ... -->   <!-- /businesses:grid -->
```

**Don't hand-edit inside those markers** — the next run overwrites them. The
generator refuses to run if the markers are missing. To check whether the
committed output still matches the table: `node build-sites.mjs --check`.

The output is committed, so **Vercel runs no build step** — that script is a
maintenance convenience, not part of deploying.

To add a business, add an entry to `BUSINESSES`, add a matching line to
`LAYOUTS` in `build-sites.mjs` with an unused combination, and re-run. The
script fails loudly on a missing layout, a duplicate slug, or a repeated look.

## One deliberate default: the business pages are not indexable

Each generated page carries `<meta name="robots" content="noindex, nofollow">`.
The pages wear real business names but carry invented prices, hours and contact
details, and it would be unfair to those businesses (and misleading to their
customers) to have that content rank in search results. **Delete that line from
the generated pages if you want them indexed** — then remove it from the
generator too, or the next build puts it back.

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

| Setting | Value |
| --- | --- |
| Framework Preset | **Other** |
| Root Directory | `./` — leave as-is |
| Build Command | *empty* (turn **Override** off) |
| Output Directory | *empty* (turn **Override** off) |
| Install Command | *empty* (turn **Override** off) |
| Environment Variables | none |

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
├── styles.css          design system: showcase, business cards, picker page
├── app.js              reveals, sticky header, headline, preview scaling,
│                       deferred previews, picker search, card filters
├── businesses.mjs      the prospect list: 25 businesses, themes, trade defaults
├── build-sites.mjs     generator for the 25 pages, the picker page and the
│                       showcase card grid
├── businesses/         the picker page (generated)
├── demo-site.css       shared stylesheet for every demo page, incl. the variants
├── demo-site.js        reveals, sticky bar, scrolling strip, sample form
├── vercel.json         static deploy config
├── sites/              29 one-page sites (4 style directions + 25 businesses)
└── assets/             generated SVG placeholders (no stock photos needed)
```

## Notes on the moving parts

- **The previews are real pages**, not screenshots. Each card holds an `<iframe>`
  rendering the demo at 1440px wide and scaled to fit. The 25 business previews
  are built *after* their card comes near the viewport — a tinted placeholder
  frame stands in until then — so the showcase never fires 25 page loads at once.
  The iframes are inert (no pointer events, not focusable).
- **The Businesses button is a link, not a dropdown.** Twenty-five names in a
  menu inside a fixed header is a wall of text that shoves the page around on
  narrow screens, so it goes to `businesses/` instead: full width, a line per
  name, searchable as you type, and shareable as a URL. On a phone the header
  keeps `Demos` and `Businesses` and drops the duplicate call to action.
- **Animation** is CSS transitions plus `IntersectionObserver`; nothing animates
  on a timer and nothing blocks rendering.
- **`prefers-reduced-motion`** is respected everywhere — reveals resolve to their
  final state and looping animations stop.
- **Placeholder art is vector**, so it stays crisp at any size and the whole thing
  ships in a few kilobytes.

## Swapping in real content

For a business's page: replace the copy in `businesses.mjs`, re-run the
generator, and drop real photography into `assets/` (keeping the filenames).
For a style direction: edit the `sites/*/index.html` directly and change
`data-theme` on `<body>` if you want a different accent. No other code changes.
