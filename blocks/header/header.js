import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// md breakpoint, same as the Next.js header
const isDesktop = window.matchMedia('(width >= 768px)');

const CHEVRON = '<svg class="nav-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const MENU = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path class="nav-icon-open" d="M4 6h16M4 12h16M4 18h16"/><path class="nav-icon-close" d="M18 6 6 18M6 6l12 12"/></svg>';

function isActive(href) {
  const { pathname } = window.location;
  let target;
  try {
    target = new URL(href, window.location).pathname;
  } catch {
    return false;
  }
  if (target === '/') return pathname === '/' || pathname === '/index';
  return pathname.startsWith(target);
}

function closeDropdowns(nav, except) {
  nav.querySelectorAll('.nav-drop > button[aria-expanded="true"]').forEach((btn) => {
    if (btn !== except) btn.setAttribute('aria-expanded', 'false');
  });
}

function setMenu(nav, open) {
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  const toggle = nav.querySelector('.nav-hamburger button');
  if (toggle) toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

function buildDropdown(li) {
  const subList = li.querySelector(':scope > ul');
  li.classList.add('nav-drop');
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  [...li.childNodes].forEach((node) => {
    if (node !== subList) label.append(node);
  });
  label.textContent = label.textContent.trim();
  button.append(label);
  button.insertAdjacentHTML('beforeend', CHEVRON);
  li.prepend(button);
  subList.classList.add('nav-dropdown');

  // a dropdown is "current" when the page is in the same folder as its links
  // (e.g. any /products/* page highlights "Our Products"), like the Next.js header
  const folders = [...subList.querySelectorAll('a')].map((a) => {
    try {
      const parts = new URL(a.href, window.location).pathname.split('/').filter(Boolean);
      return parts.length > 1 ? `/${parts[0]}/` : null;
    } catch {
      return null;
    }
  }).filter(Boolean);
  const { pathname } = window.location;
  if ([...subList.querySelectorAll('a')].some((a) => isActive(a.href))
    || folders.some((f) => pathname.startsWith(f) || pathname === f.slice(0, -1))) {
    li.classList.add('active');
  }

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    closeDropdowns(li.closest('nav'), button);
    button.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
  li.addEventListener('mouseenter', () => {
    if (isDesktop.matches) button.setAttribute('aria-expanded', 'true');
  });
  li.addEventListener('mouseleave', () => {
    if (isDesktop.matches) button.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Header: glass bar with logo, nav links, hover dropdowns (desktop) and a
 * hamburger menu (mobile). Content comes from the /nav document:
 * section 1 = logo link, section 2 = nested list of links.
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');

  const sections = fragment ? [...fragment.children] : [];
  const brandSection = sections[0];
  const linksSection = sections[1];

  const bar = document.createElement('div');
  bar.className = 'nav-bar';

  // brand + hamburger
  const start = document.createElement('div');
  start.className = 'nav-start';
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav-menu" aria-label="Open menu">${MENU}</button>`;
  start.append(hamburger);
  const brandLink = brandSection?.querySelector('a');
  if (brandLink) {
    brandLink.className = 'nav-brand';
    brandLink.removeAttribute('title');
    if (!brandLink.getAttribute('aria-label')) brandLink.setAttribute('aria-label', 'Home');
    brandLink.closest('.button-wrapper')?.classList.remove('button-wrapper');
    const img = brandLink.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
    start.append(brandLink);
  }
  bar.append(start);

  // links
  const list = linksSection?.querySelector('ul');
  const menu = document.createElement('div');
  menu.className = 'nav-menu';
  menu.id = 'nav-menu';
  if (list) {
    list.className = 'nav-links';
    // Document Authoring wraps list item content in <p>; unwrap so li > a holds
    list.querySelectorAll('li > p').forEach((p) => p.replaceWith(...p.childNodes));
    [...list.children].forEach((li) => {
      if (li.querySelector(':scope > ul')) {
        buildDropdown(li);
      } else {
        const a = li.querySelector('a');
        if (a && isActive(a.href)) {
          li.classList.add('active');
          a.setAttribute('aria-current', 'page');
        }
      }
    });
    list.querySelectorAll('a').forEach((a) => {
      a.className = '';
      a.closest('.button-wrapper')?.classList.remove('button-wrapper');
    });
    menu.append(list);
  }
  bar.append(menu);

  const glass = document.createElement('div');
  glass.className = 'nav-glass glass';
  glass.append(bar);
  // mobile menu renders inside the glass panel, below the bar
  const mobileMenu = menu.cloneNode(true);
  mobileMenu.className = 'nav-mobile-menu';
  mobileMenu.id = 'nav-mobile-menu';
  mobileMenu.querySelectorAll('.nav-drop > button').forEach((btn) => {
    // on mobile, sub-links are always listed under their label
    const label = document.createElement('span');
    label.className = 'nav-drop-label';
    label.innerHTML = btn.innerHTML;
    btn.replaceWith(label);
  });
  glass.append(mobileMenu);
  hamburger.querySelector('button').setAttribute('aria-controls', 'nav-mobile-menu');
  nav.append(glass);

  hamburger.querySelector('button').addEventListener('click', () => {
    setMenu(nav, nav.getAttribute('aria-expanded') !== 'true');
  });
  mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(nav, false)));
  setMenu(nav, false);

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeDropdowns(nav);
    setMenu(nav, false);
  });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeDropdowns(nav);
  });
  isDesktop.addEventListener('change', () => {
    setMenu(nav, false);
    closeDropdowns(nav);
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  wrapper.append(nav);
  block.append(wrapper);
}
