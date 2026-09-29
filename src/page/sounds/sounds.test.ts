import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SoundPlayer } from '#page/lichess/sound.ts';
import { fakeSoundPlayer } from './fixtures/sound-player.ts';
import { sounds } from './index.ts';
import { toBlobUrls, whenSoundPlayerReady } from './install.ts';

const post = (data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
};

function stubBlobUrls(): { readonly blobs: unknown[] } {
  const blobs: unknown[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
    blobs.push(blob);
    return `blob:sound-${blobs.length}`;
  });
  return { blobs };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, 'site');
});

describe('toBlobUrls', () => {
  it('makes an mp3 blob of each sound it is given', () => {
    const { blobs } = stubBlobUrls();
    const urls = toBlobUrls({ capture: new ArrayBuffer(4), castle: new ArrayBuffer(2) });
    expect([...urls]).toEqual([
      ['capture', 'blob:sound-1'],
      ['castle', 'blob:sound-2'],
    ]);
    const [blob] = blobs;
    expect(blob instanceof Blob && blob.type).toBe('audio/mpeg');
  });
});

describe('whenSoundPlayerReady', () => {
  it('waits for Lichess to set its player up', async () => {
    const ready = vi.fn<(sound: SoundPlayer) => void>();
    whenSoundPlayerReady(ready);
    await vi.advanceTimersByTimeAsync(120);
    expect(ready).not.toHaveBeenCalled();
    const { sound } = fakeSoundPlayer();
    Object.assign(window, { site: { sound } });
    await vi.advanceTimersByTimeAsync(50);
    expect(ready).toHaveBeenCalledWith(sound);
  });

  it('gives up after 30 seconds', async () => {
    const ready = vi.fn<(sound: SoundPlayer) => void>();
    whenSoundPlayerReady(ready);
    await vi.advanceTimersByTimeAsync(30_050);
    Object.assign(window, { site: { sound: fakeSoundPlayer().sound } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(ready).not.toHaveBeenCalled();
  });
});

describe('sounds', () => {
  it('asks for the sounds, then hooks Lichess’s player with the first ones posted', () => {
    stubBlobUrls();
    const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const { sound, calls } = fakeSoundPlayer();
    Object.assign(window, { site: { sound } });
    sounds.start();
    expect(postMessage).toHaveBeenCalledWith({ type: 'cdc:page-ready' }, location.origin);
    post({ type: 'cdc:sounds', sounds: { capture: new ArrayBuffer(1) } });
    post({ type: 'cdc:sounds', sounds: { castle: new ArrayBuffer(1) } });
    expect([...sound.paths.keys()]).toEqual(['cdc-capture']);
    expect(sound.cdcHooked).toBe(true);
    sound.play('capture');
    sound.play('berserk');
    expect(calls).toEqual([
      ['play', 'cdc-capture', 1],
      ['play', 'berserk', 1],
    ]);
  });
});
