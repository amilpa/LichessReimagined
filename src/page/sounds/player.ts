import type { SoundName } from '#shared/sounds.ts';
import {
  readMoveOptions,
  type MoveOptions,
  type PlaySound,
  type SoundPlayer,
} from '#page/lichess/sound.ts';
import { boardOrientation, mainBoardWrap, readBoard } from './board-reader.ts';
import { fallbackSound, soundForLichessEvent, soundFromBoard, soundFromSan } from './choose.ts';
import type { SoundSession } from './session.ts';

// Our sounds go into Lichess's player under their own names, and its `play()`
// and `move()` are wrapped so each event picks the matching one.

const PREFIX = 'cdc-';
// Our own moves reach the server, and come back with their SAN, only after
// the board sound: a SAN this fresh is the move being played now.
const FRESH_SAN_MS = 300;

interface ServerMove {
  readonly san: string;
  readonly ply: number | undefined;
  readonly at: number;
}

type PlayOurs = (name: SoundName, volume: unknown) => unknown;

interface Hook {
  readonly sound: SoundPlayer;
  readonly urls: ReadonlyMap<SoundName, string>;
  readonly session: SoundSession;
  readonly playOurs: PlayOurs;
  readonly playLichess: PlaySound;
}

// Keeps the position the next move is compared with, once the board is redrawn.
function rememberBoard(session: SoundSession): void {
  requestAnimationFrame(() => {
    session.lastPieces = readBoard(mainBoardWrap())?.pieces ?? session.lastPieces;
  });
}

function soundAfterBoardMove(session: SoundSession, lichessName: string | undefined): SoundName {
  const state = readBoard(mainBoardWrap());
  if (!state) return fallbackSound(lichessName);
  const before = session.lastPieces;
  session.lastPieces = state.pieces;
  return soundFromBoard({ before, ...state, lichessName, orientation: boardOrientation() });
}

function hookPlay({ sound, urls, playOurs, playLichess }: Hook): void {
  sound.play = (name: unknown, volume: unknown = 1): unknown => {
    if (typeof name === 'string' && !name.startsWith(PREFIX)) {
      // Our one check sound comes from move(). Lichess plays its own check and
      // mate sounds just before an opponent's move, or on the echo of ours.
      if (name === 'check' || name === 'checkmate') return Promise.resolve();
      const ours = soundForLichessEvent(name);
      if (ours && urls.has(ours)) return playOurs(ours, volume);
    }
    return playLichess(name, volume);
  };
}

function hookMove(hook: Hook): void {
  const { sound, session, playOurs, playLichess } = hook;
  const moveLichess = sound.move.bind(sound);
  let serverMove: ServerMove | null = null;

  const playMove = (name: SoundName, volume: unknown): unknown => {
    session.lastMoveSoundAt = Date.now();
    return playOurs(name, volume) ?? playLichess('move', volume);
  };
  const playSan = (san: string, ply: number | undefined, volume: unknown): unknown => {
    rememberBoard(session);
    return playMove(soundFromSan(san, ply, boardOrientation()), volume);
  };
  // Board moves on the game page, and drops (no argument).
  const playBoardMove = ({ name }: MoveOptions, volume: unknown): unknown => {
    const recent = serverMove;
    serverMove = null;
    if (recent && Date.now() - recent.at < FRESH_SAN_MS)
      return playSan(recent.san, recent.ply, volume);
    session.lastMoveSoundAt = Date.now();
    // The board is redrawn on the next frame: read it after that.
    requestAnimationFrame(() => playMove(soundAfterBoardMove(session, name), volume));
    return Promise.resolve();
  };

  sound.move = (options?: unknown): unknown => {
    const move = readMoveOptions(options);
    // The game page passes each server move here with its SAN (filter "music"),
    // just before chessground asks for the board sound: SAN says exactly what it was.
    if (move.filter === 'music' && move.san)
      serverMove = { san: move.san, ply: move.ply, at: Date.now() };
    if (move.filter === 'music' || sound.theme === 'music') return moveLichess(options);
    const volume = move.volume ?? 1;
    if (move.san) return playSan(move.san, move.ply, volume);
    if (!move.name || move.name === 'move' || move.name === 'capture')
      return playBoardMove(move, volume);
    return moveLichess(options);
  };
}

/**
 * Adds our sounds to Lichess's player and wraps its methods, once per page.
 * Returns false when another copy of this script got there first.
 */
export function hookSoundPlayer(
  sound: SoundPlayer,
  urls: ReadonlyMap<SoundName, string>,
  session: SoundSession,
): boolean {
  for (const [name, url] of urls) sound.paths.set(PREFIX + name, url);
  if (sound.cdcHooked) return false;
  sound.cdcHooked = true;
  const playLichess = sound.play.bind(sound);
  const playOurs: PlayOurs = (name, volume) =>
    urls.has(name) ? playLichess(PREFIX + name, volume) : undefined;
  const hook: Hook = { sound, urls, session, playOurs, playLichess };
  hookPlay(hook);
  hookMove(hook);
  session.playOurs = name => playOurs(name, undefined);
  return true;
}
