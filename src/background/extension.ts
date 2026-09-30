// What kind of install this worker runs in.

/** The Chrome Web Store's package has no storage permission, hence no chrome.storage. */
export const hasStorage = (): boolean => chrome.storage !== undefined;
