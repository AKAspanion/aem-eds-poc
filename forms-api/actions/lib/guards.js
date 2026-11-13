/*
 * Abuse protection: per-IP rate limit (App Builder state store) and optional
 * Cloudflare Turnstile verification.
 */
const { createHash } = require('node:crypto');

/** First client IP from the forwarded headers. */
function clientIp(headers = {}) {
  const fwd = headers['x-forwarded-for'] || headers['x-real-ip'] || '';
  return String(fwd).split(',')[0].trim() || 'unknown';
}

let stateStore;
async function defaultState() {
  if (!stateStore) {
    // eslint-disable-next-line global-require
    const { init } = require('@adobe/aio-lib-state');
    stateStore = await init();
  }
  return stateStore;
}

/**
 * Counts submissions per IP per form in a one-hour window.
 * Fails open (allows) when the state store is unavailable, so a storage
 * outage never blocks real visitors; the failure is logged.
 * @returns {Promise<boolean>} true when allowed
 */
async function underRateLimit(form, ip, limit, { stateImpl = defaultState, logger = console } = {}) {
  const max = Number(limit);
  if (!max) return true;
  const hour = Math.floor(Date.now() / 3600000);
  const key = `rl-${form}-${hour}-${createHash('sha256').update(ip).digest('hex').slice(0, 32)}`;
  try {
    const state = await stateImpl();
    const current = await state.get(key);
    const count = Number(current?.value || 0) + 1;
    await state.put(key, String(count), { ttl: 3600 });
    return count <= max;
  } catch (err) {
    logger.warn(`[forms] rate limit unavailable, allowing: ${err.message}`);
    return true;
  }
}

/** Verifies a Turnstile token when a secret is configured. */
async function passesTurnstile(secret, token, ip, { fetchImpl = fetch } = {}) {
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: String(token), remoteip: ip });
  const res = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = await res.json().catch(() => ({}));
  return data.success === true;
}

module.exports = { clientIp, underRateLimit, passesTurnstile };
