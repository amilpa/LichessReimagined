import type { CoachMood } from '#shared/coach.ts';
import { postCoachState } from '#shared/protocol.ts';

// The coach's words in the card's bubble, typed out as the coach speaks: its
// mouth moves, played by the content script's rig, while the letters come.

const TYPE_MS = 26;
// Words said at once still get a moment of talking.
const TALK_MS = 1200;

export interface Voice {
  /** Says the words at once. */
  readonly say: (text: string, mood: CoachMood) => void;
  /** Empties the bubble, then types the words out after `delayMs`. */
  readonly typeOut: (text: string, mood: CoachMood, delayMs: number) => void;
}

export function createVoice(bubble: HTMLElement, coachId: number): Voice {
  let timer = 0;
  const talk = (mood: CoachMood, talking: boolean): void =>
    postCoachState({ coach: coachId, mood, talking });
  const cancel = (): void => {
    clearTimeout(timer);
    clearInterval(timer);
  };
  return {
    say: (text, mood) => {
      cancel();
      bubble.classList.toggle('cdc-end__bubble--empty', false);
      bubble.textContent = text;
      talk(mood, true);
      timer = window.setTimeout(() => talk(mood, false), TALK_MS);
    },
    typeOut: (text, mood, delayMs) => {
      cancel();
      bubble.textContent = '';
      bubble.classList.toggle('cdc-end__bubble--empty', true);
      talk(mood, false);
      timer = window.setTimeout(() => {
        bubble.classList.toggle('cdc-end__bubble--empty', false);
        talk(mood, true);
        let shown = 0;
        timer = window.setInterval(() => {
          shown++;
          bubble.textContent = text.slice(0, shown);
          if (shown < text.length) return;
          clearInterval(timer);
          talk(mood, false);
        }, TYPE_MS);
      }, delayMs);
    },
  };
}
