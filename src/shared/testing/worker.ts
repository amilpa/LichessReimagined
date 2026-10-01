import { vi } from 'vitest';
import { downloadPack } from '#shared/packs/download.ts';
import { DownloadRequestSchema } from '#shared/packs/messages.ts';

// Test support: the background worker as the content script reaches it, over
// chrome.runtime.sendMessage, answering pack downloads as it does
// (background/packs.ts), with fetch as the test stubs it.

export function fakeWorker(): void {
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: async (message: unknown): Promise<unknown> => {
        const request = DownloadRequestSchema.parse(message);
        return downloadPack(request.link, request.token);
      },
    },
  });
}
