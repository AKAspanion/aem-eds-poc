/*
 * Shared helpers for the product detail blocks (product-*). Product colours come
 * from the page metadata `Theme` (prohance | prohance-dm | prohance-hp), which
 * aem.js adds to <body> as a class; each product block maps it to --brand vars.
 *
 *   import { el, buildIntro } from '../../scripts/product.js';
 */

/** Creates an element with an optional class and children. */
export function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== ''));
  return node;
}

/** Plain text of a cell/paragraph, whitespace collapsed. */
export function text(node) {
  return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
}

/** Pill badge with a coloured dot: "• Powered by Science". */
export function buildBadge(label) {
  return el('span', 'product-badge', el('span', 'product-badge-dot'), label);
}

/**
 * Splits a heading at its first <br> into two spans (dark first line, brand
 * coloured second line). Returns the same heading element, decorated.
 * @param {HTMLHeadingElement} heading
 */
export function buildHeading(heading) {
  heading.classList.add('product-heading');
  const nodes = [...heading.childNodes];
  const br = nodes.findIndex((n) => n.nodeName === 'BR');
  const line1 = el('span', 'product-heading-line1');
  const line2 = el('span', 'product-heading-line2');
  nodes.forEach((n, i) => {
    if (i === br) n.remove();
    else if (br === -1 || i < br) line1.append(n);
    else line2.append(n);
  });
  // a heading written as one line with the brand part in italics also works
  if (br === -1) {
    const em = line1.querySelector(':scope > em:last-child');
    if (em && text(line1) !== text(em)) {
      line2.append(...em.childNodes);
      em.remove();
    }
  }
  line1.normalize();
  if (line1.lastChild?.nodeType === Node.TEXT_NODE) {
    line1.lastChild.nodeValue = line1.lastChild.nodeValue.replace(/\s+$/, '');
  }
  heading.replaceChildren(line1);
  if (text(line2)) heading.append(' ', line2);
  return heading;
}

/**
 * Reads an intro cell: an optional badge paragraph before the heading, the
 * heading (h1-h3) and any description paragraphs after it.
 * @param {Element} cell
 * @returns {{ badge: ?HTMLElement, heading: ?HTMLElement, description: HTMLElement[] }}
 */
export function readIntro(cell) {
  const heading = cell.querySelector('h1, h2, h3');
  let badge = null;
  const description = [];
  let seenHeading = !heading;
  [...cell.children].forEach((child) => {
    if (child === heading) {
      seenHeading = true;
      return;
    }
    if (!text(child)) return;
    if (!seenHeading) {
      if (!badge) badge = buildBadge(text(child));
    } else {
      description.push(child);
    }
  });
  return { badge, heading: heading ? buildHeading(heading) : null, description };
}

/** Builds the standard intro block (badge, heading, description) for a cell. */
export function buildIntro(cell, className = 'product-intro') {
  const { badge, heading, description } = readIntro(cell);
  const intro = el('div', className, badge, heading);
  if (description.length) {
    const desc = el('div', 'product-description');
    desc.append(...description);
    intro.append(desc);
  }
  return intro;
}

/** The first cell of a block that holds a heading (the intro cell), if any. */
export function introCell(block) {
  return [...block.querySelectorAll(':scope > div > div')].find((c) => c.querySelector('h1, h2, h3'));
}

/** A cell's content as paragraphs (DA wraps cell text in <p>, plain HTML may not). */
export function cellParagraphs(cell) {
  const paras = [...cell.children].filter((c) => c.tagName === 'P' && text(c));
  if (paras.length) return paras;
  const p = el('p');
  p.append(...cell.childNodes);
  return text(p) ? [p] : [];
}
