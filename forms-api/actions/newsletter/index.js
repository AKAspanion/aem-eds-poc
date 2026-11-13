/* App Builder web action: newsletter form -> AEM Content Fragment (see lib/handler.js). */
const { createHandler } = require('../lib/handler');
const { newsletterSchema } = require('../lib/schemas');

exports.main = createHandler({ form: 'newsletter', schema: newsletterSchema });
