import { z } from 'zod/mini';
import { createGuard } from '#shared/guards.ts';
import { readSite } from './globals.ts';

// Lichess's asset helper, `site.asset.url`: where its own files (the engine,
// its networks) are served from.

const AssetOptionsSchema = z.object({ documentOrigin: z.boolean() });

const SiteAssetsSchema = z.object({
  asset: z.object({
    // A guard checks only that it's a function: what it returns is narrowed below.
    url: z.function({ input: [z.string(), z.optional(AssetOptionsSchema)], output: z.unknown() }),
  }),
});

const hasAssets = createGuard(SiteAssetsSchema);

export type AssetOptions = z.infer<typeof AssetOptionsSchema>;

/** The URL of one of Lichess's assets; throws on a page without the helper. */
export function assetUrl(path: string, options?: AssetOptions): string {
  const site = readSite();
  if (!hasAssets(site)) throw new Error('Lichess’s asset helper is missing');
  const url = options ? site.asset.url(path, options) : site.asset.url(path);
  if (typeof url !== 'string') throw new Error('Lichess’s asset helper returned no URL');
  return url;
}
