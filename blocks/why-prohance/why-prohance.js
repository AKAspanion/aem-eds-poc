/*
 * Why Prohance
 * Row 1 (optional): eyebrow + heading | description
 * Rows 2+: :icon: | title | description
 */

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/* icon rendered as a CSS mask so it can take the text colour */
function buildIcon(span) {
  const icon = document.createElement('span');
  icon.className = 'why-prohance-icon';
  icon.setAttribute('aria-hidden', 'true');
  const name = [...span.classList].find((c) => c.startsWith('icon-'))?.slice(5);
  const src = span.querySelector('img')?.getAttribute('src')
    || (name && `${window.hlx?.codeBasePath || ''}/icons/${name}.svg`);
  if (src) icon.style.setProperty('--icon', `url("${src}")`);
  return icon;
}

function hasContent(el) {
  return !!(el && (el.textContent.trim() || el.querySelector('img, picture')));
}

/* move a cell's content into a wrapper, wrapping bare text in a <p> */
function moveContent(cell, target) {
  if (cell.querySelector('p, ul, ol')) {
    target.append(...cell.childNodes);
  } else if (cell.textContent.trim()) {
    const p = document.createElement('p');
    p.append(...cell.childNodes);
    target.append(p);
  }
}

function buildIntro(row) {
  const intro = document.createElement('div');
  intro.className = 'why-prohance-intro';
  const cells = [...row.children];
  const headingCell = cells.find((c) => c.querySelector(HEADINGS)) || cells[0];

  const head = document.createElement('div');
  head.className = 'why-prohance-heading';
  const heading = headingCell.querySelector(HEADINGS);
  [...headingCell.children].forEach((el) => {
    if (el === heading) return;
    if (el.textContent.trim()) {
      el.classList.add('why-prohance-eyebrow');
      head.append(el);
    }
  });
  if (heading) head.append(heading);
  intro.append(head);

  const descCells = cells.filter((c) => c !== headingCell && hasContent(c));
  if (descCells.length) {
    const desc = document.createElement('div');
    desc.className = 'why-prohance-description';
    descCells.forEach((c) => moveContent(c, desc));
    intro.append(desc);
  }
  return intro;
}

function buildFeature(row) {
  const li = document.createElement('li');
  const iconSpan = row.querySelector('span.icon');
  if (iconSpan) {
    const badge = document.createElement('div');
    badge.className = 'why-prohance-badge';
    badge.append(buildIcon(iconSpan));
    li.append(badge);
    iconSpan.remove();
  }

  const cells = [...row.children].filter(hasContent);
  const heading = row.querySelector(HEADINGS);
  const title = document.createElement('h3');
  if (heading) {
    title.append(...heading.childNodes);
    heading.remove();
  } else if (cells.length) {
    const first = cells.shift();
    title.textContent = first.textContent.trim();
  }
  if (title.textContent.trim()) li.append(title);

  const text = document.createElement('div');
  text.className = 'why-prohance-text';
  cells.filter(hasContent).forEach((c) => moveContent(c, text));
  if (text.childElementCount) li.append(text);
  return li;
}

export default function decorate(block) {
  /* keep the anchor used by links such as /#why-prohance */
  const section = block.closest('.section');
  if (section && !section.id && !document.getElementById('why-prohance')) section.id = 'why-prohance';
  const rows = [...block.children];
  const inner = document.createElement('div');
  inner.className = 'why-prohance-inner';
  const list = document.createElement('ul');
  list.className = 'why-prohance-features';

  rows.forEach((row, i) => {
    if (i === 0 && row.querySelector(HEADINGS) && !row.querySelector('span.icon')) {
      inner.append(buildIntro(row));
    } else if (hasContent(row)) {
      list.append(buildFeature(row));
    }
  });

  if (list.childElementCount) inner.append(list);
  block.replaceChildren(inner);
}
