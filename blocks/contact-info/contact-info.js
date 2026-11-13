/*
 * Contact Info: grid of contact cards (ContactInfoCards.tsx).
 * One row per card: :icon-name: | Title | Detail | Note (optional)
 * (cells may also be combined: a heading becomes the title, the following
 * paragraphs the detail and note). Icons: contact-call, contact-mail,
 * contact-office, contact-clock.
 */

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/** Card title level: one below the nearest h1/h2 before the block. */
function cardHeadingLevel(block) {
  const before = [...document.querySelectorAll('main h1, main h2')]
    .filter((h) => !block.contains(h)
      // eslint-disable-next-line no-bitwise
      && (h.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING));
  const last = before.pop();
  return last ? Number(last.tagName[1]) + 1 : 2;
}

/* text pieces of a row in order: block children of cells, or bare cell text */
function pieces(row) {
  const out = [];
  [...row.children].forEach((cell) => {
    const blocks = [...cell.querySelectorAll(':scope > :is(p, h1, h2, h3, h4, h5, h6, ul, ol)')];
    if (blocks.length) {
      blocks.forEach((b) => { if (b.textContent.trim()) out.push(b); });
    } else if (cell.textContent.trim()) {
      const p = el('p');
      p.append(...cell.childNodes);
      out.push(p);
    }
  });
  return out;
}

export default function decorate(block) {
  const level = cardHeadingLevel(block);
  const cards = [...block.children].map((row) => {
    const iconSpan = row.querySelector('span.icon, img');
    const iconImg = iconSpan?.tagName === 'IMG' ? iconSpan : iconSpan?.querySelector('img');
    const name = iconSpan?.classList
      ? [...iconSpan.classList].find((c) => c.startsWith('icon-'))?.slice(5) : '';
    const src = iconImg?.getAttribute('src')
      || (name ? `${window.hlx?.codeBasePath || ''}/icons/${name}.svg` : '');
    iconSpan?.remove();
    const parts = pieces(row);
    if (!parts.length) return null;

    const card = el('div', 'contact-info-card');
    const box = el('div', 'contact-info-icon');
    if (src) {
      const img = el('img');
      img.src = src;
      img.alt = '';
      img.width = 20;
      img.height = 20;
      img.loading = 'lazy';
      box.append(img);
    }
    const headingIdx = parts.findIndex((p) => /^H\d$/.test(p.tagName));
    const [titleNode] = parts.splice(headingIdx > -1 ? headingIdx : 0, 1);
    const title = el(`h${level}`, 'contact-info-title');
    title.append(...titleNode.childNodes);
    card.append(box, title);
    parts.forEach((p, i) => {
      const line = el('p', i === 0 ? 'contact-info-value' : 'contact-info-note');
      line.append(...p.childNodes);
      card.append(line);
    });
    return card;
  }).filter(Boolean);
  block.replaceChildren(...cards);
}
