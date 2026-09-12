/* Showcase interactions: scroll reveals, sticky header, staged headline,
   and responsive scaling of the live miniature previews.
   Vanilla ESM, no dependencies. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function initPreviews() {
  const views = document.querySelectorAll('.chrome__view');
  if (!views.length) return;

  const BASE_WIDTH = 1440;

  const fit = (view) => {
    const frame = view.querySelector('iframe');
    if (!frame) return;
    const scale = view.clientWidth / BASE_WIDTH;
    if (!scale) return;
    frame.style.transform = `scale(${scale})`;
    // Grow the frame's layout box to cover the scaled area, so the preview
    // is never letterboxed on the right or bottom edge.
    frame.style.height = `${Math.round(view.clientHeight / scale)}px`;
  };

  const fitAll = () => views.forEach(fit);
  fitAll();

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver((entries) => entries.forEach((e) => fit(e.target)));
    views.forEach((v) => ro.observe(v));
  } else {
    window.addEventListener('resize', fitAll, { passive: true });
  }

  // Previews are animated with transforms, so keep them out of the tab order.
  document.querySelectorAll('.chrome__view iframe').forEach((frame) => frame.setAttribute('tabindex', '-1'));

  window.addEventListener('load', fitAll);
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
  initParallax();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
