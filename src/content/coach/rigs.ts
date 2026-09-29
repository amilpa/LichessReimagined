import { extensionUrl } from '#content/platform/runtime.ts';
import { RigFileSchema, type RigFile } from './lottie/rig.ts';

let rigs: Promise<RigFile> | null = null;

async function fetchRigs(): Promise<RigFile> {
  const response = await fetch(extensionUrl('img/coaches/rig.json'));
  const json: unknown = await response.json();
  return RigFileSchema.parse(json);
}

/** Every coach's traced features, fetched once: a failure isn't retried. */
export function loadRigs(): Promise<RigFile> {
  rigs ??= fetchRigs();
  return rigs;
}
