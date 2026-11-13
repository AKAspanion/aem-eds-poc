/*
 * Request Sample (free trial form, opened as /modals/request-sample)
 *   Row: intro — H2 title + paragraph
 *   Rows: product — image | category, H3 name, description, list of features,
 *         CTA link | product id (prohance, prohance-dm, prohance-hp)
 *         optionally followed by ", coming soon" (card shown but not selectable)
 *   Row: form heading — H3 (e.g. General Details)
 *   Row: Cities | list (or comma separated) of cities for the City select
 *   Row: Action | /forms/trial-request (form definition; without it submit is simulated)
 * Submitted fields match TrialRequestInput (src/services/forms/types.ts):
 *   fullName, email, phone, address, city, pincode, product, website (honeypot)
 */

import { buildPicture, readConfig, submitForm } from '../../scripts/prohance.js';

const ICONS = `${window.hlx?.codeBasePath || ''}/icons`;
let instance = 0;

const FIELDS = [
  {
    name: 'fullName',
    label: 'Full Name',
    icon: 'sample-user',
    autocomplete: 'name',
    max: 100,
    error: 'Please enter your full name.',
  },
  {
    name: 'phone',
    label: 'Phone Number',
    icon: 'sample-phone',
    type: 'tel',
    numeric: true,
    autocomplete: 'tel',
    max: 15,
    pattern: /^\d{7,15}$/,
    error: 'Please enter a valid phone number (7–15 digits).',
  },
  {
    name: 'email',
    label: 'Email Address',
    icon: 'sample-email',
    type: 'email',
    autocomplete: 'email',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    error: 'Please enter a valid email address.',
  },
  {
    name: 'address',
    label: 'Address',
    icon: 'sample-location',
    autocomplete: 'street-address',
    max: 200,
    error: 'Please enter your address.',
  },
  {
    name: 'city',
    label: 'City',
    icon: 'sample-city',
    select: true,
    error: 'Please select your city.',
  },
  {
    name: 'pincode',
    label: 'Postcode',
    icon: 'sample-postcode',
    numeric: true,
    autocomplete: 'postal-code',
    max: 6,
    pattern: /^\d{5,6}$/,
    error: 'Please enter a valid postcode (5–6 digits).',
  },
];

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function icon(name, size = 16, cls = '') {
  return el('img', `request-sample-icon ${cls}`.trim(), {
    src: `${ICONS}/${name}.svg`, alt: '', width: size, height: size, 'aria-hidden': 'true',
  });
}

function theme(id, flags) {
  if (/teal|blue|red/.test(flags)) return flags.match(/teal|blue|red/)[0];
  if (/-hp\b/.test(id)) return 'red';
  if (/-dm?\b/.test(id)) return 'blue';
  return 'teal';
}

/* Cities row: list items, paragraphs or comma/newline separated text */
function readCities(block) {
  const row = [...block.children].find((r) => r.children.length === 2
    && r.children[0].textContent.trim().toLowerCase() === 'cities');
  if (!row) return [];
  const cell = row.children[1];
  const items = [...cell.querySelectorAll('li')];
  const paras = [...cell.querySelectorAll('p')];
  const text = paras.length ? paras.map((p) => p.textContent).join('\n') : cell.textContent;
  const names = items.length ? items.map((li) => li.textContent) : text.split(/[,\n]/);
  row.remove();
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))];
}

function parseProduct(row) {
  const cells = [...row.children];
  const imgCell = cells.find((c) => c.querySelector('picture, img'));
  const textCell = cells.find((c) => c !== imgCell && c.querySelector('h1, h2, h3, h4, h5, h6'));
  if (!imgCell || !textCell) return null;
  const optCell = cells.find((c) => c !== imgCell && c !== textCell);
  const heading = textCell.querySelector('h1, h2, h3, h4, h5, h6');
  const name = heading.textContent.trim();
  const opts = (optCell?.textContent || '').trim().toLowerCase();
  const id = opts.split(',')[0].trim()
    || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  /* <p> before the heading = category; after it: description, then CTA */
  const paras = [...textCell.querySelectorAll(':scope > p')].filter((p) => p.textContent.trim());
  const kids = [...textCell.children];
  const isBefore = (p) => kids.indexOf(p) < kids.indexOf(heading);
  const before = paras.filter(isBefore);
  const after = paras.filter((p) => !isBefore(p));
  const ctaP = after.find((p) => p.querySelector('a')) || (after.length > 1 ? after.at(-1) : null);
  const desc = after.find((p) => p !== ctaP);
  return {
    id,
    name,
    theme: theme(id, opts),
    soon: /coming\s*soon/.test(opts),
    img: imgCell.querySelector('img'),
    category: before[0]?.textContent.trim() || '',
    description: desc?.textContent.trim() || '',
    features: [...textCell.querySelectorAll('li')].map((li) => li.textContent.trim()).filter(Boolean),
    cta: ctaP?.querySelector('a'),
    ctaText: ctaP?.textContent.trim() || '',
  };
}

function buildCard(p, formId, checked) {
  const card = el('div', `request-sample-card request-sample-${p.theme}`);
  if (p.soon) {
    card.classList.add('is-soon');
    const soon = el('p', 'request-sample-soon');
    soon.textContent = 'Coming Soon';
    card.append(soon);
  }
  const pick = el('label', 'request-sample-pick');
  const input = el('input', 'sr-only', {
    type: 'radio', name: 'product', value: p.id, form: formId,
  });
  if (p.soon) input.disabled = true;
  if (checked) input.checked = true;

  const media = el('div', 'request-sample-media');
  const badge = el('span', 'request-sample-badge');
  badge.append(el('span', 'request-sample-dot', { 'aria-hidden': 'true' }));
  const cat = el('span');
  cat.textContent = p.category;
  badge.append(cat);
  const imgBox = el('div', 'request-sample-img');
  imgBox.append(buildPicture(p.img, { widths: [240, 480], sizes: '(width >= 768px) 174px, 232px' }));
  media.append(
    el('span', 'request-sample-glow', { 'aria-hidden': 'true' }),
    badge,
    el('span', 'request-sample-radio', { 'aria-hidden': 'true' }),
    imgBox,
  );

  const body = el('div', 'request-sample-body');
  const titleRow = el('div', 'request-sample-title');
  const h3 = el('h3');
  h3.textContent = p.name;
  titleRow.append(h3);
  const desc = el('p', 'request-sample-desc');
  desc.textContent = p.description;
  const pills = el('ul', 'request-sample-pills');
  p.features.forEach((f) => {
    const li = el('li');
    li.textContent = f;
    pills.append(li);
  });
  body.append(titleRow, desc, pills);
  pick.append(input, media, body);
  card.append(pick);

  if (p.ctaText) {
    const wrap = el('div', 'request-sample-cta-wrap');
    const live = p.cta && !p.soon;
    const cta = el(live ? 'a' : 'span', 'request-sample-cta');
    if (live) cta.href = p.cta.getAttribute('href');
    else cta.setAttribute('aria-disabled', 'true');
    cta.append(p.ctaText, icon('sample-arrow', 18, 'request-sample-arrow'));
    wrap.append(cta);
    card.append(wrap);
  }
  return card;
}

function buildCarousel(cards) {
  const wrap = el('div', 'request-sample-products');
  const track = el('div', 'request-sample-track', { role: 'radiogroup', 'aria-label': 'Choose a product' });
  cards.forEach((c) => {
    const slide = el('div', 'request-sample-slide');
    slide.append(c);
    track.append(slide);
  });
  const dots = el('div', 'request-sample-dots');
  const slides = [...track.children];
  const buttons = slides.map((slide, i) => {
    const b = el('button', '', { type: 'button', 'aria-label': `Go to slide ${i + 1}` });
    b.addEventListener('click', () => {
      track.scrollTo({ left: slide.offsetLeft + slide.offsetWidth / 2 - track.offsetWidth / 2, behavior: 'smooth' });
    });
    dots.append(b);
    return b;
  });
  const sync = () => {
    const center = track.getBoundingClientRect().left + track.offsetWidth / 2;
    let best = 0;
    let bestD = Infinity;
    slides.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < bestD) { bestD = d; best = i; }
    });
    buttons.forEach((b, i) => b.setAttribute('aria-current', i === best ? 'true' : 'false'));
  };
  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sync);
  }, { passive: true });
  sync();
  wrap.append(track);
  if (slides.length > 1) wrap.append(dots);
  return wrap;
}

function buildField(f, id, cities) {
  const wrap = el('div', 'request-sample-field');
  const label = el('label', 'request-sample-control', { for: `${id}-${f.name}` });
  label.append(icon(f.icon, 16));
  const sr = el('span', 'sr-only');
  sr.textContent = f.label;
  let input;
  if (f.select) {
    input = el('select', '', { id: `${id}-${f.name}`, name: f.name, required: '' });
    const ph = el('option', '', { value: '', disabled: '', selected: '' });
    ph.textContent = f.label;
    input.append(ph);
    cities.forEach((c) => {
      const o = el('option', '', { value: c });
      o.textContent = c;
      input.append(o);
    });
    label.append(sr, input, icon('sample-chevron', 16, 'request-sample-chevron'));
  } else {
    input = el('input', '', {
      id: `${id}-${f.name}`,
      name: f.name,
      type: f.type || 'text',
      placeholder: f.label,
      required: '',
    });
    if (f.autocomplete) input.autocomplete = f.autocomplete;
    if (f.max) input.maxLength = f.max;
    if (f.numeric) {
      input.inputMode = 'numeric';
      input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
    } else if (f.type === 'email') input.inputMode = 'email';
    label.append(sr, input);
  }
  const err = el('p', 'request-sample-error', { id: `${id}-${f.name}-error` });
  err.hidden = true;
  input.setAttribute('aria-describedby', err.id);
  wrap.append(label, err);
  return { wrap, input, err };
}

function validate(field, cities) {
  const { input, def } = field;
  const v = input.value.trim();
  let ok = v.length > 0;
  if (ok && def.pattern) ok = def.pattern.test(v);
  if (ok && def.select) ok = cities.includes(v);
  input.setAttribute('aria-invalid', ok ? 'false' : 'true');
  field.err.textContent = ok ? '' : def.error;
  field.err.hidden = ok;
  return ok;
}

export default function decorate(block) {
  instance += 1;
  const id = `request-sample-${instance}`;
  const formId = `${id}-form`;
  const cities = readCities(block);
  const config = readConfig(block, ['action']);

  let intro;
  let formHeading;
  const products = [];
  [...block.children].forEach((row) => {
    const product = row.querySelector('picture, img') ? parseProduct(row) : null;
    if (product) products.push(product);
    else if (!products.length && !intro) intro = row;
    else if (!formHeading) formHeading = row.querySelector('h1, h2, h3, h4, h5, h6, p');
  });

  const out = [];
  if (intro) {
    const header = el('div', 'request-sample-header');
    const heading = intro.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) header.append(heading);
    [...intro.querySelectorAll('p')].forEach((p) => {
      if (!p.textContent.trim()) return;
      p.classList.add('request-sample-subtitle');
      header.append(p);
    });
    out.push(header);
  }

  const firstOpen = products.findIndex((p) => !p.soon);
  if (products.length) {
    out.push(buildCarousel(products.map((p, i) => buildCard(p, formId, i === firstOpen))));
  }

  const details = el('section', 'request-sample-details');
  if (formHeading) {
    const h3 = el('h3');
    h3.textContent = formHeading.textContent.trim();
    details.append(h3);
  }
  const form = el('form', 'request-sample-form', { id: formId, novalidate: '' });
  form.name = 'trial-request';
  if (config.action) form.dataset.action = config.action;
  const honeypot = el('input', 'request-sample-hp', {
    type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true',
  });
  const grid = el('div', 'request-sample-grid');
  const fields = FIELDS.map((def) => {
    const f = buildField(def, id, cities);
    grid.append(f.wrap);
    return { ...f, def };
  });
  fields.forEach((f) => {
    const recheck = () => { if (f.input.getAttribute('aria-invalid') === 'true') validate(f, cities); };
    f.input.addEventListener('input', recheck);
    f.input.addEventListener('change', recheck);
  });

  const actions = el('div', 'request-sample-actions');
  const cancel = el('button', 'request-sample-cancel', { type: 'button' });
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    const dialog = block.closest('dialog');
    if (dialog) dialog.close();
    else form.reset();
  });
  const submit = el('button', 'request-sample-submit', { type: 'submit' });
  const submitLabel = el('span');
  submitLabel.textContent = 'Request Free Sample';
  submit.append(icon('sample-gift', 20, 'request-sample-gift'), submitLabel);
  actions.append(cancel, submit);
  const formError = el('p', 'request-sample-form-error', { role: 'alert' });
  formError.hidden = true;
  form.append(honeypot, grid, actions, formError);
  details.append(form);
  out.push(details);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = fields.filter((f) => !validate(f, cities));
    if (invalid.length) {
      invalid[0].input.focus();
      return;
    }
    const chosen = block.querySelector('input[name="product"]:checked');
    if (!chosen) {
      formError.textContent = 'Please choose a product.';
      formError.hidden = false;
      return;
    }
    formError.hidden = true;
    submit.disabled = true;
    submitLabel.textContent = 'Submitting...';
    let ok = false;
    try {
      ({ ok } = await submitForm(form));
    } catch {
      ok = false;
    }
    submit.disabled = false;
    submitLabel.textContent = 'Request Free Sample';
    if (!ok) {
      formError.textContent = 'Something went wrong. Please try again.';
      formError.hidden = false;
      return;
    }
    const name = chosen.closest('.request-sample-card')?.querySelector('h3')?.textContent || '';
    const success = el('div', 'request-sample-success', { role: 'status', tabindex: '-1' });
    const title = el('p', 'request-sample-success-title');
    title.textContent = 'Thank you for your interest!';
    const msg = el('p');
    msg.textContent = `${name ? `Your free trial request for ${name} has been received.` : 'Your free trial request has been received.'} Our team will get in touch with you shortly.`;
    success.append(title, msg);
    form.replaceWith(success);
    success.focus();
  });

  block.replaceChildren(...out);
}
