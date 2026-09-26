/* ==========================================================================
   Owner-only outreach panel.

   Loaded lazily by app.js, and only after the visitor's public IP checks out
   (see initProfile in app.js). It builds one message per business straight
   from the business cards already on the page — the name and the slug — so it
   can never drift from the prospect list, and no outreach copy is baked into
   the served HTML.

   Each message carries a screenshot of that business's demo page, captured
   ahead of time into assets/shots/, plus a single Copy button that puts the
   whole thing — picture and text — on the clipboard.
   ========================================================================== */

/** Where the demos will be published. Screenshots are linked absolutely from
    here so a pasted message resolves the image wherever it is opened. */
const BASE = "https://yourfuturewebsite.vercel.app";

/** Locally captured screenshots, relative to the showcase page. */
const SHOT_DIR = "assets/shots/";

/** The message. [Name] and [Link] are filled in per business. */
const script = (name, link) => `Hey ${name}, I'm a teenager from the local area trying to save up for my dream computer by building websites. I was checking out your business online and noticed your current site is running a bit slow and looking a bit outdated. I went ahead and coded a completely brand-new, modern upgrade for your site from scratch to show you what I can do: ${link}
It's lightning-fast and works perfectly on all screens. If you like the look of it, just message me back and we can chat about options. This is just a demo; it can look completely different if you want. No stress if not! Cheers.`;

/* ------------------------------------------------------------------ helpers */

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Read the 25 businesses off the cards the showcase already renders. */
function readBusinesses() {
  return [...document.querySelectorAll("[data-biz-card]")]
    .map((card) => {
      const name = card.querySelector("h3")?.textContent.trim();
      const href = card.querySelector('a[href^="sites/"]')?.getAttribute("href") ?? "";
      const slug = (href.match(/sites\/([^/]+)\//) ?? [])[1];
      if (!name || !slug) return null;
      const link = `${BASE}/sites/${slug}/`;
      return {
        name,
        slug,
        link,
        category: card.dataset.category ?? "",
        message: script(name, link),
      };
    })
    .filter(Boolean);
}

/** The clipboard's rich form: the same text, with the link live and the
    screenshot below it. */
function toHtml(entry) {
  const withLink = escapeHtml(entry.message).replace(
    escapeHtml(entry.link),
    `<a href="${entry.link}">${entry.link}</a>`,
  );
  const paragraphs = withLink
    .split("\n")
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("");
  return `${paragraphs}<p><img src="${BASE}/${SHOT_DIR}${entry.slug}.png" width="960" height="600" alt="${escapeHtml(entry.name)} — demo homepage"></p>`;
}

/* -------------------------------------------------------------------- panel */

/* Same three trades the showcase filters by, in the same order. */
const TRADES = [
  { key: "food", label: "Restaurants & cafés" },
  { key: "plumbing", label: "Plumbers" },
  { key: "electrical", label: "Electricians" },
];

function buildPanel(businesses) {
  const trades = TRADES.map((trade) => ({
    ...trade,
    count: businesses.filter((entry) => entry.category === trade.key).length,
  })).filter((trade) => trade.count);

  const panel = document.createElement("div");
  panel.className = "profile";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="profile__scrim" data-profile-close></div>
    <div class="profile__sheet" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <header class="profile__head">
        <div>
          <p class="eyebrow">Owner view</p>
          <h2 class="profile__title" id="profile-title">Outreach messages</h2>
          <p class="profile__note">One per business — screenshot and message, ready to send.</p>
        </div>
        <button class="btn btn--ghost profile__close" type="button" data-profile-close aria-label="Close">Close</button>
      </header>
      <div class="profile__tools">
        <div class="picker-search__field">
          <svg class="picker-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <label class="picker-search__label" for="profile-search">Search businesses</label>
          <input id="profile-search" type="search" placeholder="Search by business name…" autocomplete="off" data-profile-search>
        </div>
        <div class="biz-filters profile__filters" data-profile-filters role="group" aria-label="Filter by trade">
          <button class="chip is-active" type="button" data-filter="all" aria-pressed="true">All <span>${businesses.length}</span></button>
          ${trades
            .map(
              (trade) =>
                `<button class="chip" type="button" data-filter="${trade.key}" aria-pressed="false">${trade.label} <span>${trade.count}</span></button>`,
            )
            .join("")}
        </div>
        <p class="profile__count" data-profile-count>${businesses.length} businesses</p>
      </div>
      <div class="profile__list">
        ${businesses
          .map(
            (entry, index) => `
          <article class="profile__card" data-category="${escapeHtml(entry.category)}" data-name="${escapeHtml(entry.name.toLowerCase())}">
            <a class="profile__shot" href="${entry.link}" target="_blank" rel="noopener">
              <img src="${SHOT_DIR}${entry.slug}.png" width="960" height="600" loading="lazy" decoding="async" alt="Screenshot of the ${escapeHtml(entry.name)} demo homepage">
            </a>
            <div class="profile__body">
              <h3 class="profile__name">${escapeHtml(entry.name)}</h3>
              <p class="profile__link">${entry.link.replace(BASE, "")}</p>
              <p class="profile__text">${escapeHtml(entry.message).replace(/\n/g, "<br>")}</p>
              <div class="profile__actions">
                <button class="btn btn--accent profile__copy" type="button" data-copy="${index}">Copy text &amp; image</button>
                <a class="profile__visit" href="${entry.link}" target="_blank" rel="noopener">Open the demo</a>
              </div>
            </div>
          </article>`,
          )
          .join("")}
      </div>
      <p class="profile__empty" data-profile-empty hidden>No businesses match that search.</p>
    </div>`;
  return panel;
}

/* ------------------------------------------------------------------ copying */

/* Prefer the async clipboard: one item carrying the picture, the rich text and
   the plain text, so a paste lands well in an email, a chat app or a plain
   field. If the browser can't, fall back to a selection copy. */
async function copyEntry(entry) {
  const html = toHtml(entry);
  const item = {
    "text/plain": new Blob([entry.message], { type: "text/plain" }),
    "text/html": new Blob([html], { type: "text/html" }),
  };

  try {
    const response = await fetch(`${SHOT_DIR}${entry.slug}.png`);
    if (response.ok) item["image/png"] = await response.blob();
  } catch {
    /* The screenshot is a bonus; the text still copies without it. */
  }

  if (navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem(item)]);
      return true;
    } catch {
      /* Fall through to the selection copy. */
    }
  }

  return copyViaSelection(html, entry.message);
}

function copyViaSelection(html, text) {
  const holder = document.createElement("div");
  holder.contentEditable = "true";
  holder.innerHTML = html;
  Object.assign(holder.style, { position: "fixed", left: "-9999px", top: "0", whiteSpace: "pre-wrap" });
  document.body.append(holder);

  const range = document.createRange();
  range.selectNodeContents(holder);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  selection.removeAllRanges();
  holder.remove();

  if (!ok && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  return ok;
}

/* -------------------------------------------------------------- wiring up */

export function init(button) {
  const businesses = readBusinesses();
  if (!businesses.length || document.querySelector(".profile")) return;

  const panel = buildPanel(businesses);
  document.body.append(panel);

  const sheet = panel.querySelector(".profile__sheet");
  const closeButtons = panel.querySelectorAll("[data-profile-close]");

  const open = () => {
    panel.hidden = false;
    document.documentElement.classList.add("profile-open");
    requestAnimationFrame(() => panel.classList.add("is-open"));
    sheet.querySelector(".profile__close").focus();
  };

  const close = () => {
    panel.classList.remove("is-open");
    document.documentElement.classList.remove("profile-open");
    const done = () => {
      panel.hidden = true;
      panel.removeEventListener("transitionend", done);
    };
    panel.addEventListener("transitionend", done);
    setTimeout(done, 400);
    button.focus();
  };

  button.addEventListener("click", open);
  closeButtons.forEach((el) => el.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) close();
  });

  /* Search and trade filtering, mirroring the showcase's picker and chips. */
  const input = panel.querySelector("[data-profile-search]");
  const chips = [...panel.querySelectorAll("[data-profile-filters] [data-filter]")];
  const cards = [...panel.querySelectorAll(".profile__card")];
  const count = panel.querySelector("[data-profile-count]");
  const empty = panel.querySelector("[data-profile-empty]");
  let trade = "all";

  const applyFilter = () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;

    cards.forEach((card) => {
      const matches =
        (trade === "all" || card.dataset.category === trade) &&
        (!query || card.dataset.name.includes(query));
      card.hidden = !matches;
      if (matches) shown += 1;
    });

    count.textContent = shown === cards.length ? `${cards.length} businesses` : `${shown} of ${cards.length} businesses`;
    empty.hidden = shown !== 0;
  };

  input.addEventListener("input", applyFilter);
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !input.value) return;
    input.value = "";
    applyFilter();
  });

  chips.forEach((chip) =>
    chip.addEventListener("click", () => {
      trade = chip.dataset.filter;
      chips.forEach((other) => {
        const active = other === chip;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", String(active));
      });
      applyFilter();
    }),
  );

  panel.querySelector(".profile__list").addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-copy]");
    if (!trigger) return;

    const entry = businesses[Number(trigger.dataset.copy)];
    if (!entry) return;

    const label = trigger.textContent;
    trigger.disabled = true;
    const ok = await copyEntry(entry);
    trigger.textContent = ok ? "Copied — paste it" : "Couldn't copy";
    setTimeout(() => {
      trigger.textContent = label;
      trigger.disabled = false;
    }, 2200);
  });
}
