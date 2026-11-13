/*
 * Creates form submissions as Content Fragments on AEM author, ported from the
 * Next.js app (src/services/forms/repo.ts). Auth: AEM service credentials
 * (technical account), exchanged for an IMS token and cached while the
 * container stays warm.
 */
const { writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const MODELS_DIR = '/conf/global/settings/dam/cfm/models';
// same value the Next.js app sends on staging (no /content/dam prefix)
const FOLDER_ROOT = '/prohance-website/site-a/form-data';
const X_API_KEY = 'adobe-cloud-cf-console';
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

class FormServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'FormServiceError';
    this.status = status;
  }
}

const modelId = (name) => Buffer.from(`${MODELS_DIR}/${name}`).toString('base64url');
const randomName = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const field = (name, type, value) => ({ name, type, values: [value] });

let cachedToken = null;

/** IMS access token from the service credentials JSON (an action input). */
async function getAccessToken(params) {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const json = params.AEM_SERVICE_CREDENTIALS_JSON;
  if (!json) throw new FormServiceError('AEM_SERVICE_CREDENTIALS_JSON is not set', 500);
  // the library reads credentials from a file path
  const path = join(tmpdir(), 'aem-service-credentials.json');
  writeFileSync(path, typeof json === 'string' ? json : JSON.stringify(json), 'utf-8');
  // eslint-disable-next-line global-require
  const { getToken } = require('@adobe/aem-headless-client-nodejs');
  const result = await getToken(path);
  cachedToken = { value: result.accessToken, expiresAt: Date.now() + result.expires - EXPIRY_MARGIN_MS };
  return cachedToken.value;
}

/** Fragment payloads per form, same models and folders as the Next.js app. */
const fragments = {
  contact: (i) => ({
    title: `Enquiry from ${i.fullName}`,
    name: randomName('enquiry'),
    modelId: modelId('contact-enquiry'),
    parentPath: `${FOLDER_ROOT}/contact`,
    fields: [
      field('fullName', 'text', i.fullName), field('email', 'text', i.email),
      field('phone', 'text', i.phone), field('age', 'text', i.age),
      field('gender', 'enumeration', i.gender), field('consentAccepted', 'boolean', true),
    ],
  }),
  newsletter: (i) => ({
    title: `Newsletter subscription: ${i.email}`,
    name: randomName('sub'),
    modelId: modelId('newsletter-subscription'),
    parentPath: `${FOLDER_ROOT}/newsletter`,
    fields: [field('email', 'text', i.email), field('source', 'enumeration', i.source)],
  }),
  'trial-request': (i) => ({
    title: `Trial request for ${i.product} from ${i.fullName}`,
    name: randomName('trial'),
    modelId: modelId('trial-request'),
    parentPath: `${FOLDER_ROOT}/trial`,
    fields: [
      field('fullName', 'text', i.fullName), field('email', 'text', i.email),
      field('phone', 'text', i.phone), field('address', 'text', i.address),
      field('city', 'enumeration', i.city), field('pincode', 'text', i.pincode),
      field('product', 'enumeration', i.product),
    ],
  }),
};

/**
 * POSTs a fragment to the AEM Sites Content Fragments API (author only).
 * @returns {Promise<{id: string, path: string}>}
 */
async function createFragment(payload, params, { fetchImpl = fetch, tokenImpl = getAccessToken } = {}) {
  if (!params.AEM_AUTHOR_HOST) throw new FormServiceError('AEM_AUTHOR_HOST is not set', 500);
  const token = await tokenImpl(params);
  const url = new URL('/adobe/sites/cf/fragments', params.AEM_AUTHOR_HOST);
  let res;
  try {
    res = await fetchImpl(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': X_API_KEY,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new FormServiceError(`network error calling AEM: ${err.message}`, 502);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // AEM's error body describes the request, not the visitor's data
    throw new FormServiceError(`AEM fragment create failed with ${res.status}: ${body.slice(0, 500)}`, 502);
  }
  const data = await res.json();
  if (!data.id) throw new FormServiceError('AEM fragment create returned no id', 502);
  return { id: data.id, path: data.path || '' };
}

module.exports = {
  FormServiceError, createFragment, fragments, getAccessToken, modelId, FOLDER_ROOT,
};
