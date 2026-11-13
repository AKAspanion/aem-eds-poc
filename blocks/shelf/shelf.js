/*
 * Shelf: product range. Three-column grid from 768px, swipeable scroll-snap
 * carousel with dots (and 10s autoplay) below that.
 *
 * Content model:
 *   | Shelf |
 *   | ## Heading | Description (optional) |               intro row (no image)
 *   | <image> | Category / ### Title / text / - features / **[CTA](href)** | teal, coming soon |
 *   ... one row per product. Third cell (optional): theme teal | blue | red, and "coming soon".
 *   A CTA written as plain text (no link) renders as a disabled button.
 */

const DM_PATH = '/adobe/dynamicmedia/deliver/';
const THEMES = ['teal', 'blue', 'red'];
const AUTOPLAY_MS = 10000;
const ARROW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

function imageUrl(src, width, format) {
  const url = new URL(src, window.location.href);
  if (url.pathname.includes(DM_PATH)) {
    if (format) url.pathname = url.pathname.replace(/\.[a-z0-9]+$/i, `.${format}`);
    url.searchParams.set('width', width);
    url.searchParams.set('quality', 80);
    return url.href;
  }
  if (url.origin === window.location.origin && url.pathname.includes('/media_')) {
    url.searchParams.set('width', width);
    url.searchParams.set('format', format === 'webp' ? 'webply' : url.pathname.split('.').pop());
    url.searchParams.set('optimize', 'medium');
    return url.href;
  }
  return null;
}

function buildPicture(img) {
  const picture = document.createElement('picture');
  const widths = [400, 750];
  if (imageUrl(img.src, widths[0], 'webp')) {
    const source = document.createElement('source');
    source.type = 'image/webp';
    source.srcset = widths.map((w) => `${imageUrl(img.src, w, 'webp')} ${w}w`).join(', ');
    source.sizes = '(width >= 768px) 33vw, 100vw';
    picture.append(source);
  }
  const out = document.createElement('img');
  out.src = imageUrl(img.src, 750) || img.src;
  out.alt = img.alt || '';
  out.loading = 'lazy';
  out.decoding = 'async';
  picture.append(out);
  return picture;
}

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

function buildCard(row) {
  const cells = [...row.children];
  const imageCell = cells.find((c) => c.querySelector('img'));
  const bodyCell = cells.find((c) => c !== imageCell && c.querySelector('h2, h3, h4, ul, a'))
    || cells.find((c) => c !== imageCell);
  const optionCell = cells.find((c) => c !== imageCell && c !== bodyCell);
  const options = (optionCell ? optionCell.textContent : '').toLowerCase();
  const theme = THEMES.find((t) => options.includes(t)) || 'teal';

  const card = el('li', `shelf-card shelf-${theme}`);

  if (/coming\s*soon/.test(options)) {
    card.append(el('div', 'shelf-badge', el('span', '', 'Coming Soon')));
  }

  const body = bodyCell ? [...bodyCell.children] : [];
  const heading = body.find((n) => /^H[2-6]$/.test(n.tagName));
  const headingIdx = body.indexOf(heading);
  const list = body.find((n) => n.tagName === 'UL' || n.tagName === 'OL');
  const listIdx = list ? body.indexOf(list) : -1;
  const paras = body.filter((n) => n.tagName === 'P' && !n.querySelector('picture'));

  // category: first paragraph before the heading
  const category = paras.find((p) => headingIdx > -1 && body.indexOf(p) < headingIdx);
  if (category) {
    card.append(el('div', 'shelf-category', el(
      'span',
      'shelf-category-pill',
      el('span', 'shelf-dot'),
      el('span', 'shelf-category-label', category.textContent.trim()),
    )));
  }

  if (imageCell) {
    const img = imageCell.querySelector('img');
    if (!img.alt && heading) img.alt = heading.textContent.trim();
    card.append(el('div', 'shelf-image', buildPicture(img)));
  }

  // CTA: paragraph after the list, else the last paragraph holding a link
  const after = (p) => body.indexOf(p) > Math.max(headingIdx, listIdx);
  let ctaPara = listIdx > -1 ? paras.filter(after).pop() : null;
  if (!ctaPara) ctaPara = paras.filter((p) => p.querySelector('a') && after(p)).pop();

  const rest = paras.filter((p) => p !== category && p !== ctaPara
    && (headingIdx < 0 || body.indexOf(p) > headingIdx));
  // flavour: an all-italic line straight after the heading
  const flavor = rest.find((p) => body.indexOf(p) === headingIdx + 1
    && p.children.length === 1 && p.firstElementChild.tagName === 'EM'
    && p.textContent.trim() === p.firstElementChild.textContent.trim());

  const info = el('div', 'shelf-info');
  if (heading) {
    const h3 = el('h3', 'shelf-title', ...heading.childNodes);
    const titleRow = el('div', 'shelf-title-row', h3);
    if (flavor) titleRow.append(el('span', 'shelf-flavor', flavor.textContent.trim()));
    info.append(titleRow);
  }
  const desc = rest.filter((p) => p !== flavor);
  if (desc.length) info.append(el('div', 'shelf-desc', ...desc));
  card.append(info);

  if (list) {
    const features = el('ul', 'shelf-features');
    [...list.children].forEach((li) => features.append(el('li', '', li.textContent.trim())));
    card.append(features);
  }

  card.append(el('div', 'shelf-divider'));

  if (ctaPara) {
    const link = ctaPara.querySelector('a');
    const text = ctaPara.textContent.trim();
    const cta = el(link ? 'a' : 'span', 'shelf-cta', el('span', '', text));
    if (link) cta.href = link.href;
    else cta.setAttribute('aria-disabled', 'true');
    cta.insertAdjacentHTML('beforeend', ARROW);
    card.append(el('div', 'shelf-cta-row', cta));
  }

  return card;
}

function buildIntro(row) {
  const intro = el('div', 'shelf-intro');
  const heading = row.querySelector('h1, h2, h3');
  if (heading) intro.append(el('h2', '', ...heading.childNodes));
  const text = [...row.querySelectorAll('p')].filter((p) => p.textContent.trim());
  if (text.length) intro.append(el('div', 'shelf-intro-text', ...text));
  return intro;
}

/** Dots + autoplay for the mobile scroll-snap track. */
function setupCarousel(track, count) {
  const dots = el('div', 'shelf-dots');
  dots.setAttribute('role', 'group');
  dots.setAttribute('aria-label', 'Choose product');
  const buttons = [...Array(count).keys()].map((i) => {
    const b = el('button', 'shelf-dot-btn');
    b.type = 'button';
    b.setAttribute('aria-label', `Go to slide ${i + 1}`);
    b.addEventListener('click', () => track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }));
    dots.append(b);
    return b;
  });

  let current = -1;
  const update = () => {
    const idx = Math.round(track.scrollLeft / (track.clientWidth || 1));
    if (idx === current) return;
    current = idx;
    buttons.forEach((b, i) => b.setAttribute('aria-current', String(i === idx)));
  };
  track.addEventListener('scroll', update, { passive: true });
  update();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return dots;
  let paused = false;
  let visible = false;
  const pause = () => { paused = true; };
  const resume = () => { paused = false; };
  ['pointerenter', 'touchstart', 'focusin'].forEach((e) => track.addEventListener(e, pause, { passive: true }));
  ['pointerleave', 'touchend', 'focusout'].forEach((e) => track.addEventListener(e, resume, { passive: true }));
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(track);
  setInterval(() => {
    if (paused || !visible || track.scrollWidth <= track.clientWidth + 1) return;
    const next = (current + 1) % count;
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  }, AUTOPLAY_MS);
  return dots;
}

export default function decorate(block) {
  const rows = [...block.children];
  const track = el('ul', 'shelf-track');
  let intro;

  rows.forEach((row) => {
    if (!row.querySelector('img') && !intro && row.querySelector('h1, h2, h3')
      && !row.querySelector('ul')) {
      intro = buildIntro(row);
    } else if (row.textContent.trim() || row.querySelector('img')) {
      track.append(buildCard(row));
    }
  });

  const carousel = el('div', 'shelf-carousel', track);
  const count = track.children.length;
  if (count > 1) carousel.append(setupCarousel(track, count));

  block.replaceChildren(...[intro, carousel].filter(Boolean));
}
