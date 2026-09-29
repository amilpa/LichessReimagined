import { unzipSync } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { comparePaths, createZip, type ZipEntry } from './zip.ts';

const text = (value: string): Uint8Array => new TextEncoder().encode(value);

const ENTRIES: ZipEntry[] = [
  { path: 'manifest.json', data: text('{}') },
  { path: 'img/icons/b.svg', data: text('<svg/>') },
  { path: 'img/icons/a.svg', data: text('<svg></svg>') },
  { path: 'content.js', data: text('console.log(1);\n'.repeat(50)) },
];

interface CentralEntry {
  readonly name: string;
  /** DOS time in the low half, DOS date in the high half. */
  readonly time: number;
  readonly attrs: number;
}

// Reads the central directory, from the end record it starts at (APPNOTE 4.3.12, 4.3.16).
function centralEntries(zip: Uint8Array): CentralEntry[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const entries: CentralEntry[] = [];
  let offset = view.getUint32(end + 16, true);
  for (let i = 0; i < view.getUint16(end + 10, true); i++) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(offset + 28, true);
    entries.push({
      name: new TextDecoder().decode(zip.subarray(offset + 46, offset + 46 + nameLength)),
      time: view.getUint32(offset + 12, true),
      attrs: view.getUint32(offset + 38, true),
    });
    offset +=
      46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  return entries;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('createZip', () => {
  it('holds every file, unchanged', () => {
    const files = unzipSync(createZip(ENTRIES));
    expect(Object.keys(files).toSorted()).toEqual(ENTRIES.map(entry => entry.path).toSorted());
    for (const { path, data } of ENTRIES) expect(files[path]).toEqual(data);
  });

  it('writes the entries in path order, whatever order they come in', () => {
    const names = centralEntries(createZip(ENTRIES)).map(entry => entry.name);
    expect(names).toEqual(['content.js', 'img/icons/a.svg', 'img/icons/b.svg', 'manifest.json']);
  });

  it('gives the same bytes at any time and from any order', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-02T03:04:05Z'));
    const first = createZip(ENTRIES);
    vi.setSystemTime(new Date('2031-06-07T08:09:10Z'));
    expect(createZip(ENTRIES.toReversed())).toEqual(first);
  });

  it('dates every entry 1980-01-01 00:00 and makes it a plain rw-r--r-- file', () => {
    for (const entry of centralEntries(createZip(ENTRIES))) {
      // DOS date in the high half (year 0 = 1980, month 1, day 1), time 00:00:00.
      expect(entry.time).toBe(((1 << 5) | 1) << 16);
      expect(entry.attrs >>> 16).toBe(0o100644);
    }
  });

  it('refuses the same path twice', () => {
    expect(() => createZip([...ENTRIES, { path: 'content.js', data: text('') }])).toThrow(/twice/);
  });
});

describe('comparePaths', () => {
  it('sorts by code unit, not by locale', () => {
    expect(['b', 'B', 'a', '_', 'a/b', 'a.b'].toSorted(comparePaths)).toEqual([
      'B',
      '_',
      'a',
      'a.b',
      'a/b',
      'b',
    ]);
  });
});
