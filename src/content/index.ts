import { startFeatures } from '#shared/features.ts';
import { boards } from './boards/index.ts';
import { fonts } from './bootstrap/fonts.ts';
import { donate } from './sidebar/donate.ts';
import { coachChoice } from './bootstrap/coach-choice.ts';
import { fideOffset } from './pages/fide.ts';
import { marks } from './layout/marks.ts';
import { hasFlags } from './layout/has-flags.ts';
import { aiPlayers } from './game/ai-players.ts';
import { boardZoom } from './layout/board-zoom.ts';
import { sounds } from './sounds/index.ts';
import { controlsHeight } from './layout/controls-height.ts';
import { analysisPlayers } from './analysis/players.ts';
import { capturedPieces } from './game/captured.ts';
import { boardTools } from './game/board-tools.ts';
import { moveTimes } from './game/move-times.ts';
import { newGame } from './game/new-game.ts';
import { countryFlags } from './game/flags.ts';
import { boardInset } from './layout/board-inset.ts';
import { evalGauge } from './analysis/eval-gauge.ts';
import { puzzleSession } from './pages/puzzle.ts';
import { homeHero } from './pages/home-hero.ts';
import { coachTitles } from './pages/coach-titles.ts';
import { swiss } from './pages/swiss.ts';
import { forumLabels } from './pages/forum.ts';
import { tv } from './pages/tv.ts';
import { gameMeta } from './game/game-meta.ts';
import { powertip } from './ui/powertip.ts';
import { tooltip } from './ui/tooltip.ts';
import { tabs } from './ui/tabs.ts';
import { devReload } from './dev/reload.ts';
import { radar } from './charts/radar/index.ts';
import { ratingChart } from './charts/rating-chart/index.ts';
import { coach } from './coach/index.ts';
import { reloadIfInjectedLate } from './bootstrap/late-reload.ts';
import { startSyncLoop } from './sync-loop.ts';

// The isolated-world content script. It can reach the extension's files and
// APIs, not Lichess's objects (see src/page for those).

function main(): void {
  // The board and pieces go on <html> first, so the page never shows others.
  startFeatures([boards]);
  if (reloadIfInjectedLate()) return;
  startFeatures([
    fonts,
    donate,
    coachChoice,
    fideOffset,
    marks,
    hasFlags,
    aiPlayers,
    boardZoom,
    sounds,
    controlsHeight,
    analysisPlayers,
    capturedPieces,
    boardTools,
    moveTimes,
    newGame,
    countryFlags,
    boardInset,
    evalGauge,
    puzzleSession,
    homeHero,
    coachTitles,
    swiss,
    forumLabels,
    tv,
    gameMeta,
    powertip,
    tooltip,
    tabs,
    devReload,
    radar,
    ratingChart,
    coach,
  ]);
  startSyncLoop();
}

main();
