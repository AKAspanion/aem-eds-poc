/*
 * Product Steps ("How to Prepare"): intro, numbered step cards and a footnote.
 *
 * Content model:
 *   | Product Steps |
 *   | Badge / ## Line 1<br>Line 2 |                         intro row
 *   | <image> | Pour | 175 ml of cold water into a glass. |  one row per step (auto-numbered)
 *   | Tip · For a better taste, chill before serving. |     optional note (row without image)
 */

import { buildPicture } from '../../scripts/prohance.js';
import {
  el, text, buildIntro, introCell, cellParagraphs,
} from '../../scripts/product.js';

function buildStep(row, number) {
  const img = row.querySelector('img');
  const [titleCell, ...rest] = [...row.children].filter((c) => text(c));
  const title = text(titleCell);
  const frame = el('div', 'product-steps-image');
  if (img) {
    frame.append(buildPicture(img, {
      widths: [240, 480],
      sizes: '(width >= 1280px) 200px, (width >= 768px) 25vw, 45vw',
      alt: img.alt || `Step ${number}: ${title}`,
    }));
  }
  const body = el('div', 'product-steps-body');
  if (title) body.append(el('h3', '', title));
  rest.forEach((c) => body.append(...cellParagraphs(c)));
  return el(
    'li',
    'product-steps-card',
    el('span', 'product-steps-number', `Step ${number}`),
    frame,
    body,
  );
}

export default function decorate(block) {
  const intro = introCell(block);
  const introRow = intro?.parentElement;
  const list = el('ol', 'product-steps-grid');
  const notes = [];

  [...block.children].forEach((row) => {
    if (row === introRow || (!text(row) && !row.querySelector('img'))) return;
    if (row.querySelector('img')) {
      list.append(buildStep(row, list.children.length + 1));
    } else {
      [...row.children].forEach((c) => notes.push(...cellParagraphs(c)));
    }
  });

  const children = [];
  if (intro) children.push(buildIntro(intro));
  if (list.children.length) children.push(list);
  if (notes.length) children.push(el('div', 'product-steps-note', ...notes));
  block.replaceChildren(...children);
}
