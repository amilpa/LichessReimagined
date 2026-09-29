import { describe, expect, it } from 'vitest';
import { createManifest, ManifestSchema, OUTPUT, type Target } from './manifest.ts';

const TARGETS: readonly Target[] = ['chrome', 'chrome-store', 'firefox'];

describe('createManifest', () => {
  it.each(TARGETS)('builds a valid manifest for %s', target => {
    const manifest = createManifest(target, '0.1.300');
    expect(ManifestSchema.parse(manifest)).toEqual(manifest);
    expect(manifest.version).toBe('0.1.300');
  });

  it('loads the isolated script before the page script, both at document_start', () => {
    const [isolated, page] = createManifest('chrome', '0.1').content_scripts;
    expect(isolated).toMatchObject({ js: [OUTPUT.content], css: [OUTPUT.styles] });
    expect(isolated?.world).toBeUndefined();
    expect(page).toMatchObject({ js: [OUTPUT.page], world: 'MAIN' });
  });

  it('keeps the storage permission out of the Chrome Web Store package', () => {
    expect(createManifest('chrome', '0.1').permissions).toEqual(['storage']);
    expect(createManifest('chrome-store', '0.1').permissions).toBeUndefined();
  });

  it('gives Firefox background scripts and a gecko id', () => {
    const manifest = createManifest('firefox', '0.1');
    expect(manifest.background).toEqual({ scripts: [OUTPUT.background] });
    expect(manifest.browser_specific_settings?.gecko.id).toMatch(/@/);
    expect(createManifest('chrome', '0.1').background).toEqual({
      service_worker: OUTPUT.background,
    });
  });
});
