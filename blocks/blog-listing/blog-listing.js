/*
 * Blog listing: category tabs, "All Articles" sidebar (search, tag chips, article
 * cards, load more) and the article pane, all driven by a query index.
 *
 * Config rows (all optional):
 *   Source     | /nutriverse/blogs/query-index.json   index JSON ({ data: [...] })
 *   Categories | A, B, C                              tab order (default: from index)
 *   Listing    | /nutriverse/blogs                    listing page (default: folder of Source)
 *   Heading / Placeholder / Empty / More             sidebar copy overrides
 *
 * Listing page: the block is alone in its section; the pane shows the first article of
 * the active category (fetched from <path>.plain.html).
 * Article page (template blog-article): everything after the block in the same section
 * (featured image, H1, body, blog-table blocks...) is moved into the pane, under a header
 * built from the page metadata (Category, Date, Read Time).
 *
 * URL params, as on the Next.js site: ?category= ?q= ?tags=a,b ?limit=
 */
import { getMetadata, loadSections } from '../../scripts/aem.js';
// eslint-disable-next-line import/no-cycle
import { decorateMain } from '../../scripts/scripts.js';
import { buildPicture, readConfig } from '../../scripts/prohance.js';

const PAGE_SIZE = 6;
const DEFAULT_SOURCE = '/nutriverse/blogs/query-index.json';

const svg = (paths, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICONS = {
  calendar: svg('<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  search: svg('<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>'),
  sliders: svg('<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>'),
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>'),
  prev: svg('<path d="m15 18-6-6 6-6"/>'),
  next: svg('<path d="m9 18 6-6-6-6"/>'),
};

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

const cleanPath = (path) => {
  try {
    return new URL(path, window.location.href).pathname.replace(/\.(plain\.)?html$/, '').replace(/(.)\/$/, '$1');
  } catch {
    return path;
  }
};

function parseTags(value) {
  let list = value;
  if (!Array.isArray(list)) {
    const str = String(value || '').trim();
    try {
      list = str.startsWith('[') ? JSON.parse(str) : [str];
    } catch {
      list = [str];
    }
  }
  return list.flatMap((t) => String(t).split(',')).map((t) => t.trim()).filter(Boolean);
}

function toEntry(row) {
  const date = String(row.date || '').trim();
  return {
    path: cleanPath(row.path || ''),
    title: String(row.title || '').trim(),
    description: String(row.description || '').trim(),
    image: row.image || '',
    category: String(row.category || '').trim(),
    date,
    readtime: String(row.readtime || row['read-time'] || '').trim(),
    tags: parseTags(row.tags),
    template: String(row.template || '').toLowerCase(),
    time: Date.parse(date) || 0,
  };
}

async function fetchIndex(source) {
  try {
    const resp = await fetch(source);
    if (!resp.ok) return [];
    const json = await resp.json();
    const rows = Array.isArray(json.data) ? json.data : [];
    return rows.map(toEntry)
      .filter((e) => e.path && e.title && (!e.template || e.template.includes('blog-article')))
      .map((e, i) => ({ ...e, i }))
      .sort((a, b) => (b.time - a.time) || (a.i - b.i));
  } catch {
    return [];
  }
}

const sameText = (a, b) => a.toLowerCase() === b.toLowerCase();

/** Fetches an article's content and returns its decorated section children. */
async function fetchArticleContent(path) {
  let html;
  const plain = await fetch(`${path}.plain.html`).catch(() => null);
  if (plain && plain.ok) {
    html = await plain.text();
  } else {
    const full = await fetch(path).catch(() => null);
    if (!full || !full.ok) return null;
    const doc = new DOMParser().parseFromString(await full.text(), 'text/html');
    html = doc.querySelector('main')?.innerHTML;
  }
  if (!html) return null;
  const main = document.createElement('main');
  main.innerHTML = html;
  main.querySelectorAll('img[src^="./media_"], source[srcset^="./media_"]').forEach((node) => {
    const attr = node.tagName === 'IMG' ? 'src' : 'srcset';
    node.setAttribute(attr, new URL(node.getAttribute(attr), new URL(path, window.location)).href);
  });
  main.querySelectorAll('.blog-hero, .blog-listing, .metadata').forEach((node) => node.remove());
  decorateMain(main);
  await loadSections(main);
  return [...main.querySelectorAll(':scope > .section > *')];
}

/* ---------- article pane ---------- */

function featuredPicture(src, alt) {
  if (!src) return null;
  // a plain object, not an <img>: setting src on a created <img> downloads it
  // (the index image is a 1200px JPEG), even though only the picture is used
  const img = { src, alt };
  return buildPicture(img, {
    widths: [400, 750, 1200],
    sizes: '(width < 640px) 100vw, (width < 1024px) 70vw, 744px',
    eager: true,
    alt,
  });
}

/** Takes the leading featured <picture> and the H1 out of the article content. */
function extractLead(nodes) {
  let picture = null;
  let h1 = null;
  // only a picture that comes before the H1 counts as the featured image
  nodes.some((wrapper) => {
    if (!wrapper.classList.contains('default-content-wrapper')) return false;
    [...wrapper.querySelectorAll('h1, picture')].some((node) => {
      if (node.tagName === 'H1') h1 = node;
      else if (!picture) picture = node;
      return Boolean(h1);
    });
    return Boolean(h1);
  });
  if (picture) {
    const p = picture.closest('p');
    if (p && p.textContent.trim() === '' && p.querySelectorAll('picture').length === 1) p.remove();
    else picture.remove();
  }
  if (h1) h1.remove();
  return { picture, h1 };
}

async function share(title, text) {
  const url = window.location.href;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const data = { title: title || document.title, url, ...(isMobile && text ? { text } : {}) };
  if (navigator.share && navigator.canShare?.(data)) {
    try {
      await navigator.share(data);
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch { /* clipboard unavailable */ }
}

function buildPager(prev, next, query) {
  if (!prev && !next) return null;
  const nav = el('nav', 'blog-listing-pager');
  nav.setAttribute('aria-label', 'More articles');
  const link = (entry, dir) => {
    if (!entry) return el('div');
    const a = el('a', `blog-listing-pager-link blog-listing-pager-${dir}`);
    a.href = `${entry.path}${query ? `?${query}` : ''}`;
    const label = el('span', 'blog-listing-pager-label');
    label.innerHTML = dir === 'prev' ? `${ICONS.prev}Previous Article` : `Next Article${ICONS.next}`;
    const title = el('span', 'blog-listing-pager-title');
    title.textContent = entry.title;
    a.append(label, title);
    return a;
  };
  nav.append(link(prev, 'prev'), link(next, 'next'));
  return nav;
}

/**
 * Builds the article pane.
 * @param {Element[]} nodes section children (default-content and block wrappers)
 * @param {object} data title, image, category, date, readtime, description
 */
function buildArticle(nodes, data, fromIndex) {
  const article = el('article', 'blog-listing-article');
  const lead = extractLead(nodes);
  const title = (lead.h1 && lead.h1.textContent.trim()) || data.title;

  let picture = null;
  if (fromIndex || !lead.picture) {
    picture = featuredPicture(data.image, title);
  } else {
    const img = lead.picture.querySelector('img');
    picture = buildPicture(img, {
      widths: [400, 750, 1200],
      sizes: '(width < 640px) 100vw, (width < 1024px) 70vw, 744px',
      eager: true,
      alt: img.alt || title,
    });
  }
  if (picture) {
    const figure = el('div', 'blog-listing-figure');
    figure.append(picture);
    article.append(figure);
  }

  const mainCol = el('div', 'blog-listing-main');
  const head = el('div', 'blog-listing-head');
  const heading = el('div', 'blog-listing-heading');
  if (data.category) {
    const badge = el('span', 'blog-listing-badge');
    badge.textContent = data.category;
    heading.append(badge);
  }
  const h1 = lead.h1 || el('h1');
  h1.className = 'blog-listing-title';
  h1.textContent = title;
  heading.append(h1);

  const meta = el('div', 'blog-listing-meta');
  const info = el('div', 'blog-listing-info');
  [[ICONS.calendar, data.date], [ICONS.clock, data.readtime]]
    .filter(([, value]) => value)
    .forEach(([icon, value], i) => {
      if (i) info.append(el('span', 'blog-listing-sep'));
      const item = el('span', '', icon);
      item.append(value);
      info.append(item);
    });
  const shareBtn = el('button', 'blog-listing-share', `${ICONS.share}<span>Share</span>`);
  shareBtn.type = 'button';
  shareBtn.setAttribute('aria-label', 'Share article');
  shareBtn.addEventListener('click', () => share(title, data.description));
  meta.append(info, shareBtn);
  head.append(heading, meta);

  const body = el('div', 'blog-listing-body');
  body.append(...nodes);
  body.querySelectorAll('a[href]').forEach((a) => {
    try {
      if (new URL(a.href).origin !== window.location.origin) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    } catch { /* ignore malformed */ }
  });
  body.querySelectorAll('.default-content-wrapper img').forEach((img) => {
    img.loading = 'lazy';
  });

  mainCol.append(head, body);
  article.append(mainCol);
  return article;
}

function addJsonLd(data) {
  if (document.getElementById('blog-article-schema')) return;
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: data.title,
    description: data.description || undefined,
    image: data.image || undefined,
    datePublished: data.date || undefined,
    ...(data.tags.length ? { keywords: data.tags.join(', ') } : {}),
    mainEntityOfPage: `${window.location.origin}${window.location.pathname}`,
    publisher: { '@type': 'Organization', name: 'Prohance' },
  };
  const script = el('script');
  script.id = 'blog-article-schema';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(json);
  document.head.append(script);
}

/* ---------- sidebar ---------- */

function buildCard(entry, active, query) {
  const a = el('a', `blog-listing-card${active ? ' is-active' : ''}`);
  a.href = `${entry.path}${query ? `?${query}` : ''}`;
  if (active) a.setAttribute('aria-current', 'page');
  const thumb = el('div', 'blog-listing-thumb');
  if (entry.image) {
    // plain object: a created <img> with a src would download the 1200px original
    const img = { src: entry.image, alt: '' };
    thumb.append(buildPicture(img, { widths: [192], sizes: '96px', alt: '' }));
  }
  const text = el('div', 'blog-listing-card-text');
  const top = el('div', 'blog-listing-card-top');
  if (entry.category) {
    const badge = el('span', 'blog-listing-card-badge');
    badge.textContent = entry.category;
    top.append(badge);
  }
  const h3 = el('h3');
  h3.textContent = entry.title;
  top.append(h3);
  const meta = el('div', 'blog-listing-card-meta');
  if (entry.date) {
    const d = el('span', '', ICONS.calendar);
    d.append(entry.date);
    meta.append(d);
  }
  if (entry.readtime) {
    const r = el('span', '', ICONS.clock);
    r.append(entry.readtime);
    meta.append(r);
  }
  text.append(top, meta);
  a.append(thumb, text);
  return a;
}

export default async function decorate(block) {
  const config = readConfig(block, ['source', 'categories', 'listing', 'heading', 'placeholder', 'empty', 'more']);
  block.textContent = '';
  const source = config.source ? cleanPath(config.source).replace(/(\.json)?$/, '.json') : DEFAULT_SOURCE;
  const labels = {
    heading: config.heading || 'All Articles',
    placeholder: config.placeholder || 'Search articles',
    empty: config.empty || 'No articles match your criteria.',
    more: config.more || 'Load More',
  };

  const wrapper = block.closest('.blog-listing-wrapper') || block;
  const content = [];
  for (let n = wrapper.nextElementSibling; n; n = n.nextElementSibling) content.push(n);
  const isArticle = document.body.classList.contains('blog-article') || content.length > 0;
  const currentPath = cleanPath(window.location.pathname);
  const listingPath = isArticle
    ? (config.listing && cleanPath(config.listing)) || source.replace(/\/[^/]*$/, '')
    : currentPath;

  const entries = await fetchIndex(source);
  const categories = (config.categories || '').split(',').map((c) => c.trim()).filter(Boolean);
  entries.forEach((e) => {
    if (e.category && !categories.some((c) => sameText(c, e.category))) categories.push(e.category);
  });

  // metadata of the current article (article pages)
  const self = entries.find((e) => e.path === currentPath);
  const pageData = isArticle ? {
    title: getMetadata('og:title') || document.title,
    description: getMetadata('description'),
    image: getMetadata('og:image'),
    category: getMetadata('category') || self?.category || '',
    date: getMetadata('date') || self?.date || '',
    readtime: getMetadata('read-time') || getMetadata('readtime') || self?.readtime || '',
    tags: parseTags(getMetadata('article:tag') || getMetadata('tags')),
  } : null;

  const readState = () => {
    const params = new URLSearchParams(window.location.search);
    const fallback = (isArticle && categories.find((c) => sameText(c, pageData.category)))
      || categories[0] || '';
    const category = categories.find((c) => sameText(c, params.get('category') || '')) || fallback;
    const limit = Math.max(Number(params.get('limit')) || PAGE_SIZE, PAGE_SIZE);
    const tags = (params.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean);
    return {
      params, category, q: (params.get('q') || '').trim(), tags, limit,
    };
  };

  /* --- static structure --- */
  const tablist = el('div', 'blog-listing-tabs');
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Filter articles by category');

  const panel = el('div', 'blog-listing-panel');
  const aside = el('aside', 'blog-listing-sidebar');
  aside.setAttribute('aria-label', labels.heading);
  const top = el('div', 'blog-listing-top');
  const title = el('h2', 'blog-listing-heading-text');
  title.textContent = labels.heading;
  const form = el('form', 'blog-listing-search');
  form.setAttribute('role', 'search');
  form.innerHTML = `${ICONS.search}<input type="search" name="q" autocomplete="off"><button type="submit" class="blog-listing-search-btn" aria-label="Search">${ICONS.sliders}</button>`;
  const input = form.querySelector('input');
  input.placeholder = labels.placeholder;
  input.setAttribute('aria-label', labels.placeholder);
  const tagBar = el('div', 'blog-listing-tags');
  top.append(title, form, tagBar);
  const list = el('div', 'blog-listing-list');
  const more = el('div', 'blog-listing-more');
  aside.append(top, list, more);
  panel.append(aside);
  block.append(tablist, panel);

  let article = null;
  let articlePath = null;

  const setParams = (updates, path = window.location.pathname) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || String(v).trim() === '') params.delete(k);
      else params.set(k, String(v));
    });
    const qs = params.toString();
    const url = `${path}${qs ? `?${qs}` : ''}`;
    if (cleanPath(path) !== currentPath) {
      window.location.href = url;
      return false;
    }
    window.history.pushState({}, '', url);
    return true;
  };

  const renderPager = (activePath, state) => {
    article?.querySelector('.blog-listing-pager')?.remove();
    if (!article) return;
    const inCategory = entries.filter((e) => sameText(e.category, state.category));
    const i = inCategory.findIndex((e) => e.path === activePath);
    if (i < 0) return;
    const qs = new URLSearchParams({ category: state.category, limit: state.limit }).toString();
    const pager = buildPager(inCategory[i - 1], inCategory[i + 1], qs);
    if (pager) article.append(pager);
  };

  const showListingArticle = async (entry) => {
    if (!entry) {
      article?.remove();
      article = null;
      articlePath = null;
      return;
    }
    if (articlePath === entry.path) return;
    articlePath = entry.path;
    const nodes = await fetchArticleContent(entry.path);
    if (articlePath !== entry.path) return; // superseded
    const next = buildArticle(nodes || [], entry, true);
    if (article) article.replaceWith(next);
    else panel.append(next);
    article = next;
  };

  const render = async () => {
    const state = readState();
    if (document.activeElement !== input) input.value = state.q;

    // tabs
    tablist.replaceChildren(...categories.map((cat) => {
      const tab = el('button', 'blog-listing-tab');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(sameText(cat, state.category)));
      tab.textContent = cat;
      tab.addEventListener('click', () => {
        if (setParams({
          category: cat, limit: '', tags: '', q: state.q,
        }, listingPath)) render();
      });
      return tab;
    }));

    // articles of the category, filtered by the search query
    const needle = state.q.toLowerCase();
    const filtered = entries.filter((e) => sameText(e.category, state.category))
      .filter((e) => !needle || [e.title, e.category, e.description, ...e.tags]
        .some((t) => t.toLowerCase().includes(needle)));
    const visibleCount = Math.min(state.limit, Math.max(filtered.length, PAGE_SIZE));
    const visible = filtered.slice(0, visibleCount);
    const tags = [...new Set(visible.flatMap((e) => e.tags))];
    const selected = state.tags.length ? state.tags : ['All'];
    const isAll = selected.some((t) => sameText(t, 'all'));
    const shown = isAll ? visible
      : visible.filter((e) => e.tags.some((t) => selected.some((s) => sameText(s, t))));

    const activePath = isArticle ? currentPath : filtered[0]?.path;

    // tag chips
    const chip = (label, active, onClick) => {
      const b = el('button', 'blog-listing-chip');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('aria-pressed', String(active));
      b.addEventListener('click', onClick);
      return b;
    };
    tagBar.replaceChildren(
      chip('All', isAll, () => { if (setParams({ tags: '' })) render(); }),
      ...tags.map((tag) => {
        const active = !isAll && selected.includes(tag);
        return chip(tag, active, () => {
          const nextTags = selected.filter((t) => !sameText(t, 'all') && t !== tag);
          if (!active) nextTags.push(tag);
          if (setParams({ tags: nextTags.join(',') })) render();
        });
      }),
    );

    // cards
    const query = state.params.toString();
    list.replaceChildren(...shown.map((e) => buildCard(e, e.path === activePath, query)));
    if (!shown.length) {
      const empty = el('p', 'blog-listing-empty');
      empty.textContent = labels.empty;
      list.append(empty);
    }

    // load more
    more.replaceChildren();
    if (filtered.length > visibleCount) {
      const btn = el('button', 'blog-listing-more-btn');
      btn.type = 'button';
      btn.textContent = labels.more;
      btn.setAttribute('aria-label', `Load more articles (currently displaying ${shown.length})`);
      btn.addEventListener('click', () => {
        if (setParams({ limit: visibleCount + PAGE_SIZE })) render();
      });
      more.append(btn);
    }

    if (!isArticle) await showListingArticle(filtered[0]);
    renderPager(activePath, state);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (setParams({ q: input.value.trim() })) render();
  });
  window.addEventListener('popstate', () => render());

  if (isArticle) {
    article = buildArticle(content, pageData, false);
    articlePath = currentPath;
    panel.append(article);
    addJsonLd({ ...pageData, title: article.querySelector('h1')?.textContent || pageData.title });
  }

  await render();
}
