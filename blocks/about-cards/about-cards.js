/*
 * About Cards (about-us story cards and value cards)
 * Row 1 (optional): eyebrow + H2 heading (one cell, no image)
 * Rows 2+: one card per row: [image |] title | description
 *   Cards with an image render as tall media cards (Purpose / Mission / Vision);
 *   cards without render as compact text cards (Values).
 */
import { buildPicture } from '../../scripts/prohance.js';

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

function buildIntro(row) {
  const intro = document.createElement('div');
  intro.className = 'about-cards-intro';
  const cell = row.firstElementChild;
  const heading = cell.querySelector(HEADINGS);
  [...cell.children].some((el) => {
    if (el === heading || el.contains(heading)) return true;
    if (el.textContent.trim()) {
      el.className = 'about-cards-eyebrow';
      intro.append(el);
    }
    return false;
  });
  const h2 = document.createElement('h2');
  h2.append(...heading.childNodes);
  intro.append(h2);
  return intro;
}

function buildCard(row) {
  const li = document.createElement('li');
  const img = row.querySelector('img');
  if (img) {
    const media = document.createElement('div');
    media.className = 'about-cards-media';
    media.append(buildPicture(img, { widths: [480, 828], sizes: '(width >= 1024px) 413px, 100vw' }));
    li.append(media);
    li.classList.add('has-media');
    img.closest('picture')?.remove();
    img.remove();
  }

  const body = document.createElement('div');
  body.className = 'about-cards-body';
  const title = document.createElement('h3');
  const heading = row.querySelector(HEADINGS);
  const cells = [...row.children].filter((c) => c.textContent.trim());
  if (heading) {
    title.append(...heading.childNodes);
    heading.remove();
  } else if (cells.length > 1) {
    title.textContent = cells.shift().textContent.trim();
  }
  if (title.textContent.trim()) body.append(title);

  cells.filter((c) => c.textContent.trim()).forEach((cell) => {
    const ps = [...cell.querySelectorAll('p')].filter((p) => p.textContent.trim());
    if (ps.length) {
      body.append(...ps);
    } else {
      const p = document.createElement('p');
      p.textContent = cell.textContent.trim();
      body.append(p);
    }
  });
  li.append(body);
  return li;
}

export default function decorate(block) {
  const inner = document.createElement('div');
  inner.className = 'about-cards-inner';
  const list = document.createElement('ul');
  list.className = 'about-cards-list';

  [...block.children].forEach((row, i) => {
    const heading = row.querySelector(HEADINGS);
    if (i === 0 && heading && !row.querySelector('img') && row.children.length === 1) {
      inner.append(buildIntro(row));
    } else if (row.textContent.trim() || row.querySelector('img')) {
      list.append(buildCard(row));
    }
  });

  if (list.querySelector('.has-media')) block.classList.add('media');
  inner.append(list);
  block.replaceChildren(inner);
}
