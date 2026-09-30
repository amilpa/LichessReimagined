import { isFrench, pageLocale } from '#shared/lang.ts';
import type { EndReason, Result } from './outcome.ts';

// The game over's words, in French on a French page and English otherwise, as
// the review's. The buttons below the review's take Lichess's own labels.

export interface GameOverTexts {
  readonly titles: Readonly<Record<Result, string>>;
  /** Under the title: how it ended, '' when the status doesn't say. */
  readonly reasons: Readonly<Record<EndReason, string>>;
  readonly winner: string;
  /** On the loser's king, or on both kings for a draw. */
  readonly kingLabels: Readonly<Record<EndReason, string>>;
  readonly drawLabel: string;
  readonly analysing: string;
  /** The coach once the moves are counted; `accuracy` is formatted, null without a move. */
  readonly verdict: (result: Result, accuracy: string | null) => string;
  readonly failed: string;
  readonly review: string;
  readonly close: string;
}

const fr: GameOverTexts = {
  titles: { win: 'Vous avez gagné !', loss: 'Vous avez perdu', draw: 'Partie nulle' },
  reasons: {
    mate: 'par échec et mat',
    resign: 'par abandon',
    time: 'au temps',
    left: 'par forfait',
    stalemate: 'par pat',
    draw: '',
    other: '',
  },
  winner: 'Vainqueur',
  kingLabels: {
    mate: 'Échec et mat',
    resign: 'Abandon',
    time: 'Temps écoulé',
    left: 'Forfait',
    stalemate: 'Pat',
    draw: 'Nulle',
    other: 'Défaite',
  },
  drawLabel: 'Nulle',
  analysing: 'Je passe en revue vos coups…',
  verdict: (result, accuracy) => {
    const opening = { win: 'Belle victoire !', loss: 'Pas cette fois !', draw: 'Partie serrée !' };
    if (accuracy === null) return `${opening[result]} Voyons la partie ensemble.`;
    const close = result === 'loss' ? ' Voyons où elle s’est jouée.' : '';
    return `${opening[result]} Vous avez joué avec ${accuracy} de précision.${close}`;
  },
  failed: 'Je n’ai pas pu analyser la partie ici : le Bilan vous montrera tout.',
  review: 'Bilan de la partie',
  close: 'Fermer',
};

const en: GameOverTexts = {
  titles: { win: 'You won!', loss: 'You lost', draw: 'Draw' },
  reasons: {
    mate: 'by checkmate',
    resign: 'by resignation',
    time: 'on time',
    left: 'by abandonment',
    stalemate: 'by stalemate',
    draw: '',
    other: '',
  },
  winner: 'Winner',
  kingLabels: {
    mate: 'Checkmate',
    resign: 'Resigned',
    time: 'Time out',
    left: 'Abandoned',
    stalemate: 'Stalemate',
    draw: 'Draw',
    other: 'Lost',
  },
  drawLabel: 'Draw',
  analysing: 'Going through your moves…',
  verdict: (result, accuracy) => {
    const opening = { win: 'Well played!', loss: 'Not this time!', draw: 'A close game!' };
    if (accuracy === null) return `${opening[result]} Let’s look at the game together.`;
    const close = result === 'loss' ? ' Let’s see where it turned.' : '';
    return `${opening[result]} You played with ${accuracy} accuracy.${close}`;
  },
  failed: 'I couldn’t analyse the game here: Game Review will show you everything.',
  review: 'Game Review',
  close: 'Close',
};

export const gameOverTexts = (): GameOverTexts => (isFrench() ? fr : en);

/** An accuracy of 0 to 100 as the page's language writes a percentage: "87,3 %", "87.3%". */
export const formatAccuracy = (accuracy: number): string =>
  new Intl.NumberFormat(pageLocale(), { style: 'percent', maximumFractionDigits: 1 }).format(
    accuracy / 100,
  );
