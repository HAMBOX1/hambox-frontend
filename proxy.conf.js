const apiUrlConfig = require('./src/environments/api-url.json');

/** Dev-server proxy — target stays in sync with `src/environments/api-url.json`. */
module.exports = {
  '/api': {
    target: apiUrlConfig.baseUrl,
    secure: false,
    changeOrigin: true,
  },
  '/uploads': {
    target: apiUrlConfig.baseUrl,
    secure: false,
    changeOrigin: true,
  },
};
