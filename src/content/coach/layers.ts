import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_light';
import { createElement } from '#shared/dom.ts';
import type { Animation } from './lottie/types.ts';

// The rig's three animations, each in its own layer over the portrait's
// plate: the lids, then the blinks, then the face on top.

export interface RigLayers {
  readonly lids: AnimationItem;
  readonly blink: AnimationItem;
  readonly face: AnimationItem;
}

function play(box: HTMLElement, animationData: Animation): AnimationItem {
  const container = createElement('span');
  box.append(container);
  return lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData,
    rendererSettings: { preserveAspectRatio: 'xMidYMax meet' },
  });
}

export function playLayers(
  box: HTMLElement,
  data: { readonly lids: Animation; readonly blink: Animation; readonly face: Animation },
): RigLayers {
  const lids = play(box, data.lids);
  const blink = play(box, data.blink);
  return { lids, blink, face: play(box, data.face) };
}

// An animation without images is loaded before loadAnimation even returns;
// the face waits for its brow sprites.
const loaded = (animation: AnimationItem): Promise<void> =>
  new Promise(resolve => {
    if (animation.isLoaded) resolve();
    else animation.addEventListener('DOMLoaded', () => resolve());
  });

export async function whenLoaded({ lids, blink, face }: RigLayers): Promise<void> {
  await Promise.all([loaded(lids), loaded(blink), loaded(face)]);
}
