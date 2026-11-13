/*
 * About Hero
 * Row: image (desktop / only) [| mobile image]
 * Row: eyebrow, H1 (line break between lines; bold part = blue), description,
 *      links (bold link = primary pill with arrow, others = outline pill)
 * Rows (optional): stat value | stat label
 */
import { buildPicture } from '../../scripts/prohance.js';

const ARROW_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
const HEADINGS = 'h1, h2, h3, h4, h5, h6';

function buildCtas(links) {
  const wrap = document.createElement('div');
  wrap.className = 'about-hero-ctas';
  links.forEach((a) => {
    const primary = a.classList.contains('primary') || a.classList.contains('accent') || !!a.closest('strong');
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    if (a.title && a.title !== a.textContent) link.title = a.title;
    link.className = `about-hero-cta ${primary ? 'primary' : 'secondary'}`;
    const label = document.createElement('span');
    label.textContent = a.textContent.trim();
    link.append(label);
    if (primary) link.insertAdjacentHTML('beforeend', ARROW_RIGHT);
    if (link.pathname.includes('/modals/')) link.setAttribute('aria-haspopup', 'dialog');
    wrap.append(link);
  });
  return wrap;
}

export default function decorate(block) {
  const imgs = [];
  const content = [];
  const stats = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!row.querySelector(HEADINGS) && row.querySelector('img')) {
      imgs.push(...row.querySelectorAll('img'));
    } else if (row.querySelector(HEADINGS) || cells.length !== 2) {
      cells.forEach((cell) => {
        cell.querySelectorAll('img').forEach((img) => imgs.push(img));
        content.push(...cell.children);
      });
    } else if (row.textContent.trim()) {
      stats.push(cells.map((c) => c.textContent.trim()));
    }
  });

  const inner = document.createElement('div');
  inner.className = 'about-hero-inner';

  const heading = content.find((el) => el.matches(HEADINGS));
  const links = [];
  let beforeHeading = !!heading;
  content.forEach((el) => {
    if (el === heading) {
      beforeHeading = false;
      const h1 = document.createElement('h1');
      h1.append(...heading.childNodes);
      h1.querySelectorAll('strong, em').forEach((s) => {
        const span = document.createElement('span');
        span.className = 'about-hero-accent';
        span.append(...s.childNodes);
        s.replaceWith(span);
      });
      inner.append(h1);
      return;
    }
    const elLinks = el.tagName === 'A' ? [el] : [...el.querySelectorAll('a')];
    if (elLinks.length && el.textContent.trim() === elLinks.map((a) => a.textContent).join('').trim()) {
      links.push(...elLinks);
      return;
    }
    if (!el.textContent.trim()) return;
    el.className = beforeHeading ? 'about-hero-eyebrow' : 'about-hero-description';
    inner.append(el);
  });

  if (imgs.length) {
    const [desktop, mobile] = imgs;
    const media = document.createElement('div');
    media.className = 'about-hero-media';
    media.append(buildPicture(desktop, {
      mobile,
      breakpoint: '(width >= 1024px)',
      widths: [640, 960, 1280],
      mobileWidths: [480, 750, 1080],
      sizes: '(width >= 1280px) 560px, (width >= 1024px) 40vw, 100vw',
      eager: true,
    }));
    inner.append(media);
  }

  if (links.length) inner.append(buildCtas(links));

  if (stats.length) {
    const list = document.createElement('ul');
    list.className = 'about-hero-stats';
    stats.forEach(([value, label = '']) => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="about-hero-stat-value"></span><span class="about-hero-stat-label"></span>';
      li.firstElementChild.textContent = value;
      li.lastElementChild.textContent = label;
      list.append(li);
    });
    inner.append(list);
  }

  block.replaceChildren(inner);
}
