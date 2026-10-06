import { z } from 'zod/mini';
import { closestTo, createElement, onDomReady, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { parseJson } from '#shared/json.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The "Create a game" button as a one-click rated seek: it reads "Play <id>"
// for the signed-in user's most played pool, and opens a popup with every
// mode to pick another (styles/home/quick-play.css). Picking a mode presses
// that pool's tile, which starts Lichess's own pairing.

const PerfSchema = z.object({ games: z.number() });

const UserSchema = z.object({
  perfs: z.object({
    bullet: PerfSchema,
    blitz: PerfSchema,
    rapid: PerfSchema,
    classical: PerfSchema,
    correspondence: PerfSchema,
  }),
});

type User = z.infer<typeof UserSchema>;
type Perfs = User['perfs'];

const SPEEDS = ['bullet', 'blitz', 'rapid', 'classical', 'correspondence'] as const;

type Speed = (typeof SPEEDS)[number];

// Preferred pools per speed, first existing tile wins. Correspondence has no
// pool: its `custom` tile opens the full setup dialog instead.
const POOLS: Readonly<Record<Speed, readonly string[]>> = {
  bullet: ['1+0', '2+1'],
  blitz: ['3+2', '5+0', '5+3'],
  rapid: ['10+0', '10+5', '15+10'],
  classical: ['30+0', '30+20'],
  correspondence: ['custom'],
};

const POPUP = 'cdc-quick';

function userName(): string | null {
  return document.body.dataset.user ?? null;
}

async function loadPerfs(name: string): Promise<Perfs | null> {
  let text: string | null = null;
  try {
    const response = await fetch(`/api/user/${encodeURIComponent(name)}`);
    if (response.ok) text = await response.text();
  } catch {
    return null;
  }
  return parseJson(text, UserSchema)?.perfs ?? null;
}

// Speeds most played first; the first with a tile on the page wins, so a
// missing pool falls through to the next mode rather than nothing.
function pickPool(perfs: Perfs): string | null {
  const ranked: Speed[] = [];
  for (const speed of SPEEDS) {
    if (perfs[speed].games <= 0) continue;
    const at = ranked.findIndex(known => perfs[known].games < perfs[speed].games);
    ranked.splice(at === -1 ? ranked.length : at, 0, speed);
  }
  for (const speed of ranked) {
    const poolId = POOLS[speed].find(id => poolTile(id));
    if (poolId) return poolId;
  }
  return null;
}

function poolTile(poolId: string): HTMLElement | null {
  return queryOne(document, `.lpool[data-id='${poolId}']`, HTMLElement);
}

function poolFor(speed: Speed): string | null {
  return POOLS[speed].find(id => poolTile(id)) ?? null;
}

let perfs: Perfs | null = null;
let popup: HTMLElement | null = null;
let poolId: string | null = null;

async function prepare(): Promise<void> {
  const name = userName();
  if (!queryOne(document, 'main.lobby', HTMLElement) || !name) return;
  perfs = await loadPerfs(name);
}

// The lobby re-renders its buttons after connecting, wiping one-shot labels:
// re-assert ours while they differ. Pools load over the socket, so the pool
// resolves here too, on the first tick that sees its tile.
function syncLabel(): void {
  if (!perfs) return;
  poolId ??= pickPool(perfs);
  if (!poolId) return;
  const button = queryOne(document, 'main.lobby .lobby__start__button--hook', HTMLElement);
  if (button && button.textContent !== 'Battle') {
    button.textContent = 'Battle';
    setData(button, 'cdcLabel', '');
  }
}

function closePopup(): void {
  popup?.remove();
  popup = null;
}

function pickSpeed(speed: Speed): void {
  const poolId = poolFor(speed);
  closePopup();
  const tile = poolId ? poolTile(poolId) : null;
  // Gone, or already seeking it: leave Lichess alone.
  if (tile && !tile.classList.contains('active')) tile.click();
}

function openPopup(button: HTMLElement): void {
  if (!perfs) return;
  closePopup();
  const menu = createElement('div', { className: POPUP });
  for (const speed of SPEEDS) {
    const poolId = poolFor(speed);
    const games = perfs[speed].games;
    const name = `${speed[0]?.toUpperCase()}${speed.slice(1)}`;
    const row = createElement('button', {
      className: `${POPUP}__row`,
      attrs: { type: 'button' },
      text: poolId === 'custom' ? name : `${name} ${poolId ?? ''}`.trim(),
    });
    row.append(
      createElement('span', {
        className: `${POPUP}__games`,
        text: `${games} game${games === 1 ? '' : 's'}`,
      }),
    );
    if (!poolId) row.toggleAttribute('disabled', true);
    else row.addEventListener('click', () => pickSpeed(speed));
    menu.append(row);
  }
  document.body.append(menu);
  const box = button.getBoundingClientRect();
  menu.style.left = `${box.left}px`;
  menu.style.top = `${box.bottom + 6}px`;
  popup = menu;
}

function onClick(event: MouseEvent): void {
  // Capture, before Lichess's own listener opens the setup dialog.
  if (!perfs || event.button !== 0 || event.defaultPrevented) return;
  const button = closestTo(event.target, '.lobby__start__button--hook', HTMLElement);
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  if (popup) closePopup();
  else openPopup(button);
}

function onPointerDown(event: MouseEvent): void {
  if (!popup) return;
  const target = event.target;
  if (target instanceof Node && popup.contains(target)) return;
  if (closestTo(target, '.lobby__start__button--hook', HTMLElement)) return;
  closePopup();
}

// The start buttons' icons, decoded before first paint so they don't pop in
// after the labels.
function preloadIcons(): void {
  for (const name of ['crossed-swords', 'puzzle-piece', 'microscope']) {
    const image = new Image();
    image.src = chrome.runtime.getURL(`img/icons/${name}.svg`);
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closePopup();
}

export const quickPlay: Feature = {
  name: 'quick play',
  start: () => {
    preloadIcons();
    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('scroll', closePopup, true);
    onDomReady(() => void prepare());
    onEveryTick('quick play', syncLabel);
  },
};
