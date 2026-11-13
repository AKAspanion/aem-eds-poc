import { buildPicture } from '../../scripts/prohance.js';

const ARROW_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
const ARROW_UP_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>';

const AUTOPLAY_MS = 10000;
const MOBILE_MQ = '(max-width: 767px)';

/**
 * One <picture> from a desktop image and an optional mobile image (swap at 768px),
 * so only one of them is downloaded.
 */
function buildBackground([desktop, mobile]) {
  // responsive webp (the authored <img> src is a 750px PNG, ~0.5 MB here)
  const picture = buildPicture(desktop, {
    mobile,
    widths: [1200, 1800],
    mobileWidths: [400, 800],
    sizes: '(width >= 768px) 90vw, 100vw',
    breakpoint: '(min-width: 768px)',
    alt: desktop.alt || '',
  });
  picture.className = 'nutriverse-bg';
  return picture;
}

/** Text elements of a cell: its block children, or the cell itself for bare text. */
function cellLines(cell) {
  const children = [...cell.children].filter((el) => /^(P|H[1-6]|DIV)$/.test(el.tagName));
  return (children.length ? children : [cell]).filter((el) => el.textContent.trim());
}

/**
 * Card row: image | title (heading), subtitle, link ("View More") | optional badge text.
 * A badge (e.g. "Coming Soon") marks the card as not yet available (not clickable).
 */
function buildCard(row) {
  const cells = [...row.children];
  const img = row.querySelector('img');
  const textCells = cells.filter((cell) => cell.textContent.trim());
  const badgeCell = textCells.length > 1 ? textCells.pop() : null;
  const lines = textCells.flatMap(cellLines);
  const link = row.querySelector('a[href]');
  const linkLine = link ? lines.find((el) => el.contains(link)) : null;
  const rest = lines.filter((el) => el !== linkLine);
  const headingIdx = rest.findIndex((el) => /^H[1-6]$/.test(el.tagName));
  const titleEl = headingIdx >= 0 ? rest.splice(headingIdx, 1)[0] : rest.shift();
  const subtitleEl = rest.shift();
  const badge = badgeCell ? badgeCell.textContent.trim() : '';

  const card = document.createElement(link && !badge ? 'a' : 'div');
  card.className = 'nutriverse-card';
  if (card.tagName === 'A') card.href = link.getAttribute('href');
  if (badge) {
    card.classList.add('is-disabled');
    card.insertAdjacentHTML('beforeend', '<span class="nutriverse-badge"></span>');
    card.lastElementChild.textContent = badge;
  }
  if (img) {
    // the authored picture serves 2000px on desktop for a ~360px card
    card.append(buildPicture(img, {
      widths: [400, 800],
      sizes: '(width >= 768px) 30vw, 90vw',
    }));
  }

  const top = document.createElement('div');
  top.className = 'nutriverse-card-top';
  const title = document.createElement('h3');
  title.textContent = titleEl ? titleEl.textContent.trim() : '';
  top.append(title);

  const bottom = document.createElement('div');
  bottom.className = 'nutriverse-card-bottom';
  if (subtitleEl) {
    const subtitle = document.createElement('p');
    subtitle.textContent = subtitleEl.textContent.trim();
    bottom.append(subtitle);
  }
  const more = document.createElement('span');
  more.className = 'nutriverse-card-more';
  more.textContent = (link && link.textContent.trim()) || 'View More';
  more.insertAdjacentHTML('beforeend', ARROW_UP_RIGHT);
  bottom.append(more);

  card.append(top, bottom);
  const li = document.createElement('li');
  li.append(card);
  return li;
}

/** Mobile-only autoplaying scroll-snap carousel (no dots), pauses on hover/focus. */
function initCarousel(viewport, track) {
  const count = track.children.length;
  if (count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const mq = window.matchMedia(MOBILE_MQ);
  let paused = false;
  viewport.addEventListener('pointerenter', () => { paused = true; });
  viewport.addEventListener('pointerleave', () => { paused = false; });
  viewport.addEventListener('focusin', () => { paused = true; });
  viewport.addEventListener('focusout', () => { paused = false; });
  setInterval(() => {
    if (!mq.matches || paused || document.hidden) return;
    const width = track.clientWidth || 1;
    const next = (Math.round(track.scrollLeft / width) + 1) % count;
    track.scrollTo({ left: next * width, behavior: 'smooth' });
  }, AUTOPLAY_MS);
}

/**
 * Nutriverse
 * Rows (any order):
 * - background: desktop image, then mobile image
 * - intro: heading (bold part in brand blue) + description
 * - card (one per row): image | title, subtitle, link | optional badge
 * - explore: a single link
 * @param {Element} block
 */
export default function decorate(block) {
  const bgImgs = [];
  const intro = document.createElement('div');
  intro.className = 'nutriverse-intro';
  const cards = document.createElement('ul');
  cards.className = 'nutriverse-cards';
  let exploreLink;

  [...block.children].forEach((row) => {
    const hasText = row.textContent.trim() !== '';
    const img = row.querySelector('img');
    const link = row.querySelector('a[href]');
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    if (img && !hasText) {
      bgImgs.push(...row.querySelectorAll('img'));
    } else if (img) {
      cards.append(buildCard(row));
    } else if (!heading && link && row.textContent.trim() === link.textContent.trim()) {
      exploreLink = link;
    } else if (hasText) {
      [...row.children].forEach((cell) => intro.append(...cellLines(cell)));
    }
  });

  const panel = document.createElement('div');
  panel.className = 'nutriverse-panel';
  if (bgImgs.length) panel.append(buildBackground(bgImgs));

  const content = document.createElement('div');
  content.className = 'nutriverse-content';
  if (intro.children.length) content.append(intro);

  const viewport = document.createElement('div');
  viewport.className = 'nutriverse-carousel';
  viewport.append(cards);
  if (cards.children.length) content.append(viewport);

  if (exploreLink) {
    const p = document.createElement('p');
    p.className = 'nutriverse-explore';
    exploreLink.removeAttribute('class');
    exploreLink.insertAdjacentHTML('beforeend', ARROW_RIGHT);
    p.append(exploreLink);
    content.append(p);
  }

  panel.append(content);
  block.replaceChildren(panel);
  initCarousel(viewport, cards);
}
