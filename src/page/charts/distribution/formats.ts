import { translate } from '#page/lichess/globals.ts';

export interface NumberFormats {
  readonly count: Intl.NumberFormat;
  /** The axis' player counts: 12K. */
  readonly compact: Intl.NumberFormat;
  readonly percent: Intl.NumberFormat;
  /** The axis' shares: 25 %. */
  readonly wholePercent: Intl.NumberFormat;
}

export function numberFormats(locale: string | undefined): NumberFormats {
  return {
    count: new Intl.NumberFormat(locale),
    compact: new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }),
    percent: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }),
    wholePercent: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
  };
}

export interface Names {
  readonly players: string;
  readonly cumulative: string;
}

// Lichess's own translations (`i18n.site`), with English as the fallback if a key goes missing.
export const seriesNames = (): Names => ({
  players: translate('players', 'Players'),
  cumulative: translate('cumulative', 'Cumulative'),
});

export const yourRatingLabel = (): string => translate('yourRating', 'Your rating');
