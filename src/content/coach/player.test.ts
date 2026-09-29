import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { CoachMoodSchema } from '#shared/coach.ts';
import type { CoachState } from '#shared/protocol.ts';
import { delayUntil, nextBlink } from './blinks.ts';
import { syllableEnd } from './expression.ts';
import { coach } from './index.ts';
import { CoachPlayer } from './player.ts';
import { blinkMeta } from './lottie/blink.ts';
import { buildCoachAnimations } from './lottie/build.ts';
import type { TalkLoop } from './lottie/meta.ts';
import { RigFileSchema } from './lottie/rig.ts';
import rigFile from './lottie/fixtures/rig.json' with { type: 'json' };
// The original player driven through the script below, with the same fake
// lottie and timers: every call it made, and the avatar after each step.
import legacy from './fixtures/legacy-player.json' with { type: 'json' };

const fakes = vi.hoisted(() => {
  const log: unknown[][] = [];
  const animations: FakeAnimation[] = [];

  class FakeAnimation {
    readonly name: string;
    readonly isLoaded: boolean;
    currentFrame = 0;
    readonly #listeners = new Map<string, (() => void)[]>();

    constructor(name: string) {
      this.name = name;
      // Only the face has images to wait for.
      this.isLoaded = !name.endsWith('face');
    }

    addEventListener(event: string, callback: () => void): () => void {
      this.#listeners.set(event, [...(this.#listeners.get(event) ?? []), callback]);
      log.push([this.name, 'on', event]);
      return () => {};
    }

    fire(event: string): void {
      for (const callback of this.#listeners.get(event) ?? []) callback();
    }

    setLoop(loop: boolean): void {
      log.push([this.name, 'loop', loop]);
    }

    goToAndStop(frame: number, isFrame: boolean): void {
      log.push([this.name, 'goToAndStop', frame, isFrame]);
    }

    playSegments(segment: readonly number[], force: boolean): void {
      log.push([this.name, 'playSegments', segment, force]);
    }

    resetSegments(force: boolean): void {
      log.push([this.name, 'resetSegments', force]);
    }

    destroy(): void {
      log.push([this.name, 'destroy']);
    }
  }

  interface LoadParams {
    readonly container: Element;
    readonly renderer: string;
    readonly loop: boolean;
    readonly autoplay: boolean;
    readonly rendererSettings: unknown;
    readonly animationData: { readonly nm: string; readonly layers: readonly unknown[] };
  }

  const lottie = {
    loadAnimation({ container, animationData, ...settings }: LoadParams): FakeAnimation {
      const box = container.parentElement;
      log.push([
        'lottie',
        'loadAnimation',
        animationData.nm,
        {
          renderer: settings.renderer,
          loop: settings.loop,
          autoplay: settings.autoplay,
          rendererSettings: settings.rendererSettings,
          container: container.outerHTML,
          box: box?.className,
          index: [...(box?.children ?? [])].indexOf(container),
          layers: animationData.layers.length,
        },
      ]);
      const animation = new FakeAnimation(animationData.nm);
      animations.push(animation);
      return animation;
    },
  };

  const latest = (kind: string): FakeAnimation | undefined =>
    animations.findLast(animation => animation.name.endsWith(kind));

  return { log, lottie, latest };
});

vi.mock('lottie-web/build/player/lottie_light', () => ({ default: fakes.lottie }));

const StepSchema = z.object({
  do: z.enum(['message', 'loaded', 'complete', 'frame', 'timers', 'detach', 'attach', 'rerender']),
  coach: z.optional(z.number()),
  mood: z.optional(CoachMoodSchema),
  talking: z.optional(z.boolean()),
  animation: z.optional(z.enum(['face', 'blink'])),
  frame: z.optional(z.number()),
  face: z.optional(z.boolean()),
});
type Step = z.infer<typeof StepSchema>;

const realSetTimeout = globalThis.setTimeout;
const flush = (): Promise<void> => new Promise(resolve => realSetTimeout(resolve, 5));

function fakeTimers(): () => void {
  const pending = new Map<number, () => void>();
  let lastId = 0;
  vi.stubGlobal('setTimeout', (callback: () => void, delay: number) => {
    lastId += 1;
    pending.set(lastId, callback);
    fakes.log.push(['setTimeout', delay]);
    return lastId;
  });
  vi.stubGlobal('clearTimeout', (id: number) => pending.delete(id));
  return () => {
    const due = [...pending.values()];
    pending.clear();
    for (const callback of due) {
      fakes.log.push(['timer fired']);
      callback();
    }
  };
}

const avatarMarkup = (coachNumber: number, withFace: boolean): string =>
  `<button class="cdc-coach__avatar" data-cdc="coach" data-coach="${coachNumber}" data-mood="neutral">${withFace ? '<span class="cdc-coach__face"></span>' : ''}</button>`;

interface Stage {
  readonly panel: HTMLElement;
  readonly runTimers: () => void;
  detached: Element | null;
}

const ACTIONS: Readonly<Record<Step['do'], (step: Step, stage: Stage) => void>> = {
  message: ({ coach: coachNumber, mood, talking }) => {
    const data = { type: 'cdc:coach', coach: coachNumber, mood, talking };
    window.dispatchEvent(new MessageEvent('message', { data, source: window }));
  },
  loaded: () => fakes.latest('face')?.fire('DOMLoaded'),
  complete: ({ animation }) => fakes.latest(animation ?? 'face')?.fire('complete'),
  frame: ({ frame }) => {
    const face = fakes.latest('face');
    if (face) face.currentFrame = frame ?? 0;
  },
  timers: (_, stage) => stage.runTimers(),
  detach: (_, stage) => {
    stage.detached = stage.panel.querySelector('.cdc-coach__avatar');
    stage.detached?.remove();
  },
  attach: (_, stage) => {
    if (stage.detached) stage.panel.append(stage.detached);
  },
  rerender: ({ face }, stage) => {
    stage.panel.innerHTML = avatarMarkup(2, face ?? true);
  },
};

// The port also listens for the face's loopComplete, so talking stops once the
// avatar is gone (the original's loop ran on forever).
const isPortOnly = ([, call, event]: readonly unknown[]): boolean =>
  call === 'on' && event === 'loopComplete';

describe('the coach player', () => {
  it('plays the rig as the original did, call for call', async () => {
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://abc/${path}` },
    });
    vi.stubGlobal('fetch', (url: string) => {
      fakes.log.push(['fetch', url]);
      return Promise.resolve({ json: () => Promise.resolve(rigFile) });
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    vi.spyOn(console, 'warn').mockImplementation(() => fakes.log.push(['warn']));
    const panel = document.createElement('div');
    document.body.append(panel);
    panel.innerHTML = avatarMarkup(1, true);
    const stage: Stage = { panel, runTimers: fakeTimers(), detached: null };
    coach.start();

    for (const [i, expected] of legacy.steps.entries()) {
      const start = fakes.log.length;
      const step = StepSchema.parse(expected.step);
      ACTIONS[step.do](step, stage);
      await flush();
      const log = fakes.log.slice(start).filter(entry => !isPortOnly(entry));
      expect({ step: i, log }).toEqual({ step: i, log: expected.log });
      expect(panel.innerHTML).toBe(expected.dom);
    }
  });
});

describe('talking', () => {
  const loop: TalkLoop = [744, 815, [754, 766, 775, 789, 800, 815]];

  it('stops at the end of the syllable under way', () => {
    expect(syllableEnd(loop, 744)).toBe(754);
    expect(syllableEnd(loop, 753.6)).toBe(766);
    expect(syllableEnd(loop, 814.9)).toBe(815);
  });

  it('stops at the next syllable once the review panel is gone, and loops no more', async () => {
    vi.stubGlobal('chrome', {
      runtime: { getURL: (path: string) => `chrome-extension://abc/${path}` },
    });
    vi.stubGlobal('fetch', () => Promise.resolve({ json: () => Promise.resolve(rigFile) }));
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const host = document.createElement('div');
    host.innerHTML = avatarMarkup(1, true);
    document.body.append(host);
    const avatar = host.querySelector('.cdc-coach__avatar');
    if (!(avatar instanceof HTMLElement)) throw new Error('no avatar');
    let state: CoachState = { coach: 1, mood: 'happy', talking: false };
    const player = new CoachPlayer({ avatar, coach: 1, wanted: () => state });
    const loading = player.load();
    await flush();
    const face = fakes.latest('face');
    if (!face) throw new Error('no face');
    face.fire('DOMLoaded');
    await loading;
    const rig = RigFileSchema.parse(rigFile)['1'];
    if (!rig) throw new Error('no rig');
    const { meta } = buildCoachAnimations(rig, 1);
    const [talkStart, talkEnd] = meta.face.talk.happy;
    const faceCalls = (from: number): unknown[][] =>
      fakes.log.slice(from).filter(([name]) => name === face.name);

    const talking = fakes.log.length;
    state = { ...state, talking: true };
    player.update();
    expect(faceCalls(talking)).toEqual([
      [face.name, 'loop', true],
      [face.name, 'playSegments', [talkStart, talkEnd], true],
    ]);

    host.remove();
    face.currentFrame = 3;
    const gone = fakes.log.length;
    face.fire('loopComplete');
    const now = talkStart + 3;
    expect(faceCalls(gone)).toEqual([
      [face.name, 'loop', false],
      [face.name, 'playSegments', [now, syllableEnd(meta.face.talk.happy, now)], true],
    ]);
    const stopping = fakes.log.length;
    face.fire('complete');
    face.fire('loopComplete');
    expect(faceCalls(stopping)).toEqual([
      [face.name, 'resetSegments', true],
      [face.name, 'goToAndStop', meta.face.pose.happy, true],
    ]);
    player.destroy();
  });
});

describe('blink scheduling', () => {
  const meta = blinkMeta();

  it('picks the next blink, wrapping round the loop', () => {
    expect(nextBlink(meta.at, 0)).toEqual([84, 98]);
    expect(nextBlink(meta.at, 98)).toEqual([310, 344]);
    expect(nextBlink(meta.at, 534)).toEqual([84, 98]);
    expect(nextBlink([], 0)).toBeUndefined();
  });

  it('waits until the loop gets there', () => {
    expect(delayUntil(meta, 344, 520)).toBeCloseTo((176 / 60) * 1000);
    expect(delayUntil(meta, 534, 84)).toBe(3500);
    expect(delayUntil(meta, 520, 520)).toBe(0);
  });
});
