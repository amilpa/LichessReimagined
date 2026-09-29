import { execFileSync } from 'node:child_process';
import { BASE_VERSION } from '#manifest';
import { ROOT } from './paths.ts';

// A version is `<BASE_VERSION>.<patch>`, the patch being the number of commits
// since BASE_VERSION last changed: the commit that sets 0.2 is 0.2.0, the next
// one 0.2.1. Every commit on main gets a higher version than the one before,
// and nobody bumps it by hand.

const MANIFEST = 'src/manifest.ts';
const BASE_LINE = /^export const BASE_VERSION = '(\d+\.\d+)';$/m;
// The same line for git's -G, which takes POSIX extended expressions (no \d).
const BASE_LINE_CHANGE = "^export const BASE_VERSION = '[0-9]+\\.[0-9]+';$";

// git's errors belong in the exception, not on the terminal.
const git = (args: readonly string[], cwd: string): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** BASE_VERSION as committed at `ref`, or the working tree's where there's no manifest. */
function baseAt(ref: string, cwd: string): string {
  try {
    return BASE_LINE.exec(git(['show', `${ref}:${MANIFEST}`], cwd))?.[1] ?? BASE_VERSION;
  } catch {
    return BASE_VERSION;
  }
}

/** Commits since the one that last changed BASE_VERSION, up to `ref`. */
function patchAt(ref: string, cwd: string): string {
  const bump = git(['log', '-1', '--format=%H', '-G', BASE_LINE_CHANGE, ref, '--', MANIFEST], cwd);
  return git(['rev-list', '--count', bump === '' ? ref : `${bump}..${ref}`], cwd);
}

const versionAt = (ref: string, cwd: string): string => `${baseAt(ref, cwd)}.${patchAt(ref, cwd)}`;

/** The version of the checked-out commit. Good enough for a dev build, which gets `.0` without git. */
export function currentVersion(cwd: string = ROOT): string {
  try {
    return versionAt('HEAD', cwd);
  } catch {
    return `${BASE_VERSION}.0`;
  }
}

/**
 * The version `ref` gets, for a release, which must not guess: a shallow clone
 * counts too few commits, and without git there's nothing to count.
 */
export function releaseVersion(cwd: string = ROOT, ref = 'HEAD'): string {
  let shallow: string;
  try {
    shallow = git(['rev-parse', '--is-shallow-repository'], cwd);
  } catch (error) {
    throw new Error('no git history to count the commits', { cause: error });
  }
  if (shallow !== 'false') {
    throw new Error('a shallow clone counts too few commits: fetch the whole history');
  }
  return versionAt(ref, cwd);
}
