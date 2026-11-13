/*
 * Product Benefits ("Balanced Nutrition. Backed by Science."): intro plus a grid
 * of nutrient cards with a brand-coloured icon tile.
 *
 * Content model:
 *   | Product Benefits |
 *   | Badge / ## Line 1<br>Line 2 / Description (optional) |   intro row
 *   | :icon-name: | Title | Description |                       one row per card
 *
 * Icons are files in /icons (e.g. activity, bone, leaf, vitamin, heart-pulse,
 * shield-check); they are shown white on the brand colour whatever their colour.
 */

import {
  el, text, buildIntro, introCell, cellParagraphs,
} from '../../scripts/product.js';

function buildCard(row) {
  const cells = [...row.children];
  const icon = row.querySelector('.icon, img');
  const textCells = cells.filter((c) => text(c));
  // the icon may share a cell with the title (":leaf: Prebiotic FOS")
  const [titleCell, ...rest] = textCells;
  const card = el('li', 'product-benefits-card');
  const tile = el('span', 'product-benefits-icon');
  if (icon) tile.append(icon.closest('.icon') || icon);
  card.append(tile);
  const body = el('div', 'product-benefits-body');
  if (titleCell) body.append(el('h3', '', text(titleCell)));
  rest.forEach((c) => body.append(...cellParagraphs(c)));
  card.append(body);
  return card;
}

export default function decorate(block) {
  const rows = [...block.children];
  const intro = introCell(block);
  const introRow = intro?.parentElement;
  const list = el('ul', 'product-benefits-grid');
  rows.forEach((row) => {
    if (row === introRow || !text(row)) return;
    list.append(buildCard(row));
  });
  const children = [];
  if (intro) children.push(buildIntro(intro));
  if (list.children.length) children.push(list);
  block.replaceChildren(...children);
}
