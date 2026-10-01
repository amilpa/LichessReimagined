// What a downloaded file really is, from its first bytes: GitHub serves some
// types as text/plain, and a name can lie.

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  signature.every((byte, i) => bytes[offset + i] === byte);

const ascii = (text: string): number[] =>
  Array.from({ length: text.length }, (_, i) => text.charCodeAt(i));

const SVG_HEAD_BYTES = 4096;

function isSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, SVG_HEAD_BYTES)).trimStart();
  return head.startsWith('<') && /<svg[\s>]/.test(head);
}

/** The image's MIME type, or null for anything a browser can't show. */
export function imageType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x89, ...ascii('PNG')])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp';
  if (startsWith(bytes, ascii('GIF8'))) return 'image/gif';
  // An AVIF still or sequence: its major brand.
  if (startsWith(bytes, ascii('ftypavif'), 4) || startsWith(bytes, ascii('ftypavis'), 4))
    return 'image/avif';
  return isSvg(bytes) ? 'image/svg+xml' : null;
}

/** The sound's MIME type: MP3 (tagged or bare), Ogg or WAV. */
export function audioType(bytes: Uint8Array): string | null {
  const frameSync = bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0;
  if (startsWith(bytes, ascii('ID3')) || frameSync) return 'audio/mpeg';
  if (startsWith(bytes, ascii('OggS'))) return 'audio/ogg';
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WAVE'), 8)) return 'audio/wav';
  return null;
}

// btoa takes a binary string: build it in chunks, as a spread of a large array overflows the stack.
const CHUNK = 0x8000;

export function dataUrl(type: string, bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK)
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return `data:${type};base64,${btoa(binary)}`;
}

/** The bytes of a base64 data: URL. */
export function dataUrlBytes(url: string): ArrayBuffer {
  const binary = atob(url.slice(url.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
