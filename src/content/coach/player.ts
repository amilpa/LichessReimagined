import type { CoachMood } from '#shared/coach.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import type { CoachState } from '#shared/protocol.ts';
import { Blinks } from './blinks.ts';
import { Expression } from './expression.ts';
import { playLayers, whenLoaded, type RigLayers } from './layers.ts';
import { buildCoachAnimations } from './lottie/build.ts';
import { loadRigs } from './rigs.ts';

// One coach's rig, playing in the review's avatar: its three animations over
// the portrait's plate, which the stylesheet shows in place of the portrait
// once the avatar has the rig class.

const RIG_CLASS = 'cdc-coach__avatar--rig';

interface PlayerOptions {
  readonly avatar: HTMLElement;
  readonly coach: number;
  /** What the review last asked for. */
  readonly wanted: () => CoachState;
}

export class CoachPlayer {
  readonly avatar: HTMLElement;
  readonly coach: number;
  readonly #mood: CoachMood;
  readonly #wanted: () => CoachState;
  #box: HTMLElement | null = null;
  #layers: RigLayers | null = null;
  #blinks: Blinks | null = null;
  #expression: Expression | null = null;
  #destroyed = false;

  constructor({ avatar, coach, wanted }: PlayerOptions) {
    this.avatar = avatar;
    this.coach = coach;
    this.#mood = wanted().mood;
    this.#wanted = wanted;
  }

  /** Builds and mounts the rig. Throws if it can't, and the coach stays a portrait. */
  async load(): Promise<void> {
    const rig = (await loadRigs())[String(this.coach)];
    if (!rig) throw new Error(`no rig for coach ${this.coach}`);
    const data = buildCoachAnimations(rig, this.coach);
    if (this.#destroyed) return;
    const face = queryOne(this.avatar, '.cdc-coach__face', HTMLElement);
    if (!face) throw new Error('the coach avatar has no face');
    const box = createElement('span', { className: 'cdc-coach__rig' });
    face.append(box);
    this.#box = box;
    const layers = playLayers(box, data);
    this.#layers = layers;
    await whenLoaded(layers);
    if (this.#destroyed) return;
    const expression = new Expression({
      face: layers.face,
      lids: layers.lids,
      meta: data.meta,
      mood: this.#mood,
      wanted: this.#wanted,
      avatar: this.avatar,
    });
    layers.face.addEventListener('complete', () => expression.finish());
    // A talking loop checks at each turn whether the avatar is still there.
    layers.face.addEventListener('loopComplete', () => expression.step());
    expression.show();
    const blinks = new Blinks({
      animation: layers.blink,
      meta: data.meta.blink,
      avatar: this.avatar,
    });
    blinks.start();
    this.avatar.classList.toggle(RIG_CLASS, true);
    this.#blinks = blinks;
    this.#expression = expression;
    expression.step();
  }

  /** Follows what the review wants, once the rig is in. */
  update(): void {
    if (!this.#expression) return;
    this.#blinks?.resume();
    this.#expression.step();
  }

  destroy(): void {
    this.#destroyed = true;
    this.#blinks?.stop();
    const layers = this.#layers;
    layers?.face.destroy();
    layers?.lids.destroy();
    layers?.blink.destroy();
    this.#box?.remove();
    this.avatar.classList.toggle(RIG_CLASS, false);
  }
}
