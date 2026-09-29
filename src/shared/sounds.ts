import { z } from 'zod/mini';

// The bundled sounds, public/sounds/<name>.mp3 (fetched by tools/assets/fetch.py,
// which reads this list).
export const SoundNameSchema = z.enum([
  'move-self',
  'move-opponent',
  'move-check',
  'capture',
  'castle',
  'promote',
  'premove',
  'illegal',
  'notify',
  'tenseconds',
  'game-start',
  'game-end',
]);

export type SoundName = z.infer<typeof SoundNameSchema>;
export const SOUND_NAMES: readonly SoundName[] = SoundNameSchema.options;
