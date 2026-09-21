/* Shared behaviour for the sample restaurant pages: scroll reveals, a sticky
   top bar, the scrolling fact band, and the demo form. Vanilla, no deps. */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------- sticky top bar */

function initTopBar() {
  const bar = document.querySelector('.site-top');
  if (!bar) return;
  const sync = () => bar.classList.toggle('is-stuck', window.scrollY > 8);
  sync();
  window.addEventListener('scroll', sync, { passive: true });
}

/* --------------------------------------------------------------- fact band */

function initBand() {
  const track = document.querySelector('.band__track');
  if (!track) return;
  track.innerHTML += track.innerHTML; // seamless -50% loop
}

/* ----------------------------------------------------------------- reveals */

function initReveals() {
  // Cascade containers: animate children one after another.
  document.querySelectorAll('[data-cascade]').forEach((group) => {
    [...group.children].forEach((child, i) => {
      child.classList.add('reveal');
      child.style.setProperty('--delay', `${Math.min(i, 8) * 85}ms`);
    });
  });

  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  // Hand the element back to its own transitions once it has arrived, so
  // staggered delays never leak into hover states.
  const settle = (el) => {
    const done = () => {
      el.removeEventListener('transitionend', onEnd);
      el.classList.remove('reveal', 'is-in');
      el.style.removeProperty('--delay');
    };
    const onEnd = (event) => {
      if (event.target === el && event.propertyName === 'opacity') done();
    };
    el.addEventListener('transitionend', onEnd);
    setTimeout(done, 2600);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
        settle(entry.target);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
  );
  items.forEach((el) => observer.observe(el));
}

/* -------------------------------------------------------------- demo form */

function initForm() {
  const form = document.querySelector('.visit-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const note = form.querySelector('.form-note');
    if (note) {
      note.hidden = false;
      note.textContent = 'Thanks — this is a sample form, so nothing was actually sent.';
    }
    form.reset();
  });
}

/* ------------------------------------------------- back-to-demos affordance */

function initBackLink() {
  // Only for someone browsing a demo directly, never inside the preview frames.
  const embedded = window.self !== window.top;
  if (embedded) return;

  const link = document.createElement('a');
  // The picker page, not an anchor on the showcase: it lists every business,
  // which is the more useful place to land from a single demo.
  link.href = '../../businesses/';
  link.textContent = '← All the businesses';
  link.setAttribute('aria-label', 'Back to all the businesses');
  Object.assign(link.style, {
    position: 'fixed',
    left: '20px',
    bottom: '20px',
    zIndex: '9500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 20px',
    borderRadius: '999px',
    background: 'rgba(253, 251, 246, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(58, 46, 32, 0.16)',
    boxShadow: '0 18px 40px -26px rgba(58, 46, 32, 0.7)',
    color: '#241e16',
    font: '600 13px/1 Inter, -apple-system, "Segoe UI", sans-serif',
    textDecoration: 'none',
    transition: 'transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease',
  });
  link.addEventListener('mouseenter', () => { link.style.transform = 'translateY(-2px)'; });
  link.addEventListener('mouseleave', () => { link.style.transform = 'none'; });
  document.body.append(link);
}

/* ------------------------------------------------------------------ startup */

function init() {
  initTopBar();
  initBand();
  initReveals();
  initForm();
  initBackLink();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
