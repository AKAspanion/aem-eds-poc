/*
 * Coming Soon (same layout as the 404 / error screens)
 * Row: illustration image
 * Row: H1 title, description paragraphs, CTA link (arrow icon before the label)
 * Cells may also be side by side in one row.
 */
import { buildPicture } from '../../scripts/prohance.js';

const ARROW_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

export default function decorate(block) {
  const inner = document.createElement('div');
  inner.className = 'coming-soon-inner';

  const img = block.querySelector('img');
  if (img) {
    inner.append(buildPicture(img, {
      widths: [640, 850],
      sizes: '(width >= 768px) 425px, 320px',
      eager: true,
    }));
  }

  const text = document.createElement('div');
  text.className = 'coming-soon-text';
  const heading = block.querySelector(HEADINGS);
  if (heading) {
    const h1 = document.createElement('h1');
    h1.append(...heading.childNodes);
    text.append(h1);
  }

  const links = [...block.querySelectorAll('a')];
  const link = links.at(-1);
  const desc = document.createElement('div');
  desc.className = 'coming-soon-description';
  block.querySelectorAll(':scope > div > div > p, :scope > div > div > ul').forEach((el) => {
    const copy = el.textContent.trim();
    if (!copy || (link && el.contains(link) && copy === link.textContent.trim())) return;
    el.removeAttribute('class');
    desc.append(el);
  });
  // a bare-text cell (no <p>) is treated as one description paragraph
  block.querySelectorAll(':scope > div > div').forEach((cell) => {
    if (cell.children.length || !cell.textContent.trim()) return;
    const p = document.createElement('p');
    p.textContent = cell.textContent.trim();
    desc.append(p);
  });
  if (desc.childElementCount) text.append(desc);
  inner.append(text);

  if (link) {
    const cta = document.createElement('a');
    cta.href = link.getAttribute('href');
    cta.className = 'coming-soon-cta';
    cta.innerHTML = ARROW_RIGHT;
    const label = document.createElement('span');
    label.textContent = link.textContent.trim();
    cta.append(label);
    inner.append(cta);
  }

  block.replaceChildren(inner);
}
