#!/usr/bin/env node
/* ==========================================================================
   build-sites.mjs — generates the per-business demo pages.

   Reads `businesses.mjs` and writes:
     sites/<slug>/index.html      one complete homepage per business
     index.html                   the nav "Businesses" menu + the card grid,
                                  injected between comment markers

   The output is plain static HTML, committed to the repo. There is no build
   step at deploy time — Vercel serves the files exactly as they are. This
   script only exists so that 25 consistent pages can be edited from one table.

   Usage:
     node build-sites.mjs            regenerate everything
     node build-sites.mjs --check    report whether the output is up to date
   ========================================================================== */

import { readFile, writeFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BUSINESSES, CATEGORIES, THEMES, PLACEHOLDER } from './businesses.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITES = join(HERE, 'sites');
const INDEX = join(HERE, 'index.html');

/* --------------------------------------------------------------------------
   Layout assignment. Every business gets its own combination, and the script
   refuses to run if two of them collide — so "no two pages look alike" is
   enforced rather than hoped for.

     hero     split | splitLeft | center | full | offset
     list     columns | rows | cards
     gallery  wall | duo | mosaic | strip
     order    normal (list, then gallery) | swapped
     band     afterHero | mid
   -------------------------------------------------------------------------- */
const LAYOUTS = {
  /* food */
  'malan-wok': { hero: 'full', list: 'rows', gallery: 'strip', order: 'normal', band: 'mid' },
  'flavrhub': { hero: 'splitLeft', list: 'cards', gallery: 'duo', order: 'swapped', band: 'afterHero' },
  'yuzu-norwest': { hero: 'center', list: 'columns', gallery: 'mosaic', order: 'normal', band: 'mid' },
  'elena-ristorante': { hero: 'offset', list: 'rows', gallery: 'duo', order: 'normal', band: 'afterHero' },
  'kn-cafe-pizza': { hero: 'split', list: 'cards', gallery: 'wall', order: 'swapped', band: 'mid' },
  'pista-house': { hero: 'full', list: 'columns', gallery: 'mosaic', order: 'swapped', band: 'mid' },
  'sushi-culture': { hero: 'center', list: 'rows', gallery: 'strip', order: 'swapped', band: 'afterHero' },
  'king-of-the-castle': { hero: 'splitLeft', list: 'columns', gallery: 'wall', order: 'normal', band: 'afterHero' },

  /* plumbing */
  'cls-plumbing': { hero: 'split', list: 'columns', gallery: 'wall', order: 'normal', band: 'afterHero' },
  'rodman-plumbing': { hero: 'offset', list: 'cards', gallery: 'mosaic', order: 'swapped', band: 'afterHero' },
  'core-plumbing-gas': { hero: 'center', list: 'columns', gallery: 'duo', order: 'normal', band: 'mid' },
  'plumbers-today': { hero: 'full', list: 'rows', gallery: 'strip', order: 'swapped', band: 'afterHero' },
  'plumbers-2-you': { hero: 'splitLeft', list: 'cards', gallery: 'mosaic', order: 'normal', band: 'afterHero' },
  'we-plumb': { hero: 'center', list: 'rows', gallery: 'wall', order: 'swapped', band: 'mid' },
  'rvf-plumbing': { hero: 'split', list: 'rows', gallery: 'duo', order: 'swapped', band: 'mid' },
  'tmw-plumbing': { hero: 'offset', list: 'columns', gallery: 'strip', order: 'normal', band: 'mid' },

  /* electrical */
  'warran-electrical': { hero: 'split', list: 'cards', gallery: 'strip', order: 'normal', band: 'mid' },
  'paul-singh-electrical': { hero: 'center', list: 'cards', gallery: 'duo', order: 'swapped', band: 'afterHero' },
  'pulse-mobile-auto-electrics': { hero: 'full', list: 'cards', gallery: 'wall', order: 'normal', band: 'afterHero' },
  'onetek-electrical': { hero: 'splitLeft', list: 'rows', gallery: 'duo', order: 'swapped', band: 'mid' },
  '24-7-electrician-baulkham-hills': { hero: 'full', list: 'rows', gallery: 'wall', order: 'swapped', band: 'mid' },
  'hillz-electronics-security': { hero: 'center', list: 'cards', gallery: 'mosaic', order: 'normal', band: 'afterHero' },
  'watts-new-electrical': { hero: 'offset', list: 'cards', gallery: 'strip', order: 'swapped', band: 'afterHero' },
  'jvr-auto-electrics': { hero: 'splitLeft', list: 'rows', gallery: 'strip', order: 'normal', band: 'mid' },
  'hills-electrical-express': { hero: 'split', list: 'rows', gallery: 'mosaic', order: 'swapped', band: 'afterHero' },
};

/* Square placeholder art (800x800) vs wide (1200x800), for honest img dimensions. */
const SQUARE = new Set(['tools', 'pipes', 'plate-1', 'plate-2', 'plate-3', 'cable', 'light', 'camera', 'produce', 'market']);
const dims = (a) => (SQUARE.has(a) ? { w: 800, h: 800 } : { w: 1200, h: 800 });

const SHOT_CLASS = {
  wall: ['big', 'tall', '', ''],
  duo: ['big', '', '', 'wide'],
  mosaic: ['', '', '', ''],
  strip: ['', '', '', ''],
};

/* ------------------------------------------------------------------ helpers */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

const mark = (biz) => biz.short.trim()[0].toUpperCase();
const tint = (biz) => THEMES[biz.theme].accent;
const cat = (biz) => CATEGORIES[biz.category];

const hoursFor = (biz) => biz.hours || cat(biz).hours;
const whereFor = (biz) => {
  if (!biz.area) return cat(biz).contactWhere;
  return biz.category === 'food' ? `${biz.area} · dine in & takeaway` : `${biz.area} & surrounds`;
};
const mediaFor = (biz) => biz.media || { a: cat(biz).media, alt: 'a placeholder photograph' };

/* ------------------------------------------------------------- page pieces */

function navCta(biz) {
  const c = cat(biz);
  return biz.category === 'food'
    ? { href: c.ctaHref, label: c.ctaLabel }
    : { href: PLACEHOLDER.phoneHref, label: c.ctaLabel };
}

function heroSection(biz, L) {
  const c = cat(biz);
  const media = mediaFor(biz);
  const d = dims(media.a);
  const cta = navCta(biz);
  const secondary = biz.category === 'food'
    ? { href: `#${c.listId}`, label: 'Read the menu' }
    : { href: `#${c.listId}`, label: 'See what we do' };

  return `  <!-- ------------------------------------------------------------- hero -->
  <section class="hero-site hero-site--${L.hero}">
    <div class="shell-site hero-site__grid">
      <div>
        <p class="s-kicker">${esc(biz.kicker)}</p>
        <h1 class="reveal">${esc(biz.heading[0])}<br><em>${esc(biz.heading[1])}</em></h1>
        <p class="hero-site__lede reveal" style="--delay:100ms">
          ${esc(biz.lede)}
        </p>
        <div class="hero-site__actions reveal" style="--delay:180ms">
          <a class="s-btn" href="${attr(cta.href)}">${esc(cta.label)}</a>
          <a class="s-btn s-btn--ghost" href="${attr(secondary.href)}">${esc(secondary.label)}</a>
        </div>
        <ul class="hero-site__facts reveal" style="--delay:240ms">
${biz.facts.map((f) => `          <li>${esc(f)}</li>`).join('\n')}
        </ul>
      </div>

      <div class="hero-site__media reveal" style="--delay:120ms">
        <img src="../../assets/${media.a}.svg" alt="Placeholder: ${attr(media.alt)}" width="${d.w}" height="${d.h}">
        <div class="hero-site__badge">
          <strong>${esc(biz.rating.value)}</strong>
          <span>${esc(biz.rating.label)}</span>
        </div>
      </div>
    </div>
  </section>`;
}

function bandStrip(biz) {
  return `  <!-- -------------------------------------------------------- fact band -->
  <div class="band" aria-hidden="true">
    <div class="band__track">
${biz.band.map((b) => `      <span class="band__item">${esc(b)}</span>`).join('\n')}
    </div>
  </div>`;
}

function listSection(biz, L, alt) {
  const c = cat(biz);
  const items = biz.list.items.map((it) => `        <article class="menu-item">
          <h3>${esc(it.name)}${it.tag ? `<span class="menu-item__tag">${esc(it.tag)}</span>` : ''}</h3>
          <span class="price">${esc(it.price)}</span>
          <p>${esc(it.desc)}</p>
        </article>`).join('\n');

  return `  <!-- ${'-'.repeat(58)} ${c.listId} -->
  <section class="site-section list--${L.list}${alt ? ' site-section--alt' : ''}" id="${c.listId}">
    <div class="shell-site">
      <div class="site-head">
        <p class="s-kicker">${esc(biz.list.kicker)}</p>
        <h2 class="reveal">${esc(biz.list.title)}</h2>
        <p class="reveal" style="--delay:80ms">${esc(biz.list.lede)}</p>
      </div>

      <div class="menu-grid" data-cascade>
${items}
      </div>
    </div>
  </section>`;
}

function gallerySection(biz, L, alt) {
  const classes = SHOT_CLASS[L.gallery];
  const figures = biz.shots.map((shot, i) => {
    const d = dims(shot.a);
    const cls = classes[i] ? ` class="${classes[i]}"` : '';
    return `        <figure${cls}>
          <img src="../../assets/${shot.a}.svg" alt="Placeholder: ${attr(shot.c.toLowerCase())}" width="${d.w}" height="${d.h}">
          <figcaption>${esc(shot.c)}</figcaption>
        </figure>`;
  }).join('\n');

  return `  <!-- ${'-'.repeat(55)} gallery -->
  <section class="site-section gal--${L.gallery}${alt ? ' site-section--alt' : ''}" id="gallery">
    <div class="shell-site">
      <div class="site-head site-head--split">
        <div>
          <p class="s-kicker">${esc(biz.work.kicker)}</p>
          <h2 class="reveal">${esc(biz.work.title)}</h2>
        </div>
        <p class="reveal" style="--delay:80ms">${esc(biz.work.lede)}</p>
      </div>

      <div class="gallery-wall" data-cascade>
${figures}
      </div>
    </div>
  </section>`;
}

function visitSection(biz) {
  const c = cat(biz);
  const form = { ...c.form, ...(biz.form || {}) };
  const hours = hoursFor(biz);

  return `  <!-- ------------------------------------------------------------ visit -->
  <section class="site-section" id="visit">
    <div class="shell-site">
      <div class="site-head">
        <p class="s-kicker">${esc(biz.visitTitle)}</p>
        <h2 class="reveal">${esc(biz.heading[1])}</h2>
      </div>

      <div class="visit-grid">
        <div class="reveal">
          <dl>
            <div class="info-block">
              <dt>Where</dt>
              <dd>${esc(whereFor(biz))}</dd>
            </div>
            <div class="info-block">
              <dt>Phone</dt>
              <dd><a href="${PLACEHOLDER.phoneHref}">${PLACEHOLDER.phone}</a></dd>
            </div>
            <div class="info-block">
              <dt>Email</dt>
              <dd><a href="mailto:${PLACEHOLDER.email}">${PLACEHOLDER.email}</a></dd>
            </div>
          </dl>

          <div class="info-block" style="border-bottom: 0">
            <dt>Hours</dt>
            <dd>
              <div class="hours-list">
${hours.map(([k, v]) => `                <div class="hours-row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('\n')}
              </div>
            </dd>
          </div>
        </div>

        <form class="visit-form reveal" style="--delay:100ms">
          <h3>${esc(form.title)}</h3>
          <p>${esc(form.lede)}</p>
          <div class="field-row">
            <label>Your name<input type="text" name="name" placeholder="Sam Rivers" autocomplete="name"></label>
            <label>Phone<input type="tel" name="phone" placeholder="0400 000 000" autocomplete="tel"></label>
          </div>
          <label>${esc(form.extra.label)}<input type="text" name="${attr(form.extra.name)}" placeholder="${attr(form.extra.placeholder)}"></label>
          <label>${esc(form.note.label)}<textarea name="${attr(form.note.name)}" placeholder="${attr(form.note.placeholder)}"></textarea></label>
          <button class="s-btn" type="submit">Send the request</button>
          <p class="form-note" hidden></p>
        </form>
      </div>
    </div>
  </section>`;
}

function footer(biz) {
  const c = cat(biz);
  const cta = navCta(biz);
  return `  <div class="shell-site">
    <div class="site-foot__grid">
      <div>
        <a class="site-brand" href="./"><span class="site-brand__mark" aria-hidden="true">${esc(mark(biz))}</span> ${esc(biz.short)}</a>
        <p>A sample homepage, made to be walked through. Every price, number and photo on this page is placeholder content.</p>
      </div>
      <nav class="site-foot__links" aria-label="Footer">
${c.nav.map((n) => `        <a href="${attr(n.href)}">${esc(n.label)}</a>`).join('\n')}
        <a href="${attr(cta.href)}">${biz.category === 'food' ? 'Reserve' : 'Call us'}</a>
        <a href="../../businesses/">All the businesses</a>
      </nav>
    </div>
    <div class="site-foot__fine">
      <span>${esc(whereFor(biz))} · sample details</span>
      <span>Demo layout · placeholder content</span>
    </div>
  </div>`;
}

function pageFor(biz) {
  const L = LAYOUTS[biz.slug];
  const c = cat(biz);
  const theme = THEMES[biz.theme];
  const tintHex = theme.accent.replace('#', '');
  const midSections = L.order === 'swapped'
    ? [gallerySection(biz, L, false), listSection(biz, L, true)]
    : [listSection(biz, L, false), gallerySection(biz, L, true)];
  const band = bandStrip(biz);
  const body = L.band === 'mid'
    ? [midSections[0], '', band, '', midSections[1]].join('\n')
    : [band, '', midSections[0], '', midSections[1]].join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(biz.short)} — ${esc(biz.kicker.split(' · ')[0].toLowerCase())}</title>
<meta name="description" content="${attr(biz.lede)}">
<!-- Sample content on a real business name, so keep it out of search results.
     Remove this line if you want these pages indexed. -->
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="${theme.bg}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%23${tintHex}'/%3E%3Ctext x='16' y='23' font-family='Georgia,serif' font-size='18' fill='%23fffaf3' text-anchor='middle'%3E${esc(mark(biz))}%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../demo-site.css">
</head>
<body data-theme="${biz.theme}">

<header class="site-top">
  <div class="shell-site site-top__inner">
    <a class="site-brand" href="./"><span class="site-brand__mark" aria-hidden="true">${esc(mark(biz))}</span> ${esc(biz.short)}</a>
    <nav class="site-links" aria-label="Sections">
${c.nav.map((n) => `      <a href="${attr(n.href)}">${esc(n.label)}</a>`).join('\n')}
    </nav>
    <a class="s-btn s-btn--sm" href="${attr(navCta(biz).href)}">${esc(navCta(biz).label)}</a>
  </div>
</header>

<main>
${heroSection(biz, L)}

${body}

${visitSection(biz)}
</main>

<footer class="site-foot">
${footer(biz)}
</footer>

<script src="../../demo-site.js"></script>
</body>
</html>
`;
}

/* ----------------------------------------------------- showcase injections */

const CATEGORY_ORDER = ['food', 'plumbing', 'electrical'];

/* --------------------------------------------------------- the picker page */

const PICKER = join(HERE, 'businesses', 'index.html');

const ICON_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';
const ICON_GO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

/*
 * The Businesses button in the top bar points here rather than opening a menu:
 * twenty-five names in a dropdown is a wall of text in a fixed header, and it
 * pushes the page around on narrow screens. A page gives the list room, gives
 * every name a line to itself, and makes the whole thing searchable and
 * shareable by URL.
 */
function pickerPage() {
  const total = BUSINESSES.length;

  const groups = CATEGORY_ORDER.map((key) => {
    const list = BUSINESSES.filter((b) => b.category === key);
    const rows = list.map((b) => `          <li class="picker__row" data-name="${attr(`${b.name} ${b.short} ${b.kicker}`.toLowerCase())}">
            <a href="../sites/${b.slug}/">
              <span class="picker__swatch" style="--sw:${tint(b)}" aria-hidden="true"></span>
              <span class="picker__body">
                <span class="picker__name">${esc(b.name)}</span>
                <span class="picker__blurb">${esc(b.blurb)}</span>
              </span>
              <span class="picker__go">${ICON_GO}</span>
            </a>
          </li>`).join('\n');

    return `        <section class="picker__group" data-picker-group>
          <div class="picker__group-head">
            <h2>${esc(CATEGORIES[key].label)}</h2>
            <span class="picker__count">${list.length}</span>
          </div>
          <ul class="picker__list">
${rows}
          </ul>
        </section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>All ${total} businesses — Your Future Website</title>
<meta name="description" content="Every sample homepage in one place: ${total} local businesses across restaurants, cafés, plumbing and electrical work. Open any of them.">
<meta name="theme-color" content="#f9f4ea">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%23b87b45'/%3E%3Ctext x='16' y='23' font-family='Georgia,serif' font-size='19' fill='%23fffaf2' text-anchor='middle'%3EY%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../styles.css">
</head>
<body>
<a class="skip-link" href="#list">Skip to the list</a>

<header class="site-header">
  <div class="shell site-header__inner">
    <a class="wordmark" href="../">
      <span class="wordmark__mark" aria-hidden="true">Y</span>
      Your Future Website
    </a>
    <nav class="site-nav" aria-label="Sections">
      <a class="site-nav__link" href="../#demos">Demos</a>
      <a class="site-nav__link" href="./" aria-current="page">Businesses</a>
      <a class="site-nav__link site-nav__link--minor" href="../#details">Details</a>
      <a class="btn" href="../#businesses">Back to the showcase ${ICON_ARROW}</a>
    </nav>
  </div>
</header>

<main>
  <section class="picker-hero">
    <div class="shell">
      <p class="eyebrow reveal">The businesses</p>
      <h1 class="display reveal" style="--delay:80ms">Every business,<br>one page each.</h1>
      <p class="lede reveal" style="--delay:140ms">
        ${total} local businesses across three trades, each with its own homepage —
        its own palette, its own arrangement, its own address. Start typing to
        narrow the list, or just pick a name.
      </p>

      <div class="picker-search reveal" style="--delay:200ms">
        <div class="picker-search__field">
          <svg class="picker-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
          <label class="picker-search__label" for="picker-search">Search the businesses</label>
          <input id="picker-search" type="search" data-picker-search placeholder="Type a name — wok, plumbing, sushi…" autocomplete="off" spellcheck="false">
        </div>
        <p class="picker-search__count" data-picker-count role="status">${total} businesses</p>
      </div>
    </div>
  </section>

  <section class="picker" id="list">
    <div class="shell">
      <div class="picker__groups" data-picker>
${groups}
      </div>
      <p class="picker__empty" data-picker-empty hidden>No business matches that name. Try fewer letters.</p>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="shell">
    <div class="site-footer__grid">
      <div>
        <a class="wordmark" href="../">
          <span class="wordmark__mark" aria-hidden="true">Y</span>
          Your Future Website
        </a>
        <p>Business names come from the prospect list; every price, phone number and photo is placeholder content.</p>
      </div>
      <nav class="footer-links" aria-label="Elsewhere">
        <a href="../#demos">The four style directions</a>
        <a href="../#details">What's included</a>
        <a href="../">Back to the top</a>
      </nav>
    </div>
    <div class="site-footer__fine">
      <span>Placeholder images and text throughout.</span>
      <span>Static site — no tracking, no cookies.</span>
    </div>
  </div>
</footer>

<script type="module" src="../app.js"></script>
</body>
</html>
`;
}

function gridBlock() {
  const chips = CATEGORY_ORDER.map((key) => {
    const n = BUSINESSES.filter((b) => b.category === key).length;
    return `        <button class="chip" type="button" data-filter="${key}">${esc(CATEGORIES[key].label)} <span>${n}</span></button>`;
  }).join('\n');

  const cards = BUSINESSES.map((b) => {
    const sw = tint(b);
    return `        <article class="demo-card biz-card" data-biz-card data-category="${b.category}">
          <a class="demo-card__frame" href="sites/${b.slug}/" aria-label="Open the ${attr(b.short)} demo">
            <div class="chrome">
              <span class="chrome__dots" aria-hidden="true"><i></i><i></i><i></i></span>
              <span class="chrome__url">sites/${b.slug}/</span>
            </div>
            <div class="chrome__view" data-preview-src="sites/${b.slug}/">
              <span class="chrome__placeholder" style="--sw:${sw}" aria-hidden="true">${esc(mark(b))}</span>
            </div>
          </a>
          <div class="demo-card__meta">
            <div>
              <p class="biz-card__tag" style="--sw:${sw}">${esc(CATEGORIES[b.category].label.replace('Restaurants & cafés', 'Restaurant / café').replace('Plumbers', 'Plumber').replace('Electricians', 'Electrician'))}</p>
              <h3>${esc(b.name)}</h3>
              <p>${esc(b.blurb)}</p>
            </div>
            <a class="demo-card__open" href="sites/${b.slug}/">
              Open
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>
            </a>
          </div>
        </article>`;
  }).join('\n');

  return `      <div class="biz-filters" data-biz-filters role="group" aria-label="Filter by trade">
        <button class="chip is-active" type="button" data-filter="all" aria-pressed="true">All <span>${BUSINESSES.length}</span></button>
${chips}
      </div>

      <div class="gallery gallery--biz" data-stagger-group>
${cards}
      </div>`;
}

/* ------------------------------------------------------------- injection io */

function inject(html, name, body) {
  const startTag = `<!-- ${name}`;
  const endTag = `<!-- /${name} -->`;
  const s = html.indexOf(startTag);
  const e = html.indexOf(endTag);
  const lineEnd = s === -1 ? -1 : html.indexOf('\n', s);
  if (s === -1 || e === -1 || lineEnd === -1 || lineEnd > e) {
    throw new Error(`index.html is missing the "${name}" markers (or they are out of order). They are required.`);
  }
  return html.slice(0, lineEnd + 1) + body + '\n' + html.slice(e);
}

/* --------------------------------------------------------------- validation */

function validate() {
  const problems = [];
  const seenSlug = new Set();
  const seenLayout = new Map();

  for (const b of BUSINESSES) {
    if (seenSlug.has(b.slug)) problems.push(`duplicate slug: ${b.slug}`);
    seenSlug.add(b.slug);

    if (!CATEGORIES[b.category]) problems.push(`${b.slug}: unknown category "${b.category}"`);
    if (!THEMES[b.theme]) problems.push(`${b.slug}: unknown theme "${b.theme}"`);
    const L = LAYOUTS[b.slug];
    if (!L) { problems.push(`${b.slug}: no layout assigned`); continue; }
    if (b.shots.length !== 4) problems.push(`${b.slug}: expected 4 gallery shots, got ${b.shots.length}`);
    if (b.list.items.length !== 6) problems.push(`${b.slug}: expected 6 list items, got ${b.list.items.length}`);
    if (b.band.length !== 6) problems.push(`${b.slug}: expected 6 band items, got ${b.band.length}`);
    if (b.facts.length !== 3) problems.push(`${b.slug}: expected 3 hero facts, got ${b.facts.length}`);
    if (b.heading.length !== 2) problems.push(`${b.slug}: heading needs exactly 2 lines`);

    // The point of the exercise: no two pages share a look.
    const look = [b.theme, L.hero, L.list, L.gallery, L.order].join('/');
    if (seenLayout.has(look)) problems.push(`${b.slug} and ${seenLayout.get(look)} share the same theme + layout (${look})`);
    else seenLayout.set(look, b.slug);
  }

  for (const slug of Object.keys(LAYOUTS)) {
    if (!seenSlug.has(slug)) problems.push(`LAYOUTS has an entry for unknown business "${slug}"`);
  }

  if (problems.length) {
    console.error('Refusing to build:\n' + problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
  }
  return { looks: seenLayout.size };
}

/* ---------------------------------------------------------------------- main */

async function main() {
  const check = process.argv.includes('--check');
  const { looks } = validate();

  const indexHtml = await readFile(INDEX, 'utf8');
  const nextIndex = inject(indexHtml, 'businesses:grid', gridBlock());
  const nextPicker = pickerPage();

  const stale = [];
  let written = 0;

  for (const biz of BUSINESSES) {
    const dir = join(SITES, biz.slug);
    const file = join(dir, 'index.html');
    const html = pageFor(biz);

    let current = null;
    try { current = await readFile(file, 'utf8'); } catch { /* not written yet */ }

    if (current === html) continue;
    if (check) { stale.push(`sites/${biz.slug}/index.html`); continue; }
    await mkdir(dir, { recursive: true });
    await writeFile(file, html, 'utf8');
    written += 1;
  }

  if (nextIndex !== indexHtml) {
    if (check) stale.push('index.html');
    else await writeFile(INDEX, nextIndex, 'utf8');
  }

  let currentPicker = null;
  try { currentPicker = await readFile(PICKER, 'utf8'); } catch { /* not written yet */ }
  if (currentPicker !== nextPicker) {
    if (check) stale.push('businesses/index.html');
    else {
      await mkdir(dirname(PICKER), { recursive: true });
      await writeFile(PICKER, nextPicker, 'utf8');
    }
  }

  if (check) {
    if (stale.length) {
      console.error('Out of date — re-run `node build-sites.mjs`:\n' + stale.map((s) => `  - ${s}`).join('\n'));
      process.exit(1);
    }
    console.log(`Up to date. ${BUSINESSES.length} pages, ${looks} distinct looks.`);
    return;
  }

  /* Remove site folders that no longer have a business. */
  const wanted = new Set(BUSINESSES.map((b) => b.slug));
  const keep = new Set(['maison', 'daily-grind', 'ridgeline', 'alder']); // hand-written style demos
  let removed = 0;
  for (const entry of await readdir(SITES, { withFileTypes: true })) {
    if (!entry.isDirectory() || wanted.has(entry.name) || keep.has(entry.name)) continue;
    await rm(join(SITES, entry.name), { recursive: true, force: true });
    removed += 1;
  }

  const byCat = CATEGORY_ORDER.map((k) => `${CATEGORIES[k].label}: ${BUSINESSES.filter((b) => b.category === k).length}`).join(', ');
  console.log(`Wrote ${BUSINESSES.length} business pages (${written} changed)${removed ? `, removed ${removed} stale folder(s)` : ''}.`);
  console.log(`${byCat}. ${looks} distinct theme + layout combinations.`);
  console.log(`index.html: ${BUSINESSES.length} cards injected. businesses/index.html: picker written.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
