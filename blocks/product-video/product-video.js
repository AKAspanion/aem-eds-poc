/*
 * Product Video: sticky product animation that scrubs with page scroll, shown
 * beside the product detail blocks that follow it in the same section
 * (product-benefits, product-nutrition, product-steps, product-wellness).
 *
 * Content model:
 *   | Product Video |
 *   | <poster image> | [Product animation](/path/to/video.mp4) |
 *
 * Performance: only the poster loads with the page. The video is fetched once
 * the visitor starts scrolling near it, never for reduced-motion users.
 */

import { buildPicture } from '../../scripts/prohance.js';
import { el } from '../../scripts/product.js';

function initScrub(wrapper, video) {
  let ticking = false;
  const update = () => {
    ticking = false;
    if (!Number.isFinite(video.duration) || !video.duration) return;
    const rect = wrapper.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
    const time = progress * video.duration;
    if (Math.abs(video.currentTime - time) > 0.05) video.currentTime = time;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  video.addEventListener('loadedmetadata', update);
  update();
}

export default function decorate(block) {
  const img = block.querySelector('img');
  const link = [...block.querySelectorAll('a')].find((a) => /\.(mp4|webm|mov)(\?|#|$)/i.test(a.href))
    || block.querySelector('a');
  const label = link ? link.textContent.trim() : '';

  const stage = el('div', 'product-video-stage');
  if (img) {
    stage.append(buildPicture(img, {
      widths: [400, 600, 900],
      sizes: '(width >= 768px) 570px, 100vw',
      alt: img.alt || label,
    }));
  }
  block.replaceChildren(stage);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!link || reduced) return;

  const wrapper = block.closest('.product-video-wrapper') || block;
  let near = false;
  let loaded = false;

  const load = () => {
    if (loaded || !near) return;
    loaded = true;
    window.removeEventListener('scroll', load);
    const video = el('video', 'product-video-media');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.tabIndex = -1;
    video.setAttribute('aria-hidden', 'true');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.addEventListener('loadeddata', () => block.classList.add('is-ready'), { once: true });
    video.src = link.href;
    stage.append(video);
    initScrub(wrapper, video);
  };

  const observer = new IntersectionObserver((entries) => {
    near = entries.some((e) => e.isIntersecting);
    if (near) {
      observer.disconnect();
      window.addEventListener('scroll', load, { passive: true });
    }
  }, { rootMargin: '100% 0px' });
  observer.observe(block);
}
