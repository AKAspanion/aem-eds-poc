/**
 * Domain-based i18n using AEM-published spreadsheet JSON.
 * Authors enter translation keys in content; strings live in /i18n/translations.json.
 */

const KEY_PATTERN = /^[a-z][\w-]*(?:\.[a-z][\w-]*)+$/i;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'SVG']);

let localesConfig;
let dictionaryCache = {};
let warnedMissingDictionary = false;

/**
 * Loads locale routing config from the repo.
 * @returns {Promise<object>}
 */
async function loadLocalesConfig() {
  if (localesConfig) return localesConfig;
  const base = window.hlx?.codeBasePath || '';
  try {
    const resp = await fetch(`${base}/config/locales.json`);
    if (resp.ok) {
      localesConfig = await resp.json();
      return localesConfig;
    }
  } catch (e) {
    // fall through to defaults
  }
  localesConfig = { default: 'en', translationsPath: '/i18n/translations', domains: {} };
  return localesConfig;
}

/**
 * Resolves active locale: ?locale=, sessionStorage, hostname, default.
 * @returns {Promise<string>}
 */
export async function getLocale() {
  const config = await loadLocalesConfig();
  const params = new URLSearchParams(window.location.search);
  const queryParam = config.preview?.queryParam || 'locale';
  const storageKey = config.preview?.storageKey || 'hlx-locale';

  const fromQuery = params.get(queryParam);
  if (fromQuery) {
    try {
      sessionStorage.setItem(storageKey, fromQuery);
    } catch (e) {
      // ignore
    }
    return fromQuery;
  }

  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) return stored;
  } catch (e) {
    // ignore
  }

  const { hostname } = window.location;
  if (config.domains?.[hostname]) return config.domains[hostname];

  return config.default || 'en';
}

/**
 * Synchronous locale when config was already loaded (e.g. after first applyI18n).
 * @returns {string}
 */
export function getLocaleSync() {
  if (window.hlx?.locale) return window.hlx.locale;
  return localesConfig?.default || 'en';
}

/**
 * Parses AEM spreadsheet JSON into a flat key → string map for one locale.
 * @param {object} json Spreadsheet API response
 * @param {string} locale Column name (e.g. en, fr)
 * @returns {Record<string, string>}
 */
export function parseSpreadsheetDictionary(json, locale) {
  const dict = {};
  const rows = json?.data;
  if (!Array.isArray(rows)) return dict;

  const fallback = locale === 'en' ? null : 'en';

  rows.forEach((row) => {
    const key = (row.key || row.Key || '').trim();
    if (!key) return;
    const value = row[locale] ?? (fallback ? row[fallback] : undefined);
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      dict[key] = String(value);
    }
  });

  return dict;
}

/**
 * Fetches translation dictionary for a locale from AEM-published spreadsheet.
 * @param {string} locale
 * @returns {Promise<Record<string, string>>}
 */
export async function loadDictionary(locale) {
  if (dictionaryCache[locale]) return dictionaryCache[locale];

  const config = await loadLocalesConfig();
  const base = window.hlx?.codeBasePath || '';
  const path = config.translationsPath || '/i18n/translations';
  const url = `${base}${path}.json`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const dict = parseSpreadsheetDictionary(json, locale);
    dictionaryCache[locale] = dict;
    return dict;
  } catch (e) {
    if (!warnedMissingDictionary) {
      // eslint-disable-next-line no-console
      console.warn(
        `[i18n] Could not load ${url}. Publish the translations spreadsheet in AEM. (${e.message})`,
      );
      warnedMissingDictionary = true;
    }
    dictionaryCache[locale] = {};
    return dictionaryCache[locale];
  }
}

/**
 * Returns translated string for a key.
 * @param {string} key
 * @param {Record<string, string>} dict
 * @returns {string|undefined}
 */
export function translateKey(key, dict) {
  const trimmed = key?.trim();
  if (!trimmed || !KEY_PATTERN.test(trimmed)) return undefined;
  return dict[trimmed];
}

/**
 * Whether a string looks like a translation key.
 * @param {string} text
 * @returns {boolean}
 */
export function isTranslationKey(text) {
  const trimmed = text?.trim();
  return Boolean(trimmed && KEY_PATTERN.test(trimmed));
}

/**
 * Applies one translation to an element.
 * @param {Element} el
 * @param {string} key
 * @param {string} value
 */
function applyTranslationToElement(el, key, value) {
  const isHtml = /<[a-z][\s\S]*>/i.test(value);
  if (isHtml) {
    el.innerHTML = value;
  } else {
    el.textContent = value;
  }
  el.setAttribute('data-i18n-key', key);
  el.setAttribute('data-i18n-applied', 'true');
}

/**
 * Translates img[alt] and leaf elements whose text is exactly one key.
 * @param {Element} root
 * @param {Record<string, string>} dict
 */
function translateTree(root, dict) {
  if (!root || !dict || Object.keys(dict).length === 0) return;

  root.querySelectorAll('img[alt]').forEach((img) => {
    if (img.getAttribute('data-i18n-applied') === 'true') return;
    const alt = img.getAttribute('alt')?.trim();
    const value = translateKey(alt, dict);
    if (value !== undefined) {
      img.setAttribute('alt', value);
      img.setAttribute('data-i18n-key', alt);
      img.setAttribute('data-i18n-applied', 'true');
    }
  });

  root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, span, li, td, th, figcaption, label').forEach((el) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.getAttribute('data-i18n-applied') === 'true') return;
    if (el.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, div')) return;

    const key = el.textContent?.trim();
    const value = translateKey(key, dict);
    if (value !== undefined) applyTranslationToElement(el, key, value);
  });
}

/**
 * Loads dictionary and translates a DOM subtree. Safe to call multiple times.
 * @param {Element} root
 * @returns {Promise<void>}
 */
export async function applyI18n(root = document.body) {
  const locale = await getLocale();
  window.hlx = window.hlx || {};
  window.hlx.locale = locale;
  document.documentElement.lang = locale;

  const dict = await loadDictionary(locale);
  translateTree(root, dict);
}

/**
 * Clears cached dictionaries (e.g. after preview locale change).
 */
export function clearDictionaryCache() {
  dictionaryCache = {};
  warnedMissingDictionary = false;
}
