const DEV_API_TARGET = 'http://localhost:5163';
const apiUrlConfig = require('./src/environments/api-url.json');

/**
 * Dev-server proxy — target HTTPS directly so Kestrel does not 307-redirect.
 * A redirect to :7148 strips Authorization on cross-origin follow-up requests.
 */
const proxyTarget = apiUrlConfig.baseUrl?.startsWith('http')
  ? apiUrlConfig.baseUrl
  : DEV_API_TARGET;

module.exports = {
  '/api': {
    target: proxyTarget,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn',
  },
  '/uploads': {
    target: proxyTarget,
    secure: false,
    changeOrigin: true,
  },
  '/hubs': {
    target: proxyTarget,
    secure: false,
    changeOrigin: true,
    ws: true,
  },
};
