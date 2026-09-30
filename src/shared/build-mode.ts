// Which build this is. The build replaces CDC_DEV_BUILD (scripts/lib/build-target.ts):
// true in a dev build (`pnpm build`, `pnpm dev`), false in a release one
// (`--release`, `pnpm package`), what users install. Unset in tests.
declare const CDC_DEV_BUILD: boolean | undefined;

/** A dev build, which reloads itself when rebuilt. */
export const isDevBuild = (): boolean => typeof CDC_DEV_BUILD === 'boolean' && CDC_DEV_BUILD;
