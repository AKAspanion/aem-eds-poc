/*
 * FAQ
 * Row 1 (optional): background picture, eyebrow, H2 title, H3 categories title
 * Rows 2+: category (with :icon:) | question | answer
 *   - leave the category cell empty to reuse the category of the row above
 *   - the first :icon: found for a category is used for it
 */

const HEADINGS = 'h1, h2, h3, h4, h5, h6';
let instance = 0;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function iconSrc(span) {
  if (!span) return '';
  const name = [...span.classList].find((c) => c.startsWith('icon-'))?.slice(5);
  return span.querySelector('img')?.getAttribute('src')
    || (name ? `${window.hlx?.codeBasePath || ''}/icons/${name}.svg` : '');
}

/* icon drawn as a CSS mask so it follows the text colour (active / inactive) */
function buildIcon(src) {
  const box = el('span', 'faq-cat-icon-box', { 'aria-hidden': 'true' });
  const icon = el('span', 'faq-cat-icon');
  if (src) icon.style.setProperty('--icon', `url("${src}")`);
  box.append(icon);
  return box;
}

/* move a cell's content into a target, wrapping bare text in a <p> */
function moveContent(cell, target) {
  if (cell.querySelector('p, ul, ol')) {
    target.append(...cell.childNodes);
  } else if (cell.textContent.trim()) {
    const p = document.createElement('p');
    p.append(...cell.childNodes);
    target.append(p);
  }
}

function parseIntro(row, block) {
  const header = el('div', 'faq-header');
  let title;
  let navTitle;
  const picture = row.querySelector('picture');
  if (picture) {
    const bg = el('div', 'faq-bg');
    const img = picture.querySelector('img');
    if (img) {
      img.alt = '';
      img.loading = 'lazy';
    }
    bg.append(picture);
    block.prepend(bg);
  }
  [...row.children].forEach((cell) => {
    const nodes = cell.children.length ? [...cell.children] : [];
    if (!nodes.length && cell.textContent.trim()) {
      const p = document.createElement('p');
      p.append(...cell.childNodes);
      nodes.push(p);
    }
    nodes.forEach((node) => {
      if (!node.textContent.trim()) return;
      if (node.matches(HEADINGS)) {
        if (!title) {
          title = node;
          header.append(node);
        } else if (!navTitle) navTitle = node;
      } else if (!title) {
        node.classList.add('faq-eyebrow');
        header.append(node);
      }
    });
  });
  return { header, navTitle };
}

export default function decorate(block) {
  /* keep the anchor used by links such as /#faq */
  const section = block.closest('.section');
  if (section && !section.id && !document.getElementById('faq')) section.id = 'faq';
  instance += 1;
  const id = `faq-${instance}`;
  const rows = [...block.children];
  let intro = { header: null, navTitle: null };

  const first = rows[0];
  if (first && (first.querySelector(HEADINGS) || first.querySelector('picture'))) {
    intro = parseIntro(rows.shift(), block);
  }
  if (!block.querySelector('.faq-bg')) block.classList.add('faq-default-bg');

  /* categories in order of first appearance */
  const categories = new Map();
  const items = [];
  let current;
  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const catCell = cells.length >= 3 ? cells.shift() : null;
    const [qCell, ...aCells] = cells;
    const label = catCell?.textContent.trim() || '';
    if (label || !current) {
      const key = label.toLowerCase();
      if (!categories.has(key)) categories.set(key, { label, src: '' });
      current = categories.get(key);
    }
    if (!current.src) current.src = iconSrc(catCell?.querySelector('span.icon'));
    const question = qCell.textContent.trim();
    if (question) items.push({ cat: current, question, aCells });
  });

  const cats = [...categories.values()];
  const showNav = cats.length > 1 || (cats.length === 1 && cats[0].label);

  const inner = el('div', 'faq-inner');
  if (intro.header?.childElementCount) inner.append(intro.header);
  const body = el('div', 'faq-body');
  inner.append(body);

  /* accordion: native <details> with a shared name = single open */
  const list = el('div', 'faq-questions', { id: `${id}-questions` });
  const details = items.map((item, i) => {
    const d = el('details', 'faq-item', { name: `${id}-accordion` });
    d.dataset.cat = cats.indexOf(item.cat);
    const summary = el('summary');
    const q = el('span', 'faq-question');
    q.textContent = item.question;
    summary.append(q);
    const answer = el('div', 'faq-answer', { id: `${id}-a${i}` });
    item.aCells.forEach((c) => moveContent(c, answer));
    d.append(summary, answer);
    list.append(d);
    return d;
  });
  /* fallback for browsers without exclusive <details name> */
  list.addEventListener('toggle', (e) => {
    if (!e.target.open) return;
    details.forEach((d) => { if (d !== e.target && d.open) d.open = false; });
  }, true);

  if (showNav) {
    const nav = el('div', 'faq-nav');
    const titleId = `${id}-categories-title`;
    if (intro.navTitle) {
      const h3 = el('h3', 'faq-nav-title', { id: titleId });
      h3.append(...intro.navTitle.childNodes);
      nav.append(h3);
    }

    const select = el('div', 'faq-select');
    const toggle = el('button', 'faq-select-toggle', {
      type: 'button',
      'aria-expanded': 'false',
      'aria-controls': `${id}-categories`,
    });
    const toggleMain = el('span', 'faq-cat-main');
    const toggleIcon = buildIcon('');
    const toggleLabel = el('span', 'faq-cat-label');
    toggleMain.append(toggleIcon, toggleLabel);
    toggle.append(toggleMain, el('span', 'faq-chevron', { 'aria-hidden': 'true' }));

    const catList = el('div', 'faq-cat-list', { id: `${id}-categories`, role: 'group' });
    if (intro.navTitle) catList.setAttribute('aria-labelledby', titleId);
    else catList.setAttribute('aria-label', 'Categories');

    const buttons = cats.map((cat, i) => {
      const btn = el('button', 'faq-cat', {
        type: 'button',
        'aria-pressed': 'false',
        'aria-controls': list.id,
      });
      btn.dataset.cat = i;
      const main = el('span', 'faq-cat-main');
      const label = el('span', 'faq-cat-label');
      label.textContent = cat.label;
      main.append(buildIcon(cat.src), label);
      btn.append(main, el('span', 'faq-chevron', { 'aria-hidden': 'true' }));
      catList.append(btn);
      return btn;
    });

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open);
    };
    const onOutside = (e) => { if (!select.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    };
    document.addEventListener('click', onOutside);
    nav.addEventListener('keydown', onKey);

    const activate = (index) => {
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', i === index));
      details.forEach((d) => {
        const match = Number(d.dataset.cat) === index;
        d.hidden = !match;
        if (!match) d.open = false;
      });
      const cat = cats[index];
      toggleLabel.textContent = cat.label;
      toggleIcon.firstElementChild.style.setProperty('--icon', cat.src ? `url("${cat.src}")` : 'none');
    };

    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    catList.addEventListener('click', (e) => {
      const btn = e.target.closest('.faq-cat');
      if (!btn) return;
      activate(Number(btn.dataset.cat));
      setOpen(false);
    });

    select.append(toggle, catList);
    nav.append(select);
    body.append(nav);
    activate(0);
  }

  body.append(list);
  block.replaceChildren(...block.querySelectorAll(':scope > .faq-bg'), inner);
}
