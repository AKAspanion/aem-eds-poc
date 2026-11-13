/* App Builder web action: trial-request form -> AEM Content Fragment (see lib/handler.js). */
const { createHandler } = require('../lib/handler');
const { trialRequestSchema } = require('../lib/schemas');

exports.main = createHandler({ form: 'trial-request', schema: trialRequestSchema });
