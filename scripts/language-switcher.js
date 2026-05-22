import {
  clearDictionaryCache,
  getLocale,
  loadLocalesConfig,
} from './i18n.js';

const PREVIEW_HOST_PATTERN = /\.(aem\.page|aem\.live|hlx\.page|hlx\.live)$/;

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isPreviewHost(hostname) {
  return hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || PREVIEW_HOST_PATTERN.test(hostname);
}

/**
 * @param {object} config
 * @returns {{ code: string, label: string, hostname?: string }[]}
 */
export function getAvailableLanguages(config) {
  if (config.languages?.length) return config.languages;

  const seen = new Set();
  const fromDomains = [];
  Object.entries(config.domains || {}).forEach(([host, code]) => {
    if (seen.has(code)) return;
    seen.add(code);
    fromDomains.push({ code, label: code.toUpperCase(), hostname: host });
  });
  return fromDomains;
}

/**
 * Switches locale: production domains redirect; preview/localhost use ?locale=.
 * @param {string} locale
 * @returns {Promise<void>}
 */
export async function switchToLocale(locale) {
  const config = await loadLocalesConfig();
  const storageKey = config.preview?.storageKey || 'hlx-locale';
  const queryParam = config.preview?.queryParam || 'locale';
  const languages = getAvailableLanguages(config);
  const target = languages.find((lang) => lang.code === locale);
  const {
    hostname, pathname, protocol, search,
  } = window.location;

  if (target?.hostname && !isPreviewHost(hostname) && target.hostname !== hostname) {
    window.location.href = `${protocol}//${target.hostname}${pathname}`;
    return;
  }

  try {
    sessionStorage.setItem(storageKey, locale);
  } catch (e) {
    // ignore
  }
  clearDictionaryCache();

  const url = new URL(window.location.href);
  url.searchParams.set(queryParam, locale);
  if (url.search !== search || url.searchParams.get(queryParam) === locale) {
    window.location.href = url.toString();
  } else {
    window.location.reload();
  }
}

/**
 * Builds a language <select> in the header tools area.
 * @param {Element} container
 * @returns {Promise<Element>}
 */
export async function decorateLanguageSwitcher(container) {
  const config = await loadLocalesConfig();
  const languages = getAvailableLanguages(config);
  if (languages.length < 2) return null;

  const currentLocale = await getLocale();

  const wrapper = document.createElement('div');
  wrapper.className = 'language-switcher';

  const label = document.createElement('label');
  label.className = 'language-switcher-label';
  label.setAttribute('for', 'language-switcher-select');
  label.textContent = 'nav.language';

  const select = document.createElement('select');
  select.id = 'language-switcher-select';
  select.className = 'language-switcher-select';
  select.setAttribute('aria-label', 'Language');

  languages.forEach((lang) => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.label || lang.code.toUpperCase();
    if (lang.code === currentLocale) option.selected = true;
    select.append(option);
  });

  select.addEventListener('change', () => {
    if (select.value && select.value !== currentLocale) {
      switchToLocale(select.value);
    }
  });

  wrapper.append(label, select);
  container.append(wrapper);
  return wrapper;
}
