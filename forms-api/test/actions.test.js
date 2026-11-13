const { test } = require('node:test');
const assert = require('node:assert/strict');

const contact = require('../actions/contact/index');
const newsletter = require('../actions/newsletter/index');
const trial = require('../actions/trial-request/index');

const ORIGIN = 'https://main--aem-eds-poc--akaspanion.aem.live';
const inputs = {
  AEM_AUTHOR_HOST: 'https://author-p1-e2.adobeaemcloud.com',
  AEM_SERVICE_CREDENTIALS_JSON: '{"secret":"never-sent"}',
  ALLOWED_ORIGINS: `${ORIGIN},https://main--aem-eds-poc--akaspanion.aem.page`,
  RATE_LIMIT_PER_HOUR: '10',
};
const req = (body, { origin = ORIGIN, method = 'post', ...extra } = {}) => ({
  ...inputs,
  ...extra,
  ...body,
  __ow_method: method,
  __ow_headers: { origin, 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
});

/** fetch double that records calls and answers like the AEM CF API */
function fakeFetch(status = 201, json = { id: 'frag-1', path: '/content/dam/x' }) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : undefined });
    return {
      ok: status < 300, status, json: async () => json, text: async () => 'aem error body',
    };
  };
  fn.calls = calls;
  return fn;
}

/** in-memory stand-in for @adobe/aio-lib-state */
function fakeState() {
  const store = new Map();
  return async () => ({
    get: async (k) => (store.has(k) ? { value: store.get(k) } : undefined),
    put: async (k, v) => { store.set(k, v); },
  });
}

const quiet = {
  info() {}, warn() {}, error() {},
};
const deps = (extra = {}) => ({
  fetchImpl: fakeFetch(), tokenImpl: async () => 'ims-token', stateImpl: fakeState(), logger: quiet, ...extra,
});

// exactly what blocks/contact-hero posts: every value a string
const contactBody = {
  fullName: 'Aisyah Rahman',
  email: 'aisyah@example.com',
  phone: '012 345 6789',
  age: '34',
  gender: 'female',
  consentAccepted: 'true',
  website: '',
};

test('CORS preflight from an allowed origin returns 204 with headers', async () => {
  const res = await contact.main(req({}, { method: 'options' }), deps());
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Access-Control-Allow-Origin'], ORIGIN);
  assert.match(res.headers['Access-Control-Allow-Methods'], /POST/);
});

test('requests from other origins are refused', async () => {
  const d = deps();
  const res = await contact.main(req(contactBody, { origin: 'https://evil.example' }), d);
  assert.equal(res.statusCode, 403);
  assert.equal(d.fetchImpl.calls.length, 0);
});

test('GET is not allowed', async () => {
  const res = await contact.main(req({}, { method: 'get' }), deps());
  assert.equal(res.statusCode, 405);
});

test('contact: string values from the site are normalised and stored', async () => {
  const d = deps();
  const res = await contact.main(req(contactBody), d);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true, id: 'frag-1' });

  const [call] = d.fetchImpl.calls;
  assert.equal(call.url, 'https://author-p1-e2.adobeaemcloud.com/adobe/sites/cf/fragments');
  assert.equal(call.init.headers.Authorization, 'Bearer ims-token');
  assert.equal(call.body.parentPath, '/prohance-website/site-a/form-data/contact');
  assert.equal(
    Buffer.from(call.body.modelId, 'base64url').toString(),
    '/conf/global/settings/dam/cfm/models/contact-enquiry',
  );
  const values = Object.fromEntries(call.body.fields.map((f) => [f.name, f.values[0]]));
  assert.deepEqual(values, {
    fullName: 'Aisyah Rahman',
    email: 'aisyah@example.com',
    phone: '0123456789',
    age: '34',
    gender: 'female',
    consentAccepted: true,
  });
  // action inputs (secrets) never end up in the fragment
  assert.doesNotMatch(JSON.stringify(call.body), /never-sent|AEM_AUTHOR_HOST/);
});

test('contact: invalid fields return 400 with field names only', async () => {
  const d = deps();
  const res = await contact.main(req({ ...contactBody, email: 'nope', age: '1234', consentAccepted: 'false' }), d);
  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.deepEqual(body.fields.sort(), ['age', 'consentAccepted', 'email']);
  assert.doesNotMatch(res.body, /nope|1234/);
  assert.equal(d.fetchImpl.calls.length, 0);
});

test('honeypot: filled hidden field looks successful but stores nothing', async () => {
  const d = deps();
  const res = await contact.main(req({ ...contactBody, website: 'http://spam' }), d);
  assert.equal(res.statusCode, 200);
  assert.equal(d.fetchImpl.calls.length, 0);
});

test('rate limit: the 11th submission in an hour from one IP gets 429', async () => {
  const d = deps();
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    assert.equal((await contact.main(req(contactBody), d)).statusCode, 200);
  }
  assert.equal((await contact.main(req(contactBody), d)).statusCode, 429);
});

test('rate limit fails open when the state store is down', async () => {
  const d = deps({ stateImpl: async () => { throw new Error('state down'); } });
  assert.equal((await contact.main(req(contactBody), d)).statusCode, 200);
});

test('AEM errors return 502 without leaking details', async () => {
  const d = deps({ fetchImpl: fakeFetch(403) });
  const res = await contact.main(req(contactBody), d);
  assert.equal(res.statusCode, 502);
  assert.doesNotMatch(res.body, /aem error body/);
});

test('turnstile: required when a secret is configured', async () => {
  const fetchImpl = fakeFetch(201);
  const missing = await contact.main(req(contactBody, { TURNSTILE_SECRET: 's' }), deps({ fetchImpl }));
  assert.equal(missing.statusCode, 403);

  const verify = async (url, init) => (String(url).includes('turnstile')
    ? { json: async () => ({ success: true }) }
    : fetchImpl(url, init));
  const ok = await contact.main(
    req({ ...contactBody, 'cf-turnstile-response': 'tok' }, { TURNSTILE_SECRET: 's' }),
    deps({ fetchImpl: verify }),
  );
  assert.equal(ok.statusCode, 200);
});

test('trial request: product id and listed city are stored', async () => {
  const d = deps();
  const res = await trial.main(req({
    fullName: 'Lee Wei',
    phone: '0198765432',
    email: 'lee@example.com',
    address: '12 Jalan Ampang',
    city: 'Kuala Lumpur',
    pincode: '50450',
    product: 'prohance-dm',
    website: '',
  }), d);
  assert.equal(res.statusCode, 200);
  const { body } = d.fetchImpl.calls[0];
  assert.equal(body.parentPath, '/prohance-website/site-a/form-data/trial');
  assert.match(body.title, /prohance-dm/);
});

test('trial request: unknown city and product are rejected', async () => {
  const res = await trial.main(req({
    fullName: 'Lee Wei', phone: '0198765432', email: 'lee@example.com', address: 'x', city: 'Paris', pincode: '50450', product: 'other',
  }), deps());
  assert.equal(res.statusCode, 400);
  assert.deepEqual(JSON.parse(res.body).fields.sort(), ['city', 'product']);
});

test('newsletter: source must be a known form location', async () => {
  const d = deps();
  assert.equal((await newsletter.main(req({ email: 'a@example.com', source: 'videos', website: '' }), d)).statusCode, 200);
  assert.equal((await newsletter.main(req({ email: 'a@example.com', source: 'popup' }), d)).statusCode, 400);
});
