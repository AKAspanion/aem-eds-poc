/*
 * Blog hero: centred eyebrow, heading and intro over soft colour blobs.
 * One cell: eyebrow paragraph, heading (bold/italic part is shown in brand
 * blue and drops to its own line below 768px), description paragraph.
 * Use H1 on the listing page and H2 on article pages (the article title is the H1).
 */
export default function decorate(block) {
  const items = [...block.querySelectorAll('h1, h2, h3, h4, h5, h6, p')]
    .filter((el) => el.textContent.trim() && !el.parentElement.closest('p, h1, h2, h3, h4, h5, h6'));
  const heading = items.find((el) => /^H\d$/.test(el.tagName));
  const before = heading ? items.slice(0, items.indexOf(heading)) : [];
  const after = heading ? items.slice(items.indexOf(heading) + 1) : items;

  const blobs = document.createElement('div');
  blobs.className = 'blog-hero-blobs';
  blobs.setAttribute('aria-hidden', 'true');
  blobs.innerHTML = '<span></span><span></span>';

  const inner = document.createElement('div');
  inner.className = 'blog-hero-inner';
  if (before.length) {
    before[0].className = 'blog-hero-eyebrow';
    inner.append(before[0]);
  }
  if (heading) {
    heading.className = 'blog-hero-title';
    heading.querySelectorAll('strong, em').forEach((el) => {
      const span = document.createElement('span');
      span.className = 'blog-hero-accent';
      span.append(...el.childNodes);
      el.replaceWith(span);
    });
    inner.append(heading);
  }
  after.forEach((p) => {
    p.className = 'blog-hero-text';
    inner.append(p);
  });

  block.replaceChildren(blobs, inner);
}
