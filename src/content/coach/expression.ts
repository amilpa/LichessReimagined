import type { AnimationItem } from 'lottie-web/build/player/lottie_light';
import type { CoachMood } from '#shared/coach.ts';
import type { CoachState } from '#shared/protocol.ts';
import type { AnimationMeta, TalkLoop } from './lottie/meta.ts';

// The coach's mood and talking, one move at a time: a transition or a
// syllable finishes before the next thing starts, so the face never jumps.

/** Where talking can stop after `frame`: the end of a syllable, the mouth back at rest. */
export const syllableEnd = ([, end, stops]: TalkLoop, frame: number): number =>
  stops.find(stop => stop > frame + 0.5) ?? end;

// goToAndStop counts from the last segment played: reset to the whole animation first.
function hold(animation: AnimationItem, frame: number): void {
  animation.resetSegments(true);
  animation.goToAndStop(frame, true);
}

interface ExpressionOptions {
  readonly face: AnimationItem;
  readonly lids: AnimationItem;
  readonly meta: AnimationMeta;
  readonly mood: CoachMood;
  /** What the review last asked for. */
  readonly wanted: () => CoachState;
  readonly avatar: HTMLElement;
}

export class Expression {
  readonly #face: AnimationItem;
  readonly #lids: AnimationItem;
  readonly #meta: AnimationMeta;
  readonly #wanted: () => CoachState;
  readonly #avatar: HTMLElement;
  #mood: CoachMood;
  #talking = false;
  /** Set while a transition or a last syllable plays; called when the face's segment completes. */
  #pending: (() => void) | null = null;

  constructor({ face, lids, meta, mood, wanted, avatar }: ExpressionOptions) {
    this.#face = face;
    this.#lids = lids;
    this.#meta = meta;
    this.#mood = mood;
    this.#wanted = wanted;
    this.#avatar = avatar;
  }

  /** Jumps to the mood's pose, so the features are drawn by the time the plate shows. */
  show(): void {
    this.#face.goToAndStop(this.#meta.face.pose[this.#mood], true);
    this.#lids.goToAndStop(this.#meta.lids.pose[this.#mood], true);
  }

  /** The face's segment is over (its transitions outlast the lids'). */
  finish(): void {
    const pending = this.#pending;
    this.#pending = null;
    pending?.();
  }

  /** Takes the next step towards what the review wants, unless one is still playing. */
  step(): void {
    if (this.#pending) return;
    const wanted = this.#wanted();
    const { mood } = wanted;
    // The review stops posting once its panel closes, and the talking loop
    // would then run forever: talk only while the avatar is in the page.
    const talking = wanted.talking && this.#avatar.isConnected;
    if (this.#talking && (mood !== this.#mood || !talking)) this.#stopTalking();
    else if (mood !== this.#mood) this.#changeMood(mood);
    else if (talking && !this.#talking) this.#startTalking();
  }

  #changeMood(mood: CoachMood): void {
    const { face, lids } = this.#meta;
    const faceSegment = face.transitions[`${this.#mood}>${mood}`];
    const lidsSegment = lids.transitions[`${this.#mood}>${mood}`];
    // A segment stops a frame short of its end: land on the pose by hand.
    const settle = (): void => {
      this.#mood = mood;
      hold(this.#face, face.pose[mood]);
      hold(this.#lids, lids.pose[mood]);
      this.step();
    };
    if (!faceSegment || !lidsSegment) {
      settle();
      return;
    }
    this.#pending = settle;
    this.#lids.playSegments([...lidsSegment], true);
    this.#face.playSegments([...faceSegment], true);
  }

  #startTalking(): void {
    const [start, end] = this.#meta.face.talk[this.#mood];
    this.#talking = true;
    this.#face.setLoop(true);
    this.#face.playSegments([start, end], true);
  }

  #stopTalking(): void {
    const loop = this.#meta.face.talk[this.#mood];
    const now = loop[0] + this.#face.currentFrame;
    this.#face.setLoop(false);
    this.#pending = () => {
      this.#talking = false;
      hold(this.#face, this.#meta.face.pose[this.#mood]);
      this.step();
    };
    this.#face.playSegments([now, syllableEnd(loop, now)], true);
  }
}
