/* Showcase interactions: scroll reveals, sticky header, staged headline,
   and responsive scaling of the live miniature previews.
   Vanilla ESM, no dependencies. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hoverFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------- sticky header */

function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const sync = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  sync();
  window.addEventListener('scroll', sync, { passive: true });
}

/* ------------------------------------------------- featured headline staging */

function initHeadline() {
  const lines = document.querySelectorAll('[data-stagger]');
  if (!lines.length || reduceMotion) return;

  // Stage each word visually. The parent heading keeps an aria-label with the
  // full sentence, so screen readers still read it as one line.
  let index = 0;
  lines.forEach((line) => {
    const words = line.textContent.trim().split(/\s+/);
    line.textContent = '';
    line.setAttribute('aria-hidden', 'true');
    words.forEach((word) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.style.setProperty('--i', String(index++));
      span.textContent = word;
      line.append(span);
      line.append(document.createTextNode(' '));
    });
  });
}

/* ------------------------------------------------------------ scroll reveals */

function initReveals() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // Once an element has arrived, drop the reveal classes. Leaving them on would
  // keep the staggered transition-delay in charge and make hover lifts feel laggy.
  const settle = (el) => {
    const done = () => {
      el.removeEventListener('transitionend', onEnd);
      el.classList.remove('reveal', 'is-visible');
      el.style.removeProperty('--delay');
    };
    const onEnd = (event) => {
      if (event.target === el && event.propertyName === 'opacity') done();
    };
    el.addEventListener('transitionend', onEnd);
    setTimeout(done, 2600); // fallback if the transition is interrupted
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
        settle(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  );

  items.forEach((el) => observer.observe(el));
}

/* Stagger direct children of any [data-stagger-group] container. */
function initStaggerGroups() {
  document.querySelectorAll('[data-stagger-group]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      if (!child.classList.contains('reveal')) child.classList.add('reveal');
      child.style.setProperty('--delay', `${i * 90}ms`);
    });
  });
}

/* -------------------------------------------------- miniature preview scaling */

const PREVIEW_BASE_WIDTH = 1440;

function fitPreview(view) {
  const frame = view.querySelector('iframe');
  if (!frame) return;
  const scale = view.clientWidth / PREVIEW_BASE_WIDTH;
  if (!scale) return;
  frame.style.transform = `scale(${scale})`;
  // Grow the frame's layout box to cover the scaled area, so the preview
  // is never letterboxed on the right or bottom edge.
  frame.style.height = `${Math.round(view.clientHeight / scale)}px`;
}

function initPreviews() {
  const views = [...document.querySelectorAll('.chrome__view')];
  if (!views.length) return;

  const fitAll = () => views.forEach(fitPreview);
  fitAll();

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver((entries) => entries.forEach((e) => fitPreview(e.target)));
    views.forEach((v) => ro.observe(v));
  } else {
    window.addEventListener('resize', fitAll, { passive: true });
  }

  // Previews are animated with transforms, so keep them out of the tab order.
  document.querySelectorAll('.chrome__view iframe').forEach((frame) => frame.setAttribute('tabindex', '-1'));

  window.addEventListener('load', fitAll);
}

/* The business grid holds 25 more previews, each a whole page. Build the
   iframe only once its card is nearly on screen — a placeholder frame stands
   in until then — so the page never fires 25 loads at once. */
function initDeferredPreviews() {
  const slots = [...document.querySelectorAll('.chrome__view[data-preview-src]')];
  if (!slots.length) return;

  const hydrate = (slot) => {
    if (slot.dataset.hydrated) return;
    slot.dataset.hydrated = '1';

    const frame = document.createElement('iframe');
    frame.src = slot.dataset.previewSrc;
    frame.title = `${slot.closest('.demo-card')?.querySelector('h3')?.textContent.trim() ?? 'Demo'} preview`;
    frame.loading = 'lazy';
    frame.scrolling = 'no';
    frame.setAttribute('tabindex', '-1');

    slot.querySelector('.chrome__placeholder')?.remove();
    slot.append(frame);
    fitPreview(slot);
    window.addEventListener('load', () => fitPreview(slot), { once: true });
  };

  if (!('IntersectionObserver' in window)) {
    slots.forEach(hydrate);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        hydrate(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '600px 0px' },
  );
  slots.forEach((slot) => observer.observe(slot));
}

/* ------------------------------------------------------ businesses menu */

function initNavDrop() {
  document.querySelectorAll('[data-nav-drop]').forEach((drop) => {
    const trigger = drop.querySelector('.nav-drop__trigger');
    const panel = drop.querySelector('.nav-drop__panel');
    if (!trigger || !panel) return;

    const isOpen = () => drop.classList.contains('is-open');
    const setOpen = (open) => {
      drop.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    };
    setOpen(false);

    // Click works everywhere: touch, keyboard, and anyone who prefers it.
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      setOpen(!isOpen());
    });

    // Pointer users also get hover, which is the expected feel for a menu.
    if (hoverFine) {
      drop.addEventListener('mouseenter', () => setOpen(true));
      drop.addEventListener('mouseleave', () => {
        if (!drop.contains(document.activeElement)) setOpen(false);
      });
      drop.addEventListener('focusout', () => {
        requestAnimationFrame(() => {
          if (!drop.contains(document.activeElement)) setOpen(false);
        });
      });
    }

    drop.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !isOpen()) return;
      setOpen(false);
      trigger.focus();
    });

    document.addEventListener('click', (event) => {
      if (isOpen() && !drop.contains(event.target)) setOpen(false);
    });

    panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  });
}

/* ---------------------------------------------------- business card filters */

function initBizFilters() {
  const bar = document.querySelector('[data-biz-filters]');
  if (!bar) return;

  const cards = [...document.querySelectorAll('[data-biz-card]')];

  bar.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-filter]');
    if (!chip) return;
    const filter = chip.dataset.filter;

    bar.querySelectorAll('[data-filter]').forEach((other) => {
      const active = other === chip;
      other.classList.toggle('is-active', active);
      other.setAttribute('aria-pressed', String(active));
    });

    cards.forEach((card) => {
      card.hidden = filter !== 'all' && card.dataset.category !== filter;
    });
  });
}

/* -------------------------------------------------- gentle hero card parallax */

function initParallax() {
  const visual = document.querySelector('.hero__visual');
  if (!visual || reduceMotion) return;

  const cards = [...visual.querySelectorAll('.stack-card')];

  // Read each card's resting transform from the stylesheet instead of
  // duplicating it here, so the CSS stays the single source of truth.
  let bases = [];
  const readBases = () => {
    bases = cards.map((card) => getComputedStyle(card).getPropertyValue('--base').trim() || 'none');
  };
  readBases();

  let raf = 0;
  const update = () => {
    raf = 0;
    const rect = visual.getBoundingClientRect();
    const progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
    cards.forEach((card, i) => {
      const depth = (i - 1) * 9;
      card.style.transform = `${bases[i]} translateY(${(progress * depth).toFixed(2)}px)`;
    });
  };

  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { readBases(); onScroll(); }, { passive: true });
}

/* -------------------------------------------------------- marquee duplicating */

function initMarquee() {
  const track = document.querySelector('.marquee__track');
  if (!track) return;
  // Duplicate once so the -50% keyframe loops seamlessly.
  track.innerHTML += track.innerHTML;
}

/* ------------------------------------------------------------------ bootstrap */

function init() {
  initStaggerGroups();
  initHeader();
  initHeadline();
  initMarquee();
  initReveals();
  initPreviews();
  initDeferredPreviews();
  initNavDrop();
  initBizFilters();
  initParallax();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
