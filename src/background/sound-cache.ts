import { hasStorage } from './extension.ts';

// The sounds used to be downloaded and cached here; installs that had the
// cache drop it. The store's package never had one.

const OLD_CACHE_KEY = 'sounds:v1';

export function dropOldSoundCache(): void {
  if (hasStorage()) void chrome.storage.local.remove(OLD_CACHE_KEY);
}
