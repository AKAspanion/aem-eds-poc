/*
 * Product Nutrition ("Nutritional Information"): intro plus a nutrition table
 * with one tab per value column (e.g. Per Serving / Per 100g), a mini bar per
 * nutrient, and grouped name/value lists (e.g. Vitamins & Minerals).
 *
 * Content model:
 *   | Product Nutrition |
 *   | Badge / ## Heading line 1<br>line 2 (optional) |       intro row
 *   | Nutrient | Per Serving (55g) | Per 100g |                header row: tab labels
 *   | Energy | 221 kcal | 442 kcal |                          one row per nutrient
 *   | ... |
 *   | Vitamins & Minerals |                                    one-cell row: starts a group
 *   | Vitamin C | 35 mg (40% NRV) |                            one row per group item
 *
 * Bars compare each value to the largest value in its row (minimum 8% width).
 */

import {
  el, text, buildIntro, introCell,
} from '../../scripts/product.js';

let instance = 0;

const parseNumber = (value) => {
  const m = value.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};

const startsWithNumber = (value) => /^[<>~≈]?\s*-?\d/.test(value);

function buildRow(name, value, max) {
  const num = parseNumber(value);
  const pct = Number.isFinite(num) && max > 0 ? Math.min((num / max) * 100, 100) : 0;
  const fill = el('span', 'product-nutrition-bar-fill');
  fill.style.width = `${Math.max(pct, 8)}%`;
  return el(
    'li',
    'product-nutrition-row',
    el('span', 'product-nutrition-name', name),
    el(
      'span',
      'product-nutrition-measure',
      el('span', 'product-nutrition-bar', fill),
      el('span', 'product-nutrition-value', value),
    ),
  );
}

function buildColumn(label, nutrients, index, secondary) {
  const list = el('ul', 'product-nutrition-rows');
  nutrients.forEach((n) => list.append(buildRow(n.name, n.values[index] || '', n.max)));
  return el(
    'div',
    `product-nutrition-column${secondary ? ' is-secondary' : ''}`,
    el('h3', 'product-nutrition-label', label),
    list,
  );
}

function buildTabs(labels, nutrients) {
  instance += 1;
  const id = `product-nutrition-${instance}`;
  const tablist = el('div', 'product-nutrition-tabs');
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Nutrition values');
  const tabs = [];
  const panels = [];

  const select = (index, focus) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  };

  labels.forEach((label, i) => {
    const tab = el('button', 'product-nutrition-tab', label);
    tab.type = 'button';
    tab.id = `${id}-tab-${i}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${id}-panel-${i}`);
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowLeft: -1 };
      if (keys[e.key]) {
        e.preventDefault();
        select((i + keys[e.key] + labels.length) % labels.length, true);
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        select(e.key === 'Home' ? 0 : labels.length - 1, true);
      }
    });
    tabs.push(tab);
    tablist.append(tab);

    // active column first, then the others (shown alongside from 768px)
    const order = [i, ...labels.map((_, n) => n).filter((n) => n !== i)];
    const columns = el('div', 'product-nutrition-columns');
    order.forEach((n, pos) => columns.append(buildColumn(labels[n], nutrients, n, pos > 0)));
    const panel = el('div', 'product-nutrition-panel-tab', columns);
    panel.id = `${id}-panel-${i}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panels.push(panel);
  });

  select(0);
  return [tablist, ...panels];
}

function buildGroup(group) {
  const list = el('ul', 'product-nutrition-group-list');
  group.items.forEach(([name, value]) => list.append(el(
    'li',
    'product-nutrition-group-item',
    el('span', 'product-nutrition-group-name', name),
    el('span', 'product-nutrition-group-value', value),
  )));
  return el('div', 'product-nutrition-group', el('h3', 'product-nutrition-label', group.title), list);
}

export default function decorate(block) {
  const intro = introCell(block);
  const introRow = intro?.parentElement;
  let labels = null;
  const nutrients = [];
  const groups = [];

  [...block.children].forEach((row) => {
    if (row === introRow) return;
    const cells = [...row.children].map(text);
    while (cells.length && !cells[cells.length - 1]) cells.pop();
    if (!cells.length) return;
    const [name, ...values] = cells;

    if (values.length === 0) {
      groups.push({ title: name, items: [] });
    } else if (groups.length) {
      groups[groups.length - 1].items.push([name, values.join(' ')]);
    } else if (!labels && !nutrients.length && !values.some(startsWithNumber)) {
      labels = values;
    } else {
      const nums = values.map(parseNumber).filter(Number.isFinite);
      const max = Math.max(0, ...nums) || 100;
      nutrients.push({ name, values, max });
    }
  });

  const panel = el('div', 'product-nutrition-panel');
  if (nutrients.length) {
    const count = Math.max(...nutrients.map((n) => n.values.length));
    const tabLabels = Array.from({ length: count }, (_, i) => labels?.[i] || `Column ${i + 1}`);
    panel.append(...buildTabs(tabLabels, nutrients));
  }
  groups.filter((g) => g.items.length).forEach((g) => panel.append(buildGroup(g)));

  block.replaceChildren(...[intro && buildIntro(intro), panel].filter(Boolean));
}
