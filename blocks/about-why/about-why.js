/*
 * About Why (about-us "Why Prohance" panel)
 * Row 1 (optional): eyebrow + H2 heading
 * Rows 2+: :icon: | title | description
 */
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

function buildIntro(row) {
  const intro = document.createElement('div');
  intro.className = 'about-why-intro';
  const heading = row.querySelector(HEADINGS);
  [...row.querySelectorAll(':scope > div > *')].some((el) => {
    if (el === heading || el.contains(heading)) return true;
    if (el.textContent.trim()) {
      el.className = 'about-why-eyebrow';
      intro.append(el);
    }
    return false;
  });
  const h2 = document.createElement('h2');
  h2.append(...heading.childNodes);
  intro.append(h2);
  return intro;
}

function buildFeature(row) {
  const li = document.createElement('li');
  const icon = row.querySelector('span.icon');
  const badge = document.createElement('span');
  badge.className = 'about-why-badge';
  if (icon) {
    const img = icon.querySelector('img');
    if (img) img.alt = '';
    badge.append(icon);
  }
  li.append(badge);

  const text = document.createElement('div');
  text.className = 'about-why-text';
  const cells = [...row.children].filter((c) => c.textContent.trim());
  const heading = row.querySelector(HEADINGS);
  const title = document.createElement('h3');
  if (heading) {
    title.append(...heading.childNodes);
    heading.remove();
  } else if (cells.length) {
    title.textContent = cells.shift().textContent.trim();
  }
  text.append(title);
  cells.filter((c) => c.textContent.trim()).forEach((cell) => {
    const p = document.createElement('p');
    p.textContent = cell.textContent.trim();
    text.append(p);
  });
  li.append(text);
  return li;
}

export default function decorate(block) {
  const inner = document.createElement('div');
  inner.className = 'about-why-inner';
  const panel = document.createElement('div');
  panel.className = 'about-why-panel';
  const list = document.createElement('ul');
  list.className = 'about-why-features';

  [...block.children].forEach((row, i) => {
    if (i === 0 && row.querySelector(HEADINGS) && !row.querySelector('span.icon')) {
      panel.append(buildIntro(row));
    } else if (row.textContent.trim() || row.querySelector('span.icon')) {
      list.append(buildFeature(row));
    }
  });

  panel.append(list);
  inner.append(panel);
  block.replaceChildren(inner);
}
