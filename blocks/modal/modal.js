/*
 * Modal
 * Links to /modals/<name> open that page in a dialog (wired in scripts/scripts.js,
 * which calls openModal). The page is authored like any other DA page.
 *
 * Optional authored block (for inline modal content on a page):
 *   Row 1: trigger label (plain text or a link to /modals/<name>)
 *   Rows 2+: dialog content
 */

import { loadCSS } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const CSS = `${window.hlx?.codeBasePath || ''}/blocks/modal/modal.css`;
let open = 0;

/**
 * Shows nodes in a native modal dialog.
 * @param {Node[]} nodes dialog content
 * @param {object} [opts]
 * @param {string} [opts.label] accessible name when the content has no heading
 * @param {string} [opts.name] extra class suffix: modal-<name>
 * @param {HTMLElement} [opts.trigger] element to refocus on close (default: active element)
 * @returns {Promise<HTMLDialogElement>}
 */
export async function createModal(nodes, opts = {}) {
  const trigger = opts.trigger || document.activeElement;
  await loadCSS(CSS);
  const dialog = document.createElement('dialog');
  dialog.className = 'modal-dialog';
  if (opts.name) dialog.classList.add(`modal-${opts.name}`);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'modal-close';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => dialog.close());

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.append(...nodes);
  dialog.append(close, content);

  const heading = content.querySelector('h1, h2, h3');
  if (heading) {
    heading.id = heading.id || `modal-title-${Date.now()}`;
    dialog.setAttribute('aria-labelledby', heading.id);
  } else if (opts.label) {
    dialog.setAttribute('aria-label', opts.label);
  }

  /* backdrop click: the dialog element itself is only hit outside its box */
  dialog.addEventListener('mousedown', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right
      && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  });

  dialog.addEventListener('close', () => {
    open -= 1;
    if (!open) document.body.classList.remove('modal-open');
    dialog.remove();
    if (trigger && typeof trigger.focus === 'function') trigger.focus();
  });

  document.body.append(dialog);
  open += 1;
  document.body.classList.add('modal-open');
  /* showModal makes the page inert and focuses the first focusable (close) */
  dialog.showModal();
  return dialog;
}

/**
 * Loads a page as a fragment and shows it in a modal dialog.
 * @param {string} path page path, e.g. /modals/request-sample
 */
export async function openModal(path) {
  // Safari does not focus links on click, so the active element is <body>;
  // fall back to the link that points at this modal so focus returns to it
  let trigger = document.activeElement;
  if (!trigger || trigger === document.body) {
    trigger = [...document.querySelectorAll('a[href*="/modals/"]')].find((a) => {
      try {
        const { pathname } = new URL(a.href, window.location.href);
        return pathname === path && a.getClientRects().length > 0;
      } catch {
        return false;
      }
    }) || trigger;
  }
  const fragment = await loadFragment(path);
  if (!fragment) {
    // eslint-disable-next-line no-console
    console.error('[modal] could not load', path);
    return null;
  }
  const name = path.split('/').filter(Boolean).pop();
  return createModal([...fragment.childNodes], { name, trigger });
}

export default function decorate(block) {
  const [triggerRow, ...rows] = [...block.children];
  if (!triggerRow) return;
  const link = triggerRow.querySelector('a[href]');
  if (link) {
    /* /modals/ links are opened by the global click handler */
    block.replaceChildren(link);
    return;
  }
  const label = triggerRow.textContent.trim() || 'Open';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button primary';
  button.textContent = label;
  const template = document.createElement('div');
  rows.forEach((row) => [...row.children].forEach((cell) => template.append(...cell.childNodes)));
  button.addEventListener('click', () => {
    createModal([...template.cloneNode(true).childNodes], { label });
  });
  block.replaceChildren(button);
}
