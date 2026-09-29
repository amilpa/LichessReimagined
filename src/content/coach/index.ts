import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onCoachState, type CoachState } from '#shared/protocol.ts';
import { CoachPlayer } from './player.ts';

// Brings the Game Review's coach to life. The page world draws the coach's
// avatar and posts which coach it is, its mood about the move and whether
// it's talking (the comment typing out); this plays the coach's rig in it.
// It runs here rather than in the page world because the rig's files are the
// extension's, which the page's CSP keeps out of reach.

let wanted: CoachState = { coach: 0, mood: 'neutral', talking: false };
let player: CoachPlayer | null = null;

function mount(avatar: HTMLElement): void {
  player?.destroy();
  const mounted = new CoachPlayer({ avatar, coach: wanted.coach, wanted: () => wanted });
  player = mounted;
  mounted.load().catch((error: unknown) => {
    // Without its rig, the coach is just its portrait.
    console.warn('[LichessDotCom] coach rig', error);
    if (player !== mounted) return;
    mounted.destroy();
    player = null;
  });
}

function sync(): void {
  const avatar = queryOne(document, '.cdc-coach__avatar', HTMLElement);
  if (!avatar) return;
  if (player?.avatar === avatar && player.coach === wanted.coach) player.update();
  else mount(avatar);
}

export const coach: Feature = {
  name: 'coach',
  start: () => {
    onCoachState(state => {
      wanted = state;
      sync();
    });
  },
};
