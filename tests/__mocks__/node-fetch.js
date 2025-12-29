// Mock for node-fetch - use native fetch if available
const fetch = globalThis.fetch || require('undici').fetch;
module.exports = fetch;
module.exports.default = fetch;
module.exports.Headers = globalThis.Headers || require('undici').Headers;
module.exports.Request = globalThis.Request || require('undici').Request;
module.exports.Response = globalThis.Response || require('undici').Response;
