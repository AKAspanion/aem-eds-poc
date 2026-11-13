/*
 * Contact Hero: eyebrow, two-line title, image and the contact enquiry form.
 *   Row 1: text — eyebrow <p>, H1 (line break between the two lines; the
 *          second line is blue except its first word), form intro <p> | image
 *   Row (optional): Action | /forms/contact (form definition; without it submit is simulated)
 * Submitted fields match ContactEnquiryInput (src/services/forms/types.ts):
 *   fullName, email, phone, age, gender, consentAccepted, website (honeypot)
 */

import { buildPicture, readConfig, submitForm } from '../../scripts/prohance.js';

const ICONS = `${window.hlx?.codeBasePath || ''}/icons`;
const IMAGES = `${window.hlx?.codeBasePath || ''}/images`;
let instance = 0;

const FIELDS = [
  {
    name: 'fullName',
    label: 'Full name',
    icon: 'contact-user',
    size: 16,
    autocomplete: 'name',
    max: 100,
    error: 'Please enter your full name.',
  },
  {
    name: 'email',
    label: 'Email address',
    icon: 'contact-email',
    size: 18,
    type: 'email',
    autocomplete: 'email',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    error: 'Please enter a valid email address.',
  },
  {
    name: 'phone',
    label: 'Phone number',
    icon: 'contact-call',
    size: 16,
    type: 'tel',
    numeric: true,
    autocomplete: 'tel',
    max: 15,
    pattern: /^\d{7,15}$/,
    error: 'Please enter a valid phone number (7–15 digits).',
  },
  {
    name: 'age',
    label: 'Age',
    icon: 'contact-age',
    size: 18,
    numeric: true,
    max: 3,
    pattern: /^\d{1,3}$/,
    error: 'Please enter your age.',
  },
];

const GENDERS = ['female', 'male', 'other'];

const STATUS = {
  success: {
    image: 'contact-success.webp',
    title: 'Success!',
    message: 'You have successfully submitted the details, We will get back to you soon.',
    button: 'OK',
  },
  error: {
    image: 'contact-failure.webp',
    title: 'Submission Unsuccessful',
    message: 'We couldn’t submit your message right now. Please try again in a moment.',
    button: 'Close',
  },
};

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function icon(name, size) {
  return el('img', 'contact-hero-icon', {
    src: `${ICONS}/${name}.svg`, alt: '', width: size, height: size, 'aria-hidden': 'true',
  });
}

/* "We're here<br>to support you." -> line 1 / line 2 with a dark first word */
function decorateTitle(h1) {
  const lines = [[]];
  [...h1.childNodes].forEach((n) => {
    if (n.nodeName === 'BR') lines.push([]);
    else lines.at(-1).push(n);
  });
  const texts = lines.map((l) => l.map((n) => n.textContent).join('').trim()).filter(Boolean);
  if (texts.length < 2) return;
  const [first, ...rest] = texts;
  const line1 = el('span', 'contact-hero-line1');
  line1.textContent = first;
  const line2 = el('span', 'contact-hero-line2');
  const words = rest.join(' ').split(/\s+/);
  const lead = el('span', 'contact-hero-lead');
  lead.textContent = `${words.shift()} `;
  line2.append(lead, words.join(' '));
  h1.replaceChildren(line1, line2);
}

function showStatus(type, onClose) {
  const s = STATUS[type];
  const dialog = el('dialog', 'contact-hero-status', { 'aria-labelledby': 'contact-hero-status-title' });
  const img = el('img', 'contact-hero-status-img', {
    src: `${IMAGES}/${s.image}`, alt: '', width: 152, height: 126,
  });
  const title = el('h2', '', { id: 'contact-hero-status-title' });
  title.textContent = s.title;
  const msg = el('p');
  msg.textContent = s.message;
  const button = el('button', '', { type: 'button', autofocus: '' });
  button.textContent = s.button;
  button.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose();
  });
  dialog.append(img, title, msg, button);
  document.body.append(dialog);
  dialog.showModal();
}

function buildField(f, id) {
  const wrap = el('div', 'contact-hero-field');
  const label = el('label', 'contact-hero-control', { for: `${id}-${f.name}` });
  const sr = el('span', 'sr-only');
  sr.textContent = f.label;
  const input = el('input', '', {
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
  }
  const err = el('p', 'contact-hero-error', { id: `${id}-${f.name}-error` });
  err.hidden = true;
  input.setAttribute('aria-describedby', err.id);
  label.append(icon(f.icon, f.size), sr, input);
  wrap.append(label, err);
  return {
    wrap, input, err, def: f,
  };
}

function validate(field) {
  const { input, def } = field;
  const v = input.value.trim();
  const ok = v.length > 0 && (!def.pattern || def.pattern.test(v));
  input.setAttribute('aria-invalid', ok ? 'false' : 'true');
  field.err.textContent = ok ? '' : def.error;
  field.err.hidden = ok;
  return ok;
}

function buildForm(intro, action, id) {
  const card = el('div', 'contact-hero-card');
  if (intro) {
    intro.className = 'contact-hero-intro';
    card.append(intro);
  }
  const form = el('form', 'contact-hero-form', { novalidate: '' });
  form.name = 'contact-enquiry';
  if (action) form.dataset.action = action;

  const honeypot = el('input', 'contact-hero-hp', {
    type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true',
  });
  const consent = el('input', '', { type: 'hidden', name: 'consentAccepted', value: 'true' });

  const grid = el('div', 'contact-hero-grid');
  const fields = FIELDS.map((f) => {
    const field = buildField(f, id);
    grid.append(field.wrap);
    field.input.addEventListener('input', () => {
      if (field.input.getAttribute('aria-invalid') === 'true') validate(field);
    });
    return field;
  });

  const genders = el('div', 'contact-hero-genders', { role: 'radiogroup', 'aria-label': 'Gender' });
  GENDERS.forEach((g, i) => {
    const label = el('label', 'contact-hero-gender');
    const radio = el('input', '', { type: 'radio', name: 'gender', value: g });
    if (i === 0) radio.checked = true;
    const text = el('span');
    text.textContent = g;
    label.append(radio, text);
    genders.append(label);
  });

  const submit = el('button', 'contact-hero-submit', { type: 'submit' });
  const submitLabel = el('span');
  submitLabel.textContent = 'Send message';
  submit.append(submitLabel, icon('contact-send', 16));

  form.append(honeypot, consent, grid, genders, submit);
  card.append(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = fields.filter((f) => !validate(f));
    if (invalid.length) {
      invalid[0].input.focus();
      return;
    }
    submit.disabled = true;
    submitLabel.textContent = 'Sending...';
    let ok = false;
    try {
      ({ ok } = await submitForm(form));
    } catch {
      ok = false;
    }
    submit.disabled = false;
    submitLabel.textContent = 'Send message';
    if (ok) form.reset();
    showStatus(ok ? 'success' : 'error', () => submit.focus());
  });
  return card;
}

export default function decorate(block) {
  instance += 1;
  const id = `contact-hero-${instance}`;
  const config = readConfig(block, ['action']);
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const imgCell = cells.find((c) => c.querySelector('picture, img'));
  const textCell = cells.find((c) => c !== imgCell && c.textContent.trim());

  const text = el('div', 'contact-hero-text');
  let intro;
  if (textCell) {
    const h1 = textCell.querySelector('h1, h2');
    [...textCell.children].forEach((node) => {
      if (!node.textContent.trim()) return;
      if (node === h1) {
        decorateTitle(node);
        node.classList.add('contact-hero-title');
        text.append(node);
      } else if (h1 && node.compareDocumentPosition(h1) === Node.DOCUMENT_POSITION_FOLLOWING) {
        node.className = 'contact-hero-eyebrow';
        text.append(node);
      } else if (!intro) {
        intro = node;
      }
    });
  }

  const out = [text];
  const img = imgCell?.querySelector('img');
  if (img) {
    const media = el('figure', 'contact-hero-media');
    media.append(buildPicture(img, {
      widths: [480, 750, 1000, 1400],
      sizes: '(width >= 1024px) 52vw, 100vw',
      eager: true,
    }));
    out.push(media);
  }
  out.push(buildForm(intro, config.action, id));
  block.replaceChildren(...out);
}
