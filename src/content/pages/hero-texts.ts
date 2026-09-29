// The home hero's text, in the languages styles/home/ also translates the cards
// and speeds into; English otherwise.

export interface HeroText {
  readonly eyebrow: string;
  readonly title: string;
  /** The title for a signed-in player. */
  readonly greeting: (name: string) => string;
  readonly sub: string;
}

const ENGLISH: HeroText = {
  eyebrow: 'Free · No ads · Open source',
  title: 'Play chess online',
  greeting: name => `Ready to play, ${name}?`,
  sub: 'Take on thousands of players worldwide, solve puzzles and improve, completely free.',
};

const HERO_TEXTS: Readonly<Record<string, HeroText>> = {
  en: ENGLISH,
  fr: {
    eyebrow: 'Gratuit · Sans publicité · Open source',
    title: 'Jouer aux échecs en ligne',
    greeting: name => `Prêt pour une partie, ${name} ?`,
    sub: 'Affrontez des milliers de joueurs du monde entier, résolvez des problèmes et progressez, entièrement gratuitement.',
  },
  de: {
    eyebrow: 'Kostenlos · Werbefrei · Open Source',
    title: 'Schach online spielen',
    greeting: name => `Bereit für eine Partie, ${name}?`,
    sub: 'Spiele gegen Tausende Gegner aus aller Welt, löse Aufgaben und werde besser, völlig kostenlos.',
  },
  es: {
    eyebrow: 'Gratis · Sin anuncios · Código abierto',
    title: 'Juega al ajedrez en línea',
    greeting: name => `¿Listo para jugar, ${name}?`,
    sub: 'Enfréntate a miles de jugadores de todo el mundo, resuelve problemas y mejora, totalmente gratis.',
  },
  pt: {
    eyebrow: 'Grátis · Sem anúncios · Código aberto',
    title: 'Jogue xadrez online',
    greeting: name => `Pronto para jogar, ${name}?`,
    sub: 'Enfrente milhares de jogadores do mundo todo, resolva problemas e evolua, totalmente grátis.',
  },
};

/** The hero's text for a page language (`fr`, `pt-BR`…). */
export const heroText = (lang: string): HeroText => HERO_TEXTS[lang.slice(0, 2)] ?? ENGLISH;
