/**
 * Video Hero: centered eyebrow, heading and intro over the soft page-top glow.
 *
 * One cell, in reading order:
 *   eyebrow (paragraph before the heading)
 *   heading (H1); italic or bold words render in the accent blue
 *   description (paragraph after the heading)
 * @param {Element} block
 */
export default function decorate(block) {
  const nodes = [...block.querySelectorAll(':scope > div > div')].flatMap((cell) => {
    const children = [...cell.children].filter((el) => /^(P|H[1-6])$/.test(el.tagName));
    if (children.length) return children;
    return cell.textContent.trim() ? [Object.assign(document.createElement('p'), { textContent: cell.textContent.trim() })] : [];
  }).filter((el) => el.textContent.trim());

  const headingIdx = nodes.findIndex((el) => /^H[1-6]$/.test(el.tagName));
  const before = headingIdx > 0 ? nodes.slice(0, headingIdx) : [];
  const after = headingIdx >= 0 ? nodes.slice(headingIdx + 1) : nodes;

  const inner = document.createElement('div');
  inner.className = 'video-hero-inner';

  if (before.length) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'video-hero-eyebrow';
    eyebrow.textContent = before.map((el) => el.textContent.trim()).join(' ');
    inner.append(eyebrow);
  }

  if (headingIdx >= 0) {
    const source = nodes[headingIdx];
    const heading = document.createElement(source.tagName === 'H1' ? 'h1' : source.tagName.toLowerCase());
    heading.className = 'video-hero-title';
    [...source.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && /^(EM|STRONG|I|B|U)$/.test(node.tagName)) {
        const accent = document.createElement('span');
        accent.className = 'video-hero-accent';
        accent.textContent = node.textContent;
        heading.append(accent);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
        heading.append(' ');
      } else {
        heading.append(node.textContent);
      }
    });
    inner.append(heading);
  }

  after.forEach((el) => {
    const p = document.createElement('p');
    p.className = 'video-hero-desc';
    p.textContent = el.textContent.trim();
    inner.append(p);
  });

  const glow = document.createElement('div');
  glow.className = 'video-hero-glow';
  glow.setAttribute('aria-hidden', 'true');
  glow.innerHTML = '<div></div><div></div>';

  block.replaceChildren(glow, inner);
}
