import { zipSync, type Zippable } from 'fflate';

// The same files make the same zip, byte for byte, on any machine and at any
// time: the entries go in path order, each with the same date and mode.

export interface ZipEntry {
  /** Where the file goes in the zip, with forward slashes. */
  readonly path: string;
  readonly data: Uint8Array;
}

// fflate stores the date's local fields, so a date built from local fields
// reads the same in every time zone. 1980 is the earliest a zip can hold.
const FIXED_DATE = new Date(1980, 0, 1);
const UNIX = 3;
const REGULAR_FILE = 0o100644;

/** Orders paths by their UTF-16 code units, the same everywhere, unlike a locale compare. */
export function comparePaths(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function createZip(entries: readonly ZipEntry[]): Uint8Array {
  const sorted = entries.toSorted((left, right) => comparePaths(left.path, right.path));
  const files: Zippable = {};
  for (const { path, data } of sorted) {
    if (Object.hasOwn(files, path)) throw new Error(`${path} is in the zip twice`);
    files[path] = [data, { level: 9, mtime: FIXED_DATE, os: UNIX, attrs: REGULAR_FILE << 16 }];
  }
  return zipSync(files);
}
