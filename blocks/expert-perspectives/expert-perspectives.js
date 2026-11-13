import { buildPicture } from '../../scripts/prohance.js';

const ARROW_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

const AUTOPLAY_MS = 10000;
const MOBILE_MQ = '(max-width: 767px)';

function getYouTubeId(url) {
  const match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * Text lines of a row: block-level children of each cell, or the cell itself
 * when it holds bare text. Pictures and the video link are ignored.
 */
function getTextLines(row, videoLink) {
  const lines = [];
  [...row.children].forEach((cell) => {
    const children = [...cell.children].filter((el) => /^(P|H[1-6]|DIV)$/.test(el.tagName));
    (children.length ? children : [cell]).forEach((el) => {
      const text = el.textContent.trim();
      if (!text) return;
      if (videoLink && el.contains(videoLink) && text === videoLink.textContent.trim()) return;
      lines.push(el);
    });
  });
  return lines;
}

function parseVideo(row) {
  const img = row.querySelector('img');
  const links = [...row.querySelectorAll('a[href]')];
  const videoLink = links.find((a) => getYouTubeId(a.href) || /\.(mp4|webm|m3u8)(\?|$)/i.test(a.href))
    || links.pop();
  const lines = getTextLines(row, videoLink);
  const headingIdx = lines.findIndex((el) => /^H[1-6]$/.test(el.tagName));
  const titleEl = headingIdx >= 0 ? lines.splice(headingIdx, 1)[0] : lines.shift();
  return {
    img,
    url: videoLink ? videoLink.href : '',
    title: titleEl ? titleEl.textContent.trim() : '',
    name: lines[0] ? lines[0].textContent.trim() : '',
    role: lines[1] ? lines[1].textContent.trim() : '',
  };
}

function createModal(block) {
  const dialog = document.createElement('dialog');
  dialog.className = 'expert-perspectives-modal';
  const titleId = `expert-perspectives-modal-title-${Math.random().toString(36).slice(2, 8)}`;
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.innerHTML = `<div class="expert-perspectives-modal-panel">
    <div class="expert-perspectives-modal-header">
      <h2 id="${titleId}"></h2>
      <button type="button" class="expert-perspectives-modal-close" aria-label="Close video">${CLOSE}</button>
    </div>
    <div class="expert-perspectives-modal-media"></div>
    <p class="expert-perspectives-modal-desc"></p>
  </div>`;
  const media = dialog.querySelector('.expert-perspectives-modal-media');
  dialog.querySelector('.expert-perspectives-modal-close').addEventListener('click', () => dialog.close());
  // clicks on the dialog itself (outside the panel) hit the backdrop
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  // stop playback when closed
  dialog.addEventListener('close', () => media.replaceChildren());
  block.append(dialog);
  return dialog;
}

function openVideo(block, video) {
  const dialog = block.querySelector('.expert-perspectives-modal') || createModal(block);
  dialog.querySelector('h2').textContent = video.title;
  const desc = dialog.querySelector('.expert-perspectives-modal-desc');
  desc.textContent = [video.name, video.role].filter(Boolean).join(', ');
  desc.hidden = !desc.textContent;

  const media = dialog.querySelector('.expert-perspectives-modal-media');
  const ytId = getYouTubeId(video.url);
  let player;
  if (ytId) {
    player = document.createElement('iframe');
    player.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`;
    player.title = video.title;
    player.allow = 'autoplay; fullscreen; picture-in-picture';
    player.allowFullscreen = true;
  } else if (video.url) {
    player = document.createElement('video');
    player.src = video.url;
    player.controls = true;
    player.autoplay = true;
    player.playsInline = true;
  }
  media.replaceChildren(...(player ? [player] : []));
  media.hidden = !player;
  dialog.showModal();
}

/**
 * Mobile carousel on a native scroll-snap track: dots, swipe, 10s autoplay
 * that pauses while hovered/focused. Inert from 768px up (track is a grid).
 */
function initCarousel(viewport, track) {
  const slides = [...track.children];
  if (slides.length < 2) return;
  const mq = window.matchMedia(MOBILE_MQ);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let paused = false;

  const dots = document.createElement('div');
  dots.className = 'expert-perspectives-dots';
  const goTo = (i) => track.scrollTo({ left: i * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dots.append(dot);
  });
  viewport.append(dots);

  const update = () => {
    index = Math.round(track.scrollLeft / (track.clientWidth || 1));
    [...dots.children].forEach((dot, i) => dot.classList.toggle('active', i === index));
  };
  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  update();

  viewport.addEventListener('pointerenter', () => { paused = true; });
  viewport.addEventListener('pointerleave', () => { paused = false; });
  viewport.addEventListener('focusin', () => { paused = true; });
  viewport.addEventListener('focusout', () => { paused = false; });

  if (reduceMotion) return;
  setInterval(() => {
    if (!mq.matches || paused || document.hidden) return;
    goTo((index + 1) % slides.length);
  }, AUTOPLAY_MS);
}

/**
 * Expert Perspectives
 * Row 1 (header): heading | "View all" link
 * Rows 2+ (one per video): thumbnail | title (heading), expert name, role | video URL
 * @param {Element} block
 */
export default function decorate(block) {
  const header = document.createElement('div');
  header.className = 'expert-perspectives-header';
  const videos = [];

  [...block.children].forEach((row) => {
    if (row.querySelector('img')) {
      videos.push(parseVideo(row));
      return;
    }
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const link = row.querySelector('a[href]');
    if (heading) header.append(heading);
    if (link) {
      link.className = 'expert-perspectives-view-all';
      link.insertAdjacentHTML('beforeend', ARROW_RIGHT);
      header.append(link);
    }
  });

  const viewport = document.createElement('div');
  viewport.className = 'expert-perspectives-carousel';
  const track = document.createElement('ul');
  track.className = 'expert-perspectives-list';

  videos.forEach((video) => {
    const li = document.createElement('li');
    li.className = 'expert-perspectives-card';

    const thumb = document.createElement('div');
    thumb.className = 'expert-perspectives-thumb';
    if (video.img) {
      // the authored picture serves 2000px on desktop for a ~380px card
      thumb.append(buildPicture(video.img, {
        widths: [400, 600, 800],
        sizes: '(width >= 768px) 28vw, 92vw',
      }));
    }
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'expert-perspectives-play';
    play.setAttribute('aria-label', `Play video: ${video.title}`);
    play.innerHTML = PLAY;
    thumb.append(play);

    const body = document.createElement('div');
    body.className = 'expert-perspectives-body';
    const title = document.createElement('h3');
    title.textContent = video.title;
    const meta = document.createElement('div');
    meta.innerHTML = '<p class="expert-perspectives-name"></p><p class="expert-perspectives-role"></p>';
    meta.children[0].textContent = video.name;
    meta.children[1].textContent = video.role;
    body.append(title, meta);

    li.append(thumb, body);
    if (video.url) li.addEventListener('click', () => openVideo(block, video));
    track.append(li);
  });

  viewport.append(track);
  const inner = document.createElement('div');
  inner.className = 'expert-perspectives-inner';
  if (header.children.length) inner.append(header);
  inner.append(viewport);
  block.replaceChildren(inner);
  initCarousel(viewport, track);
}
