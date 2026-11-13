/*
 * Hero: full-screen background (desktop + mobile art direction), glass title card,
 * and a floating vertical "Request for Free Sample" tab.
 *
 * Content model (row order is not significant; rows are detected by content):
 *   | Hero |
 *   | <desktop image> | <mobile image> |          background (one or two images)
 *   | # Line 1<br>Line 2 / description / CTAs |   title card
 *   | <packshot image> | Prohance® / [label](href) | floating side tab (optional)
 */

const DM_PATH = '/adobe/dynamicmedia/deliver/';

/** Returns a resized (and optionally re-encoded) URL for AEM Dynamic Media or EDS media. */
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

function srcset(src, widths, format) {
  const urls = widths.map((w) => [imageUrl(src, w, format), w]);
  return urls[0][0] ? urls.map(([u, w]) => `${u} ${w}w`).join(', ') : src;
}

/**
 * Builds an art-directed <picture>: desktop image from 768px up, mobile image below.
 * @param {HTMLImageElement} desktop
 * @param {HTMLImageElement} [mobile]
 */
function buildBackground(desktop, mobile) {
  const picture = document.createElement('picture');
  const addSource = (img, widths, media) => {
    if (!imageUrl(img.src, widths[0], 'webp')) return;
    const source = document.createElement('source');
    if (media) source.media = media;
    source.type = 'image/webp';
    source.srcset = srcset(img.src, widths, 'webp');
    source.sizes = '100vw';
    picture.append(source);
  };
  const small = mobile || desktop;
  if (mobile) addSource(desktop, [1024, 1440, 2048], '(width >= 768px)');
  addSource(small, mobile ? [375, 750] : [750, 1440, 2048]);
  if (mobile) {
    // non-webp fallback for desktop
    const fallback = document.createElement('source');
    fallback.media = '(width >= 768px)';
    fallback.srcset = desktop.src;
    picture.append(fallback);
  }
  const img = document.createElement('img');
  img.src = small.src;
  img.alt = desktop.alt || '';
  img.loading = 'eager';
  img.fetchPriority = 'high';
  img.decoding = 'async';
  picture.append(img);
  return picture;
}

/** Splits an <h1> at its first <br> into two styled lines. */
function decorateTitle(h1) {
  const br = h1.querySelector('br');
  const line1 = document.createElement('span');
  line1.className = 'hero-title-line1';
  if (!br) {
    line1.append(...h1.childNodes);
    h1.append(line1);
    return;
  }
  const line2 = document.createElement('span');
  line2.className = 'hero-title-line2';
  let target = line1;
  [...h1.childNodes].forEach((node) => {
    if (node === br) {
      target = line2;
      node.remove();
    } else {
      target.append(node);
    }
  });
  h1.append(line1, line2);
}

function buildCard(cell) {
  const card = document.createElement('div');
  card.className = 'hero-card';
  const actions = document.createElement('div');
  actions.className = 'hero-actions';
  [...cell.children].forEach((el) => {
    if (el.querySelector('a') && el.textContent.trim() === el.querySelector('a').textContent.trim()) {
      actions.append(el);
    } else {
      card.append(el);
    }
  });
  const h1 = card.querySelector('h1, h2');
  if (h1) decorateTitle(h1);
  if (actions.children.length) card.append(actions);
  return card;
}

function buildTab(row) {
  const link = row.querySelector('a');
  const img = row.querySelector('img');
  const tab = document.createElement(link ? 'a' : 'div');
  tab.className = 'hero-tab';
  if (link) tab.href = link.href;

  const label = (link ? link.textContent : '').trim();
  const brandEl = [...row.querySelectorAll('p, h2, h3, h4, h5, h6')]
    .find((el) => !el.querySelector('a, picture') && el.textContent.trim());
  const brandText = brandEl ? brandEl.textContent.trim() : '';
  if (link) tab.setAttribute('aria-label', [label, brandText].filter(Boolean).join(' – '));

  const text = document.createElement('span');
  text.className = 'hero-tab-text';
  const stack = document.createElement('span');
  stack.className = 'hero-tab-stack';
  if (brandText) {
    const brand = document.createElement('span');
    brand.className = 'hero-tab-brand';
    const name = brandText.replace(/®$/, '');
    brand.textContent = name;
    if (brandEl.querySelector('sup') || name !== brandText) {
      const sup = document.createElement('sup');
      sup.textContent = '®';
      brand.append(sup);
    }
    stack.append(brand);
  }
  if (label) {
    const labelEl = document.createElement('span');
    labelEl.className = 'hero-tab-label';
    labelEl.textContent = label;
    stack.append(labelEl);
  }
  text.append(stack);
  tab.append(text);

  if (img) {
    const media = document.createElement('span');
    media.className = 'hero-tab-image';
    const tabImg = document.createElement('img');
    tabImg.src = img.src;
    tabImg.alt = img.alt || '';
    tabImg.width = 120;
    tabImg.height = 120;
    tabImg.loading = 'lazy';
    media.append(tabImg);
    tab.append(media);
  }
  return tab;
}

export default function decorate(block) {
  const rows = [...block.children];
  let bg;
  let card;
  let tab;

  rows.forEach((row) => {
    const hasHeading = row.querySelector('h1, h2');
    const imgs = [...row.querySelectorAll('img')];
    const onlyImages = imgs.length && !row.textContent.trim();
    if (hasHeading && !card) {
      card = buildCard([...row.children].find((cell) => cell.querySelector('h1, h2')));
    } else if (onlyImages && !bg) {
      bg = document.createElement('div');
      bg.className = 'hero-bg';
      bg.append(buildBackground(imgs[0], imgs[1]));
    } else if (row.querySelector('a') && !tab) {
      tab = buildTab(row);
    }
  });

  const inner = document.createElement('div');
  inner.className = 'hero-inner';
  if (card) inner.append(card);

  block.replaceChildren(...[bg, inner, tab].filter(Boolean));
}
