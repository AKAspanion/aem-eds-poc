import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Footer (mirrors src/components/common/Footer.tsx). Content comes from the
 * /footer document:
 *   section 1 = logo link + list of social links (`:tiktok:TikTok` etc.)
 *   section 2 = repeated "heading + list of links" columns
 *   section 3 = copyright paragraph + list of legal links
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  if (!fragment) return;
  const [brandSec, linksSec, legalSec] = [...fragment.children]
    .map((s) => s.querySelector('.default-content-wrapper') || s);

  // Document Authoring wraps list item content in <p>; unwrap so li > a holds
  fragment.querySelectorAll('li > p').forEach((p) => p.replaceWith(...p.childNodes));

  // unwrap any links the button decorator touched
  fragment.querySelectorAll('a.button').forEach((a) => { a.className = ''; });
  fragment.querySelectorAll('.button-wrapper').forEach((p) => p.classList.remove('button-wrapper'));

  const inner = document.createElement('div');
  inner.className = 'footer-inner';

  const top = document.createElement('div');
  top.className = 'footer-top';

  // brand column
  const brand = document.createElement('div');
  brand.className = 'footer-brand';
  const logo = brandSec?.querySelector('a');
  if (logo) {
    logo.className = 'footer-logo';
    logo.removeAttribute('title');
    if (!logo.getAttribute('aria-label')) logo.setAttribute('aria-label', 'Home');
    brand.append(logo);
  }
  const divider = document.createElement('div');
  divider.className = 'footer-divider footer-divider-mobile';
  brand.append(divider);
  const social = brandSec?.querySelector('ul');
  if (social) {
    social.className = 'footer-social';
    social.querySelectorAll('a').forEach((a) => {
      const label = a.textContent.trim();
      a.setAttribute('aria-label', label);
      [...a.childNodes].forEach((n) => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
    });
    brand.append(social);
  }
  top.append(brand);

  // link columns: each heading starts a column
  const cols = document.createElement('div');
  cols.className = 'footer-columns';
  let col;
  [...(linksSec?.children || [])].forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName)) {
      col = document.createElement('div');
      col.className = 'footer-column';
      cols.append(col);
    }
    if (col) col.append(el);
  });
  top.append(cols);
  inner.append(top);

  // bottom bar
  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';
  const rule = document.createElement('div');
  rule.className = 'footer-divider';
  const bar = document.createElement('div');
  bar.className = 'footer-legal';
  const copyright = legalSec?.querySelector('p');
  if (copyright) {
    copyright.className = 'footer-copyright';
    bar.append(copyright);
  }
  const legal = legalSec?.querySelector('ul');
  if (legal) {
    legal.className = 'footer-legal-links';
    bar.append(legal);
  }
  bottom.append(rule, bar);
  inner.append(bottom);

  block.append(inner);
}
