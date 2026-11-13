/*
 * Product Wellness ("Start Your Wellness Journey."): closing panel with an intro
 * and a product image.
 *
 * Content model:
 *   | Product Wellness |
 *   | Badge / ## Line 1<br>Line 2 / Description (optional) / CTA links (optional) | <image> |
 */

import { buildPicture } from '../../scripts/prohance.js';
import { el, buildIntro, introCell } from '../../scripts/product.js';

export default function decorate(block) {
  const intro = introCell(block);
  const img = block.querySelector('img');
  const panel = el('div', 'product-wellness-panel');
  if (intro) panel.append(buildIntro(intro));
  if (img) {
    panel.append(el('div', 'product-wellness-image', buildPicture(img, {
      widths: [400, 800],
      sizes: '(width >= 1024px) 400px, 90vw',
    })));
  } else {
    panel.classList.add('no-image');
  }
  block.replaceChildren(panel);
}
