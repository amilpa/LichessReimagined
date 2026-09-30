import { queryAll, queryOne, setStyleProperty } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { CLASS_COLORS, MOVE_CLASSES, type MoveClass } from '#page/review/classes/classes.ts';
import { classSvg } from '#page/review/classes/icon-svg.ts';
import { cardClasses } from './card.ts';
import type { PlayerSummary } from './quick-review.ts';
import type { GameOverTexts } from './texts.ts';

// The card's counts. While the coach looks at the moves, their icons spin
// through the classes like a slot machine; then each count comes in turn
// (styles/game/game-end.css), its number rolling up to the player's.

const SPIN_MS = 240;
const ROLL_MS = 700;
const ROLL_STEP_MS = 40;
/** Each count starts rolling this long after the one before, as it comes in. */
export const CHIP_STAGGER_MS = 180;

const SPUN: readonly MoveClass[] = MOVE_CLASSES.filter(moveClass => moveClass !== 'book');

export interface Chips {
  readonly spin: () => void;
  readonly reveal: (summary: PlayerSummary, texts: GameOverTexts) => void;
  readonly stop: () => void;
}

/** A number rolled up to `target` over the roll, `elapsed` into it. */
export const rolled = (target: number, elapsed: number): number =>
  Math.round(target * Math.min(1, Math.max(0, elapsed / ROLL_MS)));

const part = (chip: HTMLElement, name: string): HTMLElement | null =>
  queryOne(chip, `.cdc-end__count-${name}`, HTMLElement);

export function createChips(root: HTMLElement): Chips {
  const chips = queryAll(root, '.cdc-end__count', HTMLElement);
  let spinning = 0;
  let rolling = 0;
  const stop = (): void => {
    clearInterval(spinning);
    clearInterval(rolling);
    root.classList.toggle('cdc-end__counts--spinning', false);
  };
  const spinOnce = (): void => {
    for (const chip of chips) {
      const icon = part(chip, 'icon');
      const moveClass = SPUN[Math.floor(Math.random() * SPUN.length)];
      if (icon && moveClass) setHtml(icon, classSvg(moveClass));
    }
  };
  return {
    spin: () => {
      stop();
      root.classList.toggle('cdc-end__counts--spinning', true);
      spinOnce();
      spinning = window.setInterval(spinOnce, SPIN_MS);
    },
    reveal: (summary, texts) => {
      stop();
      const classes = cardClasses(summary.counts);
      const numbers: (HTMLElement | null)[] = [];
      for (const [i, chip] of chips.entries()) {
        const moveClass = classes[i];
        if (!moveClass) continue;
        const count = summary.counts[moveClass] ?? 0;
        setStyleProperty(chip, '--cdc-count-c', CLASS_COLORS[moveClass]);
        setStyleProperty(chip, '--cdc-count-i', String(i));
        const icon = part(chip, 'icon');
        if (icon) setHtml(icon, classSvg(moveClass));
        const label = part(chip, 'label');
        if (label) label.textContent = texts.countLabel(moveClass, count);
        chip.dataset.cdcCount = String(count);
        numbers.push(chip.querySelector('b'));
      }
      root.classList.toggle('cdc-end__counts--revealed', true);
      const started = Date.now();
      const roll = (): void => {
        const elapsed = Date.now() - started;
        for (const [i, number] of numbers.entries()) {
          const target = Number(chips[i]?.dataset.cdcCount ?? 0);
          if (number) number.textContent = String(rolled(target, elapsed - i * CHIP_STAGGER_MS));
        }
        if (elapsed >= ROLL_MS + CHIP_STAGGER_MS * numbers.length) clearInterval(rolling);
      };
      roll();
      rolling = window.setInterval(roll, ROLL_STEP_MS);
    },
    stop,
  };
}
