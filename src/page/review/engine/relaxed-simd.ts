// Whether the browser runs WebAssembly's relaxed SIMD, which Lichess's faster
// Stockfish build needs. As Lichess checks it (lila's ui/lib/src/device.ts):
// a tiny module using one of its instructions validates only where it runs.

// One function: i32x4.dot_i8x16_i7x16_add_s.
const RELAXED_SIMD_MODULE = Uint8Array.from([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 8, 1, 96, 3, 123, 123, 123, 1, 123, 3, 2, 1, 0, 7, 5, 1, 1, 99, 0,
  0, 10, 13, 1, 11, 0, 32, 0, 32, 1, 32, 2, 253, 147, 2, 11,
]);

let supported: boolean | undefined;

/** Asked once per page: the answer can't change. */
export function hasRelaxedSimd(): boolean {
  supported ??= WebAssembly.validate(RELAXED_SIMD_MODULE);
  return supported;
}
