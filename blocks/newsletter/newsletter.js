/*
 * Newsletter sign-up banner (email only).
 * Rows:
 *   picture                     background image (optional)
 *   eyebrow, heading, text      copy (eyebrow = a paragraph before the heading, optional)
 *   Placeholder | Add your email....
 *   Button      | Get Updates
 *   Source      | videos        sent as "source" (footer, homeNutriverse, blog, videos)
 *   Success     | Thank you for subscribing!
 *   Error       | Something went wrong. Please try again.
 *   Action      | https://...   endpoint (without it the submit is simulated)
 * Variant: newsletter (panel) = the blog look (dark photo, bold heading, form on a
 * frosted panel). Default = the videos look (gradient overlay, glass pill form).
 * Posts { email, source, website } (website is the honeypot) via submitForm.
 */
import { buildPicture, readConfig, submitForm } from '../../scripts/prohance.js';

const DEFAULTS = {
  placeholder: 'Add your email....',
  button: 'Get Updates',
  source: 'videos',
  success: 'Thank you for subscribing!',
  error: 'Something went wrong. Please try again.',
};

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export default function decorate(block) {
  const isPanel = block.classList.contains('panel');
  const config = {
    ...DEFAULTS,
    ...(isPanel ? { button: 'Get Regular Updates', source: 'blog' } : {}),
    ...readConfig(block, ['placeholder', 'button', 'source', 'success', 'error', 'action']),
  };

  const img = block.querySelector('img');
  const textEls = [...block.querySelectorAll('h1, h2, h3, h4, h5, h6, p')]
    .filter((node) => node.textContent.trim() && !node.querySelector('picture')
      && !node.parentElement.closest('p, h1, h2, h3, h4, h5, h6'));
  const heading = textEls.find((node) => /^H\d$/.test(node.tagName));
  const headingIdx = textEls.indexOf(heading);

  const card = el('div', 'newsletter-card');
  if (img) {
    const bg = el('div', 'newsletter-bg');
    bg.append(buildPicture(img, { widths: [750, 1400], sizes: '(width >= 1280px) 1276px, 100vw', alt: '' }));
    card.append(bg);
  }
  card.append(el('div', 'newsletter-overlay'));

  const content = el('div', 'newsletter-content');
  const copy = el('div', 'newsletter-copy');
  textEls.forEach((node, i) => {
    if (heading && i < headingIdx) node.className = 'newsletter-eyebrow';
    else if (node === heading) node.className = 'newsletter-title';
    else node.className = 'newsletter-text';
    copy.append(node);
  });

  const formWrap = el('div', 'newsletter-form-wrap');
  const form = el('form', 'newsletter-form');
  if (config.action) form.dataset.action = config.action;
  form.name = 'newsletter';

  const honeypot = el('input', 'newsletter-hp');
  Object.assign(honeypot, {
    type: 'text', name: 'website', tabIndex: -1, autocomplete: 'off',
  });
  honeypot.setAttribute('aria-hidden', 'true');

  const source = el('input');
  Object.assign(source, { type: 'hidden', name: 'source', value: config.source });

  const email = el('input', 'newsletter-input');
  Object.assign(email, {
    type: 'email', name: 'email', required: true, placeholder: config.placeholder, autocomplete: 'email',
  });
  email.setAttribute('aria-label', 'Email address');

  const button = el('button', 'newsletter-button');
  button.type = 'submit';
  button.textContent = config.button;

  const status = el('p', 'newsletter-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  form.append(honeypot, source, email, button);
  formWrap.append(form, status);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    email.value = email.value.trim();
    if (!email.value || !form.reportValidity()) return;
    button.disabled = true;
    status.textContent = '';
    status.removeAttribute('data-state');
    let ok = false;
    try {
      ({ ok } = await submitForm(form));
    } catch {
      ok = false;
    }
    button.disabled = false;
    status.dataset.state = ok ? 'success' : 'error';
    status.textContent = ok ? config.success : config.error;
    if (ok) email.value = '';
  });

  content.append(copy, formWrap);
  card.append(content);
  block.replaceChildren(card);
}
