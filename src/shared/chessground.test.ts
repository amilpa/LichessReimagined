import { describe, expect, it } from 'vitest';
import { pieceOf, wrapOrientation } from './chessground.ts';

function element(tag: string, className: string): Element {
  const created = document.createElement(tag);
  created.className = className;
  return created;
}

describe('wrapOrientation', () => {
  it('reads the side at the bottom off the wrap', () => {
    expect(wrapOrientation(element('div', 'cg-wrap orientation-black'))).toBe('black');
    expect(wrapOrientation(element('div', 'cg-wrap orientation-white'))).toBe('white');
    expect(wrapOrientation(element('div', 'cg-wrap'))).toBe('white');
  });
});

describe('pieceOf', () => {
  it('reads the color and role', () => {
    expect(pieceOf(element('piece', 'black knight'))).toEqual({ color: 'black', role: 'knight' });
    expect(pieceOf(element('piece', 'white king anim'))).toEqual({ color: 'white', role: 'king' });
  });

  it('leaves out dragged pieces’ ghosts and pieces just taken', () => {
    expect(pieceOf(element('piece', 'white queen ghost'))).toBeNull();
    expect(pieceOf(element('piece', 'black pawn fading'))).toBeNull();
  });

  it('needs both a color and a role', () => {
    expect(pieceOf(element('piece', 'white'))).toBeNull();
    expect(pieceOf(element('piece', 'rook'))).toBeNull();
  });
});
