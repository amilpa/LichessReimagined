import { isFrench } from '#shared/lang.ts';
import { en } from './en.ts';
import { fr } from './fr.ts';
import type { ReviewLanguage } from './types.ts';

/** The review's language: French on a French page, English otherwise. */
export const pageLanguage = (): ReviewLanguage => (isFrench() ? fr : en);
