import { describe, expect, it } from 'vitest';
import { audioType, dataUrl, dataUrlBytes, imageType } from './sniff.ts';

const bytes = (...values: readonly (number | string)[]): Uint8Array =>
  new Uint8Array(
    values.flatMap(value =>
      typeof value === 'number'
        ? [value]
        : Array.from({ length: value.length }, (_, i) => value.charCodeAt(i)),
    ),
  );

const text = (value: string): Uint8Array => new TextEncoder().encode(value);

describe('imageType', () => {
  it.each([
    [bytes(0x89, 'PNG', 0x0d, 0x0a), 'image/png'],
    [bytes(0xff, 0xd8, 0xff, 0xe0), 'image/jpeg'],
    [bytes('RIFF', 0, 0, 0, 0, 'WEBPVP8 '), 'image/webp'],
    [bytes('GIF89a'), 'image/gif'],
    [bytes(0, 0, 0, 0x1c, 'ftypavif'), 'image/avif'],
    [text('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml'],
    [text('﻿<?xml version="1.0"?>\n<!-- a knight -->\n<svg viewBox="0 0 1 1">'), 'image/svg+xml'],
  ])('knows an image by its first bytes', (file, type) => {
    expect(imageType(file)).toBe(type);
  });

  it.each([
    text('<html><body>404: Not Found</body></html>'),
    text('{"name": "pack"}'),
    bytes('RIFF', 0, 0, 0, 0, 'WAVE'),
    new Uint8Array(),
  ])('turns down anything else', file => {
    expect(imageType(file)).toBeNull();
  });
});

describe('audioType', () => {
  it.each([
    [bytes('ID3', 4, 0), 'audio/mpeg'],
    [bytes(0xff, 0xfb, 0x90), 'audio/mpeg'],
    [bytes('OggS', 0), 'audio/ogg'],
    [bytes('RIFF', 0, 0, 0, 0, 'WAVEfmt '), 'audio/wav'],
  ])('knows a sound by its first bytes', (file, type) => {
    expect(audioType(file)).toBe(type);
  });

  it('turns down anything else', () => {
    expect(audioType(bytes(0x89, 'PNG'))).toBeNull();
    expect(audioType(text('<svg>'))).toBeNull();
  });
});

describe('data: URLs', () => {
  it('carry the bytes there and back, however many', () => {
    const file = new Uint8Array(100_000).map((_, i) => (i * 7) % 256);
    const url = dataUrl('image/png', file);
    expect(url).toMatch(/^data:image\/png;base64,[\w+/]+=*$/);
    expect(new Uint8Array(dataUrlBytes(url))).toEqual(file);
  });
});
