/*
 * Shared web-action handler: CORS, method check, honeypot, Turnstile, rate
 * limit, validation, then the AEM fragment create. Never logs field values
 * (they are personal data); only field names and outcomes.
 */
const { createFragment, fragments, FormServiceError } = require('./aem');
const { clientIp, underRateLimit, passesTurnstile } = require('./guards');

const FORM_KEYS = new Set([
  'fullName', 'email', 'phone', 'age', 'gender', 'consentAccepted', 'website',
  'source', 'address', 'city', 'pincode', 'product', 'cf-turnstile-response',
]);

function corsHeaders(origin, allowed) {
  const list = String(allowed || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
  const ok = !list.length || list.includes(origin);
  return {
    ok,
    headers: ok && origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    } : { Vary: 'Origin' },
  };
}

const reply = (statusCode, headers, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: body === undefined ? '' : JSON.stringify(body),
});

/** Only the posted form fields: action inputs share the params object. */
function formFields(params) {
  return Object.fromEntries(Object.entries(params).filter(([k]) => FORM_KEYS.has(k)));
}

/**
 * @param {{ form: 'contact'|'newsletter'|'trial-request', schema: import('zod').ZodType }} cfg
 * @returns {(params: object, deps?: object) => Promise<object>} the action's main
 */
function createHandler({ form, schema }) {
  return async function main(params = {}, deps = {}) {
    const logger = deps.logger || console;
    const headers = params.__ow_headers || {};
    const method = String(params.__ow_method || 'post').toLowerCase();
    const cors = corsHeaders(headers.origin, params.ALLOWED_ORIGINS);

    if (!cors.ok) return reply(403, cors.headers, { ok: false, error: 'origin not allowed' });
    if (method === 'options') return reply(204, cors.headers);
    if (method !== 'post') return reply(405, cors.headers, { ok: false, error: 'method not allowed' });

    const fields = formFields(params);
    const ip = clientIp(headers);

    // bots fill the hidden field: pretend success, store nothing
    if (typeof fields.website === 'string' && fields.website.length > 0) {
      logger.warn(`[forms:${form}] honeypot filled; dropped`);
      return reply(200, cors.headers, { ok: true });
    }

    if (!(await passesTurnstile(params.TURNSTILE_SECRET, fields['cf-turnstile-response'], ip, deps))) {
      logger.warn(`[forms:${form}] turnstile failed`);
      return reply(403, cors.headers, { ok: false, error: 'verification failed' });
    }

    if (!(await underRateLimit(form, ip, params.RATE_LIMIT_PER_HOUR, { ...deps, logger }))) {
      logger.warn(`[forms:${form}] rate limited`);
      return reply(429, cors.headers, { ok: false, error: 'too many submissions, try again later' });
    }

    const parsed = schema.safeParse(fields);
    if (!parsed.success) {
      const invalid = [...new Set(parsed.error.issues.map((i) => i.path.join('.')))];
      logger.warn(`[forms:${form}] invalid fields: ${invalid.join(', ')}`);
      return reply(400, cors.headers, { ok: false, error: 'invalid submission', fields: invalid });
    }

    try {
      const created = await createFragment(fragments[form](parsed.data), params, deps);
      logger.info(`[forms:${form}] stored ${created.id}`);
      return reply(200, cors.headers, { ok: true, id: created.id });
    } catch (err) {
      const status = err instanceof FormServiceError ? err.status : 500;
      logger.error(`[forms:${form}] ${err.message}`);
      return reply(status >= 500 ? status : 502, cors.headers, { ok: false, error: 'could not store submission' });
    }
  };
}

module.exports = { createHandler, corsHeaders, formFields };
