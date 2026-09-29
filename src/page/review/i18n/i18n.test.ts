import { afterEach, describe, expect, it } from 'vitest';
import { MOVE_CLASSES } from '#page/review/classes/classes.ts';
import { en } from './en.ts';
import { fr } from './fr.ts';
import { pageLanguage } from './language.ts';
import type { ReviewLanguage } from './types.ts';
// The original script's strings, per language.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const LANGUAGES: readonly (readonly ['en' | 'fr', ReviewLanguage])[] = [
  ['en', en],
  ['fr', fr],
];

describe.each(LANGUAGES)('%s', (lang, language) => {
  const original = legacy[lang];

  it('has the original’s interface strings', () => {
    const { T } = original;
    const { phases, bestWas, ...ui } = language.ui;
    const { phases: originalPhases, bestWas: originalBestWas, ...originalUi } = T;
    expect(ui).toEqual(originalUi);
    expect([phases.opening, phases.tactics, phases.strategy, phases.endgame]).toEqual([
      originalPhases.o,
      originalPhases.t,
      originalPhases.s,
      originalPhases.e,
    ]);
    expect(bestWas('[[m:w:Nf3]]')).toBe(originalBestWas.replace('{m}', '[[m:w:Nf3]]'));
  });

  it('has the original’s class labels and verdicts', () => {
    expect(original.labels).toEqual(
      MOVE_CLASSES.map(moveClass => [
        moveClass,
        language.classLabels[moveClass],
        language.classSentences[moveClass],
      ]),
    );
  });

  it('has the original’s remarks', () => {
    expect(language.remarks).toEqual(original.remarks);
  });
});

describe('typography', () => {
  it('keeps French punctuation with its word', () => {
    expect(fr.typography('Bien joué ! Et : ça ?')).toBe('Bien joué\u00a0! Et\u00a0: ça\u00a0?');
    expect(en.typography('Well played !')).toBe('Well played !');
  });
});

describe('pageLanguage', () => {
  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('follows the page’s language', () => {
    document.documentElement.lang = 'fr-FR';
    expect(pageLanguage()).toBe(fr);
    document.documentElement.lang = 'de';
    expect(pageLanguage()).toBe(en);
  });
});
