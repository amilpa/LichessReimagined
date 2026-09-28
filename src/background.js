// The sounds used to be downloaded and cached here. They're
// bundled now (sounds/): drop the old cache from existing installs. The
// store's package has no storage permission, so no chrome.storage: its
// installs never had that cache.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage?.local.remove('sounds:v1');
});

/* ---- dev auto-reload --- */
// Unpacked only (store installs have an update_url). Shipping pulls main into
// the folder Chrome loads, so when a Lichess tab asks, compare the files on
// disk with the ones loaded and reload the extension if they changed. It
// keeps its fingerprint in chrome.storage, which the store's package leaves
// out: loaded unpacked, that package just doesn't reload itself.
const DEV = !('update_url' in chrome.runtime.getManifest()) && !!chrome.storage;
const LOADED_KEY = 'dev:loaded';
let reloading = false;

async function fingerprint() {
  const { background, content_scripts } = chrome.runtime.getManifest();
  const files = [
    'manifest.json',
    // A service worker in Chrome, background scripts in Firefox.
    ...(background.scripts || [background.service_worker]),
    ...content_scripts.flatMap(s => [...(s.css || []), ...(s.js || [])]),
  ];
  const texts = await Promise.all(
    files.map(f =>
      fetch(chrome.runtime.getURL(f), { cache: 'no-store' }).then(
        r => r.text(),
        () => '',
      ),
    ),
  );
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(texts.join('\0')));
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

// Session storage is cleared on every extension reload, so it holds the
// fingerprint of the code that is actually running, across worker restarts.
async function loadedFingerprint() {
  const stored = (await chrome.storage.session.get(LOADED_KEY))[LOADED_KEY];
  if (stored) return stored;
  const current = await fingerprint();
  await chrome.storage.session.set({ [LOADED_KEY]: current });
  return current;
}

if (DEV) {
  chrome.runtime.onInstalled.addListener(loadedFingerprint);
  chrome.runtime.onStartup.addListener(loadedFingerprint);
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== 'cdc:dev-check') return false;
    Promise.all([loadedFingerprint(), fingerprint()]).then(([loaded, current]) => {
      const stale = reloading || loaded !== current;
      sendResponse({ reload: stale });
      if (stale && !reloading) {
        reloading = true;
        setTimeout(() => chrome.runtime.reload(), 50);
      }
    });
    return true;
  });
}
