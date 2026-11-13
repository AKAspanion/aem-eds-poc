/*
 * Clinically Crafted: heading + description, a product image (desktop/mobile
 * art direction; several slides become a scroll-snap carousel with arrows),
 * and a row of icon pills.
 *
 * Content model (rows are detected by content):
 *   | Clinically Crafted |
 *   | ## Line 1<br>Line 2 | Description |                heading row
 *   | <desktop image> | <mobile image> |                  one row per slide
 *   | - :halal-certified: Halal Certified  - ... |        pills (list or one paragraph each)
 */

const DM_PATH = '/adobe/dynamicmedia/deliver/';
const AUTOPLAY_MS = 10000;
const CHEVRON = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

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

function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

function addSource(picture, img, widths, media, sizes) {
  if (!imageUrl(img.src, widths[0], 'webp')) return;
  const source = document.createElement('source');
  if (media) source.media = media;
  source.type = 'image/webp';
  source.srcset = widths.map((w) => `${imageUrl(img.src, w, 'webp')} ${w}w`).join(', ');
  source.sizes = sizes;
  if (img.naturalWidth || img.getAttribute('width')) {
    source.width = img.naturalWidth || img.getAttribute('width');
    source.height = img.naturalHeight || img.getAttribute('height');
  }
  picture.append(source);
}

/** Desktop image from 768px, mobile image below. */
function buildSlide(desktop, mobile) {
  const picture = document.createElement('picture');
  if (mobile) {
    addSource(picture, desktop, [1200, 1800, 2400], '(width >= 768px)', '(width >= 1280px) 75vw, 90vw');
    if (!picture.children.length) {
      const s = document.createElement('source');
      s.media = '(width >= 768px)';
      s.srcset = desktop.src;
      picture.append(s);
    }
  }
  const small = mobile || desktop;
  addSource(picture, small, mobile ? [640, 1016] : [640, 1200, 1800], null, mobile ? '100vw' : '(width >= 768px) 75vw, 100vw');
  const img = document.createElement('img');
  img.src = imageUrl(small.src, 1200) || small.src;
  img.alt = desktop.alt || small.alt || '';
  img.loading = 'lazy';
  img.decoding = 'async';
  ['width', 'height'].forEach((a) => { if (small.getAttribute(a)) img.setAttribute(a, small.getAttribute(a)); });
  picture.append(img);
  return el('li', 'cc-slide', picture);
}

function buildHeader(row) {
  const header = el('div', 'cc-header');
  const heading = row.querySelector('h1, h2, h3');
  if (heading) {
    const h2 = el('h2', 'cc-title');
    const br = heading.querySelector('br');
    if (br) {
      const line1 = el('span', 'cc-title-line1');
      const line2 = el('span', 'cc-title-line2');
      let target = line1;
      [...heading.childNodes].forEach((n) => {
        if (n === br) target = line2;
        else target.append(n);
      });
      h2.append(line1, document.createElement('br'), line2);
    } else {
      h2.append(el('span', 'cc-title-line1', ...heading.childNodes));
    }
    header.append(h2);
  }
  const text = [...row.querySelectorAll('p')].filter((p) => p.textContent.trim());
  if (text.length) header.append(el('div', 'cc-desc', ...text));
  return header;
}

function buildPills(row) {
  const items = row.querySelectorAll('li').length
    ? [...row.querySelectorAll('li')]
    : [...row.querySelectorAll('p')].filter((p) => p.textContent.trim());
  const pills = el('ul', 'cc-pills');
  items.forEach((item) => {
    const pill = el('li', 'cc-pill');
    const icon = item.querySelector('.icon');
    if (icon) {
      icon.querySelectorAll('img').forEach((img) => { img.width = 16; img.height = 16; });
      pill.append(el('span', 'cc-pill-icon', icon));
    }
    pill.append(item.textContent.trim());
    pills.append(pill);
  });
  return pills;
}

function setupCarousel(viewport, track) {
  const slides = [...track.children];
  const go = (dir) => {
    const w = track.clientWidth || 1;
    const idx = Math.round(track.scrollLeft / w);
    const next = (idx + dir + slides.length) % slides.length;
    track.scrollTo({ left: next * w, behavior: 'smooth' });
  };
  [['prev', 'Previous slide', 'm15 18-6-6 6-6', -1], ['next', 'Next slide', 'm9 18 6-6-6-6', 1]]
    .forEach(([cls, label, d, dir]) => {
      const b = el('button', `cc-arrow cc-${cls}`);
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.innerHTML = CHEVRON(d);
      b.addEventListener('click', () => go(dir));
      viewport.append(b);
    });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let paused = false;
  let visible = false;
  ['pointerenter', 'touchstart', 'focusin'].forEach((e) => viewport.addEventListener(e, () => { paused = true; }, { passive: true }));
  ['pointerleave', 'touchend', 'focusout'].forEach((e) => viewport.addEventListener(e, () => { paused = false; }, { passive: true }));
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(viewport);
  setInterval(() => { if (!paused && visible) go(1); }, AUTOPLAY_MS);
}

export default function decorate(block) {
  let header;
  let pills;
  const track = el('ul', 'cc-track');

  [...block.children].forEach((row) => {
    const imgs = [...row.querySelectorAll('img')].filter((img) => !img.closest('.icon'));
    if (!header && row.querySelector('h1, h2, h3')) {
      header = buildHeader(row);
    } else if (imgs.length && !row.textContent.trim()) {
      track.append(buildSlide(imgs[0], imgs[1]));
    } else if (!pills && row.textContent.trim()) {
      pills = buildPills(row);
    }
  });

  let media;
  if (track.children.length) {
    const viewport = el('div', 'cc-viewport', track);
    if (track.children.length > 1) setupCarousel(viewport, track);
    media = el('div', 'cc-media', viewport);
  }

  block.replaceChildren(...[header, media, pills].filter(Boolean));
}
