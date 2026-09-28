// Sends the store zip to the Chrome Web Store and submits it for review, with
// the store's API v2. The CI runs it on a `store-*` tag:
//
//   node tools/store/publish.mjs <store zip> <version>
//
// CWS_SERVICE_ACCOUNT is the JSON key of the service account added under
// Account in the store's dashboard, CWS_PUBLISHER_ID the publisher's id.
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const ITEM = 'fpfdkingmfhfgpjkbnngdianoohlgeho';
const API = 'https://chromewebstore.googleapis.com';

const [zip, version] = process.argv.slice(2);
const { CWS_SERVICE_ACCOUNT, CWS_PUBLISHER_ID } = process.env;
if (!zip || !version) fail('usage: publish.mjs <store zip> <version>');
if (!CWS_SERVICE_ACCOUNT || !CWS_PUBLISHER_ID)
  fail('the CWS_SERVICE_ACCOUNT and CWS_PUBLISHER_ID secrets must be set');

const item = `publishers/${CWS_PUBLISHER_ID}/items/${ITEM}`;

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

async function call(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) fail(`${init.method || 'GET'} ${url}: ${res.status} ${text}`);
  return JSON.parse(text);
}

// The service account signs its own token request (a JWT), so there's no
// refresh token to expire.
async function token() {
  const key = JSON.parse(CWS_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const part = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const claims = part({ alg: 'RS256', typ: 'JWT' }) + '.' + part({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/chromewebstore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  const sig = createSign('RSA-SHA256').update(claims).sign(key.private_key, 'base64url');
  const res = await call('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${claims}.${sig}`,
    }),
  });
  return { Authorization: `Bearer ${res.access_token}` };
}

const auth = await token();
const status = () => call(`${API}/v2/${item}:fetchStatus`, { headers: auth });

// The store reviews one submission at a time: say so rather than have the
// upload fail on it.
const before = await status();
const live = before.publishedItemRevisionStatus?.distributionChannels?.[0]?.crxVersion;
console.log(`On the store: ${live || 'nothing yet'}. Sending ${version}.`);
const pending = before.submittedItemRevisionStatus;
if (pending?.state === 'PENDING_REVIEW') {
  const v = pending.distributionChannels?.[0]?.crxVersion || 'a version';
  fail(`${v} is still in review: wait for it, or cancel it in the dashboard, then run this again`);
}

const upload = await call(`${API}/upload/v2/${item}:upload`, {
  method: 'POST',
  headers: auth,
  body: readFileSync(zip),
});
let state = upload.uploadState;
// A big package is processed after the request returns.
for (let i = 0; i < 60 && /IN_PROGRESS/.test(state); i++) {
  await new Promise(r => setTimeout(r, 5000));
  state = (await status()).lastAsyncUploadState;
}
if (state !== 'SUCCEEDED') fail(`the upload ended as ${state}: ${JSON.stringify(upload)}`);
if (upload.crxVersion && upload.crxVersion !== version)
  fail(`the store read version ${upload.crxVersion} in the zip, not ${version}`);

// Published as soon as it's approved, with the visibility set in the dashboard.
const published = await call(`${API}/v2/${item}:publish`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' }),
});
for (const w of published.warningInfo?.warnings || [])
  console.log(`::warning::${w.reason}: ${w.description}`);
console.log(`${version} submitted: ${published.state}.`);
