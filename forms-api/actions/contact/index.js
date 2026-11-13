/* App Builder web action: contact form -> AEM Content Fragment (see lib/handler.js). */
const { createHandler } = require('../lib/handler');
const { contactSchema } = require('../lib/schemas');

exports.main = createHandler({ form: 'contact', schema: contactSchema });
