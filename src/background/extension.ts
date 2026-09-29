// What kind of install this worker runs in.

/** Loaded unpacked (development): a store install has an update_url. */
export const isUnpacked = (): boolean => !('update_url' in chrome.runtime.getManifest());

/** The Chrome Web Store's package has no storage permission, hence no chrome.storage. */
export const hasStorage = (): boolean => chrome.storage !== undefined;
