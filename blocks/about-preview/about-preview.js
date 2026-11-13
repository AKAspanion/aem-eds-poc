import { buildPicture } from '../../scripts/prohance.js';

const ARROW_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

/**
 * Builds one <picture> from a desktop image and an optional mobile image,
 * so only the image for the current viewport is downloaded.
 * @param {HTMLImageElement[]} imgs [desktop, mobile]
 * @returns {HTMLPictureElement}
 */
function buildBackground([desktop, mobile]) {
  // responsive webp (the authored <img> src is a 750px PNG, ~0.5 MB here)
  const picture = buildPicture(desktop, {
    mobile,
    widths: [1200, 1800],
    mobileWidths: [400, 800],
    sizes: '(width >= 768px) 90vw, 100vw',
    breakpoint: '(min-width: 768px)',
    alt: desktop.alt || '',
  });
  picture.className = 'about-preview-bg';
  return picture;
}

/**
 * About Preview
 * Rows (any order):
 * - background: desktop image, then mobile image (same cell or two cells)
 * - content: eyebrow, heading (bold part = blue second line), description, CTA link
 * - feature (one per row): icon | label
 * @param {Element} block
 */
export default function decorate(block) {
  const bgImgs = [];
  const features = [];
  const contentEls = [];

  [...block.children].forEach((row) => {
    const hasText = row.textContent.trim() !== '';
    const icon = row.querySelector('.icon');
    if (icon) {
      features.push({ icon, label: row.textContent.trim() });
    } else if (!hasText && row.querySelector('img')) {
      bgImgs.push(...row.querySelectorAll('img'));
    } else {
      [...row.children].forEach((cell) => contentEls.push(...cell.children));
    }
  });

  const card = document.createElement('div');
  card.className = 'about-preview-card';
  if (bgImgs.length) card.append(buildBackground(bgImgs));

  const content = document.createElement('div');
  content.className = 'about-preview-content';

  const heading = contentEls.find((el) => /^H[1-6]$/.test(el.tagName));
  // the CTA is the last link in the content
  const link = contentEls
    .map((el) => (el.tagName === 'A' ? el : el.querySelector('a')))
    .filter(Boolean)
    .pop();

  let beforeHeading = !!heading;
  contentEls.forEach((el) => {
    if (el === heading) {
      beforeHeading = false;
      content.append(el);
    } else if (link && (el === link || el.contains(link))) {
      // CTA is placed after the features below
    } else if (el.textContent.trim()) {
      el.classList.add(beforeHeading ? 'about-preview-eyebrow' : 'about-preview-description');
      content.append(el);
    }
  });

  if (features.length) {
    const ul = document.createElement('ul');
    ul.className = 'about-preview-features';
    features.forEach(({ icon, label }) => {
      const li = document.createElement('li');
      const circle = document.createElement('span');
      circle.className = 'about-preview-feature-icon';
      circle.append(icon);
      const text = document.createElement('span');
      text.className = 'about-preview-feature-label';
      text.textContent = label;
      li.append(circle, text);
      ul.append(li);
    });
    content.append(ul);
  }

  if (link) {
    const wrapper = document.createElement('p');
    wrapper.className = 'about-preview-cta';
    link.className = 'about-preview-cta-link';
    link.insertAdjacentHTML('beforeend', ARROW_RIGHT);
    wrapper.append(link);
    content.append(wrapper);
  }

  card.append(content);
  block.replaceChildren(card);
}
