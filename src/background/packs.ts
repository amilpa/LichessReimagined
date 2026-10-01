import { downloadPack } from '#shared/packs/download.ts';
import { DownloadRequestSchema, type DownloadResponse } from '#shared/packs/messages.ts';

// Downloads the packs the content script asks for: from here, GitHub is in
// reach in every browser, with no host permission (its files allow any origin).

async function answer(link: string, token: string): Promise<DownloadResponse> {
  try {
    return await downloadPack(link, token);
  } catch (error) {
    console.error('[LichessDotCom] pack download failed', error);
    return { error: 'The pack could not be downloaded.' };
  }
}

export function servePackDownloads(): void {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    const request = DownloadRequestSchema.safeParse(message);
    // Not ours: no answer, as if this listener weren't there.
    if (!request.success) return undefined;
    void answer(request.data.link, request.data.token).then(sendResponse);
    // Keeps the channel open for the answer.
    return true;
  });
}
