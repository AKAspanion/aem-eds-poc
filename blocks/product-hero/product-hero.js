/*
 * Product Hero: full-width product banner (desktop + mobile art direction) with
 * the badge, two-line title, description, brochure download link and an
 * optional flavour selector laid over it.
 *
 * Content model (rows are detected by content, order does not matter):
 *   | Product Hero |
 *   | <desktop banner> | <mobile banner> |                       images only
 *   | Badge / # Line 1<br>Line 2 / Description / [Download Product Brochure](pdf) |
 *   | Flavour | Vanilla | <desktop banner for this flavour> |   optional, one row per flavour
 *
 * Colours follow the page metadata `Theme` (prohance | prohance-dm | prohance-hp).
 */

import { buildPicture } from '../../scripts/prohance.js';
import { el, text, readIntro } from '../../scripts/product.js';

const DOWNLOAD_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 12.5V2.5"/><path d="M17.5 12.5v3.33a1.67 1.67 0 0 1-1.67 1.67H4.17a1.67 1.67 0 0 1-1.67-1.67V12.5"/><path d="m5.83 8.33 4.17 4.17 4.17-4.17"/></svg>';

const PICTURE_OPTS = {
  widths: [1024, 1600, 2400, 2880],
  mobileWidths: [400, 800],
  sizes: '100vw',
  breakpoint: '(width >= 768px)',
};

/** Turns an authored link into the brochure/download link. */
function buildAction(link) {
  const a = el('a', 'product-hero-link');
  a.href = link.href;
  const label = text(link);
  const isDownload = /\.pdf(\?|#|$)/i.test(link.href) || /download|brochure/i.test(label);
  if (isDownload) a.insertAdjacentHTML('afterbegin', DOWNLOAD_ICON);
  a.append(el('span', '', label));
  if (new URL(link.href, window.location.href).origin !== window.location.origin) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.append(el('span', 'sr-only', '(opens in a new tab)'));
  }
  return a;
}

/** Radio group of flavours; selecting one with its own image swaps the banner. */
function buildFlavours(flavours, media) {
  const group = el('div', 'product-hero-flavours');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Flavour');
  const select = (index) => {
    flavours.forEach((f, i) => {
      f.input.checked = i === index;
      f.label.classList.toggle('is-checked', i === index);
      if (f.picture) f.picture.hidden = i !== index;
    });
    const hasOwn = !!flavours[index].picture;
    media.querySelector('.product-hero-default')?.toggleAttribute('data-flavour-hidden', hasOwn);
  };
  flavours.forEach((flavour, i) => {
    const input = el('input');
    input.type = 'radio';
    input.name = 'product-flavour';
    input.value = flavour.name;
    input.className = 'sr-only';
    input.addEventListener('change', () => select(i));
    const label = el('label', 'product-hero-flavour', input, el('span', 'product-hero-flavour-dot'), flavour.name);
    flavour.input = input;
    flavour.label = label;
    group.append(label);
  });
  select(0);
  return group;
}

export default function decorate(block) {
  let images = [];
  let introCell;
  const flavours = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const first = text(cells[0]);
    if (/^flavou?rs?$/i.test(first) && cells.length > 1) {
      const img = row.querySelector('img');
      text(cells[1]).split(',').map((s) => s.trim()).filter(Boolean)
        .forEach((name) => flavours.push({ name, img }));
    } else if (row.querySelector('h1, h2, h3') && !introCell) {
      introCell = cells.find((c) => c.querySelector('h1, h2, h3'));
    } else if (row.querySelector('img') && !text(row) && !images.length) {
      images = [...row.querySelectorAll('img')];
    }
  });

  const media = el('div', 'product-hero-media');
  if (images.length) {
    const picture = buildPicture(images[0], { ...PICTURE_OPTS, mobile: images[1], eager: true });
    picture.classList.add('product-hero-default');
    media.append(picture);
  }
  media.classList.toggle('has-mobile', images.length > 1);

  const inner = el('div', 'product-hero-inner');
  if (introCell) {
    const { badge, heading, description } = readIntro(introCell);
    const links = [];
    const paras = [];
    description.forEach((p) => {
      const link = p.querySelector('a');
      if (link && text(p) === text(link)) links.push(link);
      else paras.push(p);
    });
    inner.append(...[badge, heading].filter(Boolean));
    if (paras.length) inner.append(el('div', 'product-description', ...paras));
    if (links.length) inner.append(el('div', 'product-hero-actions', ...links.map(buildAction)));
  }

  if (flavours.length) {
    flavours.forEach((f) => {
      if (!f.img) return;
      f.picture = buildPicture(f.img, { ...PICTURE_OPTS, mobile: images[1] });
      f.picture.classList.add('product-hero-flavour-image');
      media.append(f.picture);
    });
    inner.append(buildFlavours(flavours, media));
  }

  block.replaceChildren(media, el('div', 'product-hero-content', inner));
}
