import { afterEach, describe, expect, it } from 'vitest';
import { formatAccuracy, gameOverTexts } from './texts.ts';

afterEach(() => {
  document.documentElement.lang = '';
});

describe('the game over’s words', () => {
  it('writes an accuracy as the page’s language does', () => {
    document.documentElement.lang = 'fr';
    expect(formatAccuracy(87.34)).toBe('87,3 %');
    document.documentElement.lang = 'en-US';
    expect(formatAccuracy(87.34)).toBe('87.3%');
    expect(formatAccuracy(100)).toBe('100%');
  });

  it('speaks French on a French page, English elsewhere', () => {
    document.documentElement.lang = 'fr';
    expect(gameOverTexts().titles.win).toBe('Vous avez gagné !');
    document.documentElement.lang = 'de';
    expect(gameOverTexts().titles.win).toBe('You won!');
  });

  it('has the coach look for the turn only after a loss', () => {
    const { verdict } = gameOverTexts();
    expect(verdict('win', '91%')).toBe('Well played! You played with 91% accuracy.');
    expect(verdict('loss', '64%')).toBe(
      'Not this time! You played with 64% accuracy. Let’s see where it turned.',
    );
    expect(verdict('draw', null)).toBe('A close game! Let’s look at the game together.');
  });
});
