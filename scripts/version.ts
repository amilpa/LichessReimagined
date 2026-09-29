// Prints the version a commit gets (the checked-out one, or --ref's), for the
// CI and for store tags: node scripts/version.ts [--ref origin/main]
//
// Unlike a dev build, it fails rather than guess: a shallow clone counts too
// few commits, and without git there's nothing to count.

import { parseArgs } from 'node:util';
import { ROOT } from './lib/paths.ts';
import { releaseVersion } from './lib/version.ts';

const { values } = parseArgs({ options: { ref: { type: 'string', default: 'HEAD' } } });

console.log(releaseVersion(ROOT, values.ref));
