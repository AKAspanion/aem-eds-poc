/*
 * Shared Prohance helpers for blocks. Blocks may import from /scripts/ (only
 * fragment.js may be imported across blocks).
 *
 *   import { buildPicture, initCarousel, submitForm } from '../../scripts/prohance.js';
 */

const DM_PATH = '/adobe/dynamicmedia/deliver/';

/**
 * Returns a resized URL for AEM Dynamic Media or EDS media-bus images, or null
 * for anything else (which is then used as-is).
 * @param {string} src
 * @param {number} width
 * @param {string} [format] e.g. 'webp'
 */
export function imageUrl(src, width, format) {
  const url = new URL(src, window.location.href);
  if (url.pathname.includes(DM_PATH)) {
    if (format) url.pathname = url.pathname.replace(/\.[a-z0-9]+$/i, `.${format}`);
    url.searchParams.set('width', width);
    url.searchParams.set('quality', 80);
    return url.href;
  }
  if (url.pathname.includes('/media_')) {
    url.searchParams.set('width', width);
    url.searchParams.set('format', format === 'webp' ? 'webply' : url.pathname.split('.').pop());
    url.searchParams.set('optimize', 'medium');
    return url.href;
  }
  return null;
}

/** srcset string for the given widths, or the plain src when it cannot be resized. */
export function srcset(src, widths, format) {
  const urls = widths.map((w) => [imageUrl(src, w, format), w]);
  return urls[0][0] ? urls.map(([u, w]) => `${u} ${w}w`).join(', ') : src;
}

/**
 * Builds a responsive, optionally art-directed <picture>.
 * @param {HTMLImageElement} img desktop (or only) image
 * @param {object} [opts]
 * @param {HTMLImageElement} [opts.mobile] image used below `opts.breakpoint`
 * @param {number[]} [opts.widths] candidate widths for the desktop image
 * @param {number[]} [opts.mobileWidths] candidate widths for the mobile image
 * @param {string} [opts.sizes] sizes attribute (default 100vw)
 * @param {string} [opts.breakpoint] media query for the desktop image
 * @param {boolean} [opts.eager] eager + high priority (use for the LCP image only)
 * @param {string} [opts.alt] alt text override
 * @returns {HTMLPictureElement}
 */
export function buildPicture(img, opts = {}) {
  const {
    mobile,
    widths = [750, 1200, 2000],
    mobileWidths = [375, 750],
    sizes = '100vw',
    breakpoint = '(width >= 768px)',
    eager = false,
    alt,
  } = opts;
  const picture = document.createElement('picture');
  const addSource = (image, ws, media) => {
    if (!imageUrl(image.src, ws[0], 'webp')) return;
    const source = document.createElement('source');
    if (media) source.media = media;
    source.type = 'image/webp';
    source.srcset = srcset(image.src, ws, 'webp');
    source.sizes = sizes;
    picture.append(source);
  };
  if (mobile) addSource(img, widths, breakpoint);
  addSource(mobile || img, mobile ? mobileWidths : widths);
  if (mobile) {
    const fallback = document.createElement('source');
    fallback.media = breakpoint;
    fallback.srcset = img.src;
    picture.append(fallback);
  }
  const out = document.createElement('img');
  const base = mobile || img;
  out.alt = alt ?? img.alt ?? '';
  if (img.width) out.width = img.width;
  if (img.height) out.height = img.height;
  out.loading = eager ? 'eager' : 'lazy';
  if (eager) out.fetchPriority = 'high';
  out.decoding = 'async';
  picture.append(out);
  // src last, once the img is inside the <picture>: WebKit fetches as soon as
  // src is set, which otherwise downloads the fallback on top of the webp
  out.src = imageUrl(base.src, (mobile ? mobileWidths : widths).at(-1)) || base.src;
  return picture;
}

/**
 * Scroll-snap carousel: optional dots and autoplay that pauses on hover, focus,
 * touch, hidden tab, and reduced motion. The track's children are the slides.
 * @param {HTMLElement} track scrolling element (overflow-x: auto; scroll-snap)
 * @param {object} [opts]
 * @param {number} [opts.interval] autoplay ms (0 = off), default 10000
 * @param {string} [opts.mediaQuery] only autoplay while this matches
 * @param {HTMLElement} [opts.dotsContainer] when given, dots are rendered into it
 * @param {string} [opts.label] aria label prefix for dots
 * @returns {{ goTo: (i: number) => void, destroy: () => void }}
 */
export function initCarousel(track, opts = {}) {
  const {
    interval = 10000, mediaQuery, dotsContainer, label = 'Slide',
  } = opts;
  const slides = () => [...track.children];
  const current = () => Math.round(track.scrollLeft / (track.clientWidth || 1));
  const goTo = (i) => {
    const target = slides()[i];
    if (target) track.scrollTo({ left: target.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  };

  let dots = [];
  if (dotsContainer && slides().length > 1) {
    dots = slides().map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `${label} ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.append(dot);
      return dot;
    });
    const sync = () => {
      const i = current();
      dots.forEach((d, n) => d.setAttribute('aria-current', n === i ? 'true' : 'false'));
    };
    track.addEventListener('scroll', () => window.requestAnimationFrame(sync), { passive: true });
    sync();
  }

  let timer;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (interval && !reduced && slides().length > 1) {
    const mq = mediaQuery ? window.matchMedia(mediaQuery) : null;
    let paused = false;
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };
    track.addEventListener('pointerenter', pause);
    track.addEventListener('pointerleave', resume);
    track.addEventListener('focusin', pause);
    track.addEventListener('focusout', resume);
    track.addEventListener('touchstart', pause, { passive: true });
    timer = setInterval(() => {
      if (paused || document.hidden || (mq && !mq.matches)) return;
      goTo((current() + 1) % slides().length);
    }, interval);
  }

  return { goTo, destroy: () => clearInterval(timer) };
}

/**
 * Submits a form's fields as JSON. The endpoint comes from the form's
 * data-action (authored per block). Until the backend exists (App Builder
 * action), forms without an endpoint resolve as a simulated success so the UI
 * can be reviewed; this is logged so it is never mistaken for a real submit.
 * @param {HTMLFormElement} form
 * @returns {Promise<{ ok: boolean, simulated?: boolean }>}
 */
export async function submitForm(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const { action } = form.dataset;
  if (!action) {
    // eslint-disable-next-line no-console
    console.info('[prohance] form has no endpoint yet; simulating success', form.name || form.id, data);
    return { ok: true, simulated: true };
  }
  const res = await fetch(action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { ok: res.ok };
}

/** Reads a block's leading key/value config rows (2 cells, plain-text key). */
export function readConfig(block, keys) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length !== 2) return;
    const key = cells[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
    if (!keys.includes(key)) return;
    const link = cells[1].querySelector('a');
    config[key] = link ? link.href : cells[1].textContent.trim();
    row.remove();
  });
  return config;
}
