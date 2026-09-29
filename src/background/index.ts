import { startDevReload } from './dev-reload.ts';
import { hasStorage, isUnpacked } from './extension.ts';
import { dropOldSoundCache } from './sound-cache.ts';

// The background worker: a service worker in Chrome, background scripts in Firefox.

chrome.runtime.onInstalled.addListener(dropOldSoundCache);
if (isUnpacked() && hasStorage()) startDevReload();
