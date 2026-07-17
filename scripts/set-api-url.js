const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.HAMBOX_API_BASE_URL ?? '').replace(/\/$/, '');
const googleClientId = process.env.HAMBOX_GOOGLE_CLIENT_ID ?? '';
const target = path.join(__dirname, '..', 'src', 'environments', 'api-url.json');

fs.writeFileSync(target, `${JSON.stringify({ baseUrl: apiUrl, googleClientId }, null, 2)}\n`, 'utf8');
console.log(`API base URL set to ${apiUrl}`);
console.log(`Google client ID ${googleClientId ? 'set' : 'not set'}`);
