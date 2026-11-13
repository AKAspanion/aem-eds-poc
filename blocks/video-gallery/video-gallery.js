import { buildPicture, readConfig } from '../../scripts/prohance.js';

const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

const DEFAULTS = {
  categories: 'Prohance, Prohance-DM, Prohance-HP',
  'page-size': '12',
  'load-more-size': '6',
  'load-more': 'Load More',
  empty: 'No videos found for this category.',
  related: 'Related Videos',
};
const MAX_LIMIT = 100;
const RELATED_COUNT = 3;

/* -------------------------------------------------------------------------
 * Video player dialog. Self-contained (no block state): ready to move to
 * scripts/video-dialog.js and share with expert-perspectives. Class names are
 * `${prefix}`, `${prefix}-panel`, `-header`, `-eyebrow`, `-close`, `-media`,
 * `-desc`, `-extra`; the title is the header's <h3>.
 * ---------------------------------------------------------------------- */

function getYouTubeId(url) {
  const match = (url || '').match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function getYouTubeThumbnail(url) {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

/** iframe (YouTube) or <video> for a URL; created only when the user plays. */
function createPlayer(url, title) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`;
    iframe.title = title;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    return iframe;
  }
  if (!url) return null;
  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  return video;
}

/**
 * @param {Element} host element the <dialog> is appended to (for scoped CSS)
 * @param {string} prefix class name prefix
 * @returns {{ open: (video: { url: string, title: string, eyebrow?: string,
 *   description?: string, extra?: Node }) => void, dialog: HTMLDialogElement }}
 */
function createVideoDialog(host, prefix) {
  const dialog = document.createElement('dialog');
  dialog.className = prefix;
  const titleId = `${prefix}-title-${Math.random().toString(36).slice(2, 8)}`;
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.innerHTML = `<div class="${prefix}-panel">
    <div class="${prefix}-header">
      <div>
        <p class="${prefix}-eyebrow"></p>
        <h3 id="${titleId}"></h3>
      </div>
      <button type="button" class="${prefix}-close" aria-label="Close video">${CLOSE}</button>
    </div>
    <div class="${prefix}-media"></div>
    <p class="${prefix}-desc"></p>
    <div class="${prefix}-extra"></div>
  </div>`;
  const $ = (name) => dialog.querySelector(`.${prefix}-${name}`);
  const close = $('close');
  close.addEventListener('click', () => dialog.close());
  // clicks on the dialog itself (outside the panel) hit the backdrop
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    $('media').replaceChildren(); // stops playback
    $('extra').replaceChildren();
    document.documentElement.style.removeProperty('overflow');
  });
  host.append(dialog);

  const setText = (el, text) => {
    el.textContent = text || '';
    el.hidden = !el.textContent;
  };

  const open = ({
    url, title, eyebrow, description, extra,
  }) => {
    setText($('eyebrow'), eyebrow);
    dialog.querySelector('h3').textContent = title;
    setText($('desc'), description);
    const player = createPlayer(url, title);
    $('media').replaceChildren(...(player ? [player] : []));
    $('media').hidden = !player;
    $('extra').replaceChildren(...(extra ? [extra] : []));
    $('extra').hidden = !extra;
    if (!dialog.open) {
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal();
    } else {
      dialog.scrollTop = 0;
      close.focus();
    }
  };

  return { open, dialog };
}

/* ---------------------------------------------------------------------- */

const toSlug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const cellText = (cell) => (cell ? cell.textContent.replace(/\s+/g, ' ').trim() : '');

/**
 * Row: thumbnail (optional) | title | category | duration | video URL | description
 */
function parseVideo(row) {
  let cells = [...row.children];
  if (cells.length === 5 && !cells[0].querySelector('img')) cells = [null, ...cells];
  const [thumbCell, titleCell, categoryCell, durationCell, urlCell, descCell] = cells;
  const link = (urlCell && urlCell.querySelector('a[href]'))
    || [...row.querySelectorAll('a[href]')].find((a) => getYouTubeId(a.href));
  const url = link ? link.href : cellText(urlCell);
  const categories = cellText(categoryCell).split(',').map((c) => c.trim()).filter(Boolean);
  return {
    img: thumbCell ? thumbCell.querySelector('img') : null,
    title: cellText(titleCell),
    categories,
    duration: cellText(durationCell),
    url,
    description: cellText(descCell),
  };
}

function createThumb(video, className, sizes) {
  if (video.img) {
    return buildPicture(video.img, { widths: [480, 960], sizes, alt: '' });
  }
  const img = document.createElement('img');
  img.src = getYouTubeThumbnail(video.url);
  img.alt = '';
  img.width = 480;
  img.height = 360;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.className = className;
  return img;
}

function createRelated(videos, label, onSelect) {
  const wrap = document.createElement('div');
  wrap.className = 'video-gallery-related';
  const heading = document.createElement('p');
  heading.className = 'video-gallery-related-title';
  heading.textContent = label;
  const list = document.createElement('div');
  list.className = 'video-gallery-related-list';
  videos.forEach((video) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'video-gallery-related-item';
    btn.setAttribute('aria-label', `Play related video: ${video.title}`);
    const thumb = document.createElement('span');
    thumb.className = 'video-gallery-related-thumb';
    thumb.append(createThumb(video, '', '256px'));
    thumb.insertAdjacentHTML('beforeend', `<span class="video-gallery-related-play">${PLAY}</span>`);
    if (video.duration) {
      const dur = document.createElement('span');
      dur.className = 'video-gallery-duration';
      dur.textContent = video.duration;
      thumb.append(dur);
    }
    const title = document.createElement('span');
    title.className = 'video-gallery-related-name';
    title.textContent = video.title;
    btn.append(thumb, title);
    btn.addEventListener('click', () => onSelect(video));
    list.append(btn);
  });
  wrap.append(heading, list);
  return wrap;
}

function createCard(video, onOpen) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'video-gallery-card';
  card.dataset.category = toSlug(video.categories[0] || '');
  card.setAttribute('aria-label', `Play video: ${video.title}`);

  const thumb = document.createElement('span');
  thumb.className = 'video-gallery-thumb';
  thumb.append(createThumb(video, '', '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw'));
  thumb.insertAdjacentHTML('beforeend', '<span class="video-gallery-shade"></span>');
  const [category] = video.categories;
  if (category) {
    const tag = document.createElement('span');
    tag.className = 'video-gallery-tag';
    tag.textContent = category;
    thumb.append(tag);
  }
  thumb.insertAdjacentHTML('beforeend', `<span class="video-gallery-play">${PLAY}</span>`);
  if (video.duration) {
    const dur = document.createElement('span');
    dur.className = 'video-gallery-duration';
    dur.textContent = video.duration;
    thumb.append(dur);
  }

  const title = document.createElement('h3');
  title.className = 'video-gallery-title';
  title.textContent = video.title;

  card.append(thumb, title);
  card.addEventListener('click', () => onOpen(video));
  return card;
}

const clampLimit = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(Math.min(n, MAX_LIMIT));
};

/**
 * Video Gallery: category tabs, video card grid with "Load More", play dialog
 * with related videos.
 * Config rows (optional, 2 cells): Categories | Page size | Load more size |
 *   Load more | Empty | Related
 * Video rows: thumbnail (optional) | title | category | duration | video URL | description
 * @param {Element} block
 */
export default function decorate(block) {
  const config = { ...DEFAULTS, ...readConfig(block, Object.keys(DEFAULTS)) };
  const categories = config.categories.split(',').map((c) => c.trim()).filter(Boolean);
  const pageSize = clampLimit(config['page-size'], 12);
  const step = clampLimit(config['load-more-size'], 6);

  const videos = [...block.children]
    .map(parseVideo)
    .filter((v) => v.url && v.title);

  const params = new URLSearchParams(window.location.search);
  const requested = categories.find((c) => toSlug(c) === toSlug(params.get('category') || ''));
  let active = requested || categories[0] || '';
  let limit = clampLimit(params.get('limit'), pageSize);

  const inner = document.createElement('div');
  inner.className = 'video-gallery-inner';

  const uid = Math.random().toString(36).slice(2, 8);
  const tablist = document.createElement('div');
  tablist.className = 'video-gallery-tabs';
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Filter videos by product');

  const panel = document.createElement('div');
  panel.className = 'video-gallery-panel';
  panel.id = `video-gallery-panel-${uid}`;
  panel.setAttribute('role', 'tabpanel');
  const grid = document.createElement('div');
  grid.className = 'video-gallery-grid';
  const empty = document.createElement('p');
  empty.className = 'video-gallery-empty';
  empty.textContent = config.empty;
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'video-gallery-more';
  more.textContent = config['load-more'];
  panel.append(grid, empty, more);

  let player;
  let visible = [];

  const openVideo = (video) => {
    const related = visible.filter((v) => v !== video).slice(0, RELATED_COUNT);
    player.open({
      url: video.url,
      title: video.title,
      eyebrow: video.categories[0],
      description: video.description,
      extra: related.length ? createRelated(related, config.related, openVideo) : null,
    });
  };

  const syncUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('category', active);
    if (limit !== pageSize) url.searchParams.set('limit', limit);
    else url.searchParams.delete('limit');
    window.history.replaceState(window.history.state, '', url);
  };

  const tabs = categories.map((category) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'video-gallery-tab';
    tab.id = `video-gallery-tab-${uid}-${toSlug(category)}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    tab.textContent = category;
    tablist.append(tab);
    return tab;
  });

  const render = () => {
    const inActive = (v) => !active || v.categories.some((c) => toSlug(c) === toSlug(active));
    const filtered = videos.filter(inActive);
    visible = filtered.slice(0, limit);
    grid.replaceChildren(...visible.map((v) => createCard(v, openVideo)));
    grid.hidden = !visible.length;
    empty.hidden = visible.length > 0;
    more.hidden = limit >= filtered.length;
    more.setAttribute('aria-label', `Load more videos (currently displaying ${visible.length})`);
    tabs.forEach((tab, i) => {
      const selected = categories[i] === active;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      if (selected) panel.setAttribute('aria-labelledby', tab.id);
    });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      if (categories[i] === active) return;
      active = categories[i];
      limit = pageSize;
      render();
      syncUrl();
    });
    tab.addEventListener('keydown', (e) => {
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  });

  more.addEventListener('click', () => {
    limit = clampLimit(limit + step, pageSize);
    render();
    syncUrl();
  });

  if (tabs.length) inner.append(tablist);
  inner.append(panel);
  block.replaceChildren(inner);
  player = createVideoDialog(block, 'video-gallery-modal');
  render();
}
