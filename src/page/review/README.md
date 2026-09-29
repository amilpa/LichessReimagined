# Game Review

On a game's analysis page, a summary of the game, then a move-by-move review
with a coach; on the free analysis board (`/analysis`), the same coach judging
each move as it's played. Lichess's analysis controller is reached through
`#page/lichess/analysis.ts`, a typed facade over `site.analysis`.

## The domain

What the review knows, judges and says, apart from what it shows. Everything
here is pure but the engine wrapper (`engine/stockfish.ts`), and none of it
reads the page: the UI passes in the game id, the coach, the language, the
opening's name and the page's asset URL.

| Folder        | What it holds                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chess/`      | `uciToSan`, `normalizeUci` (Lichess's king-takes-rook castling in the engine's terms), piece values, `isHanging`, `isSacrifice`                                  |
| `evaluation/` | `PositionRecord` (a position's evaluation from White's view), `StoredRecordCodec` (the cache's format), win probability, move accuracy, `formatEval`, `barLabel` |
| `engine/`     | `Stockfish` (Lichess's own build, one search at a time), UCI output parsing, `toRecord`, the cloud's answers (`CloudEvalSchema`, `fromCloud`), search limits     |
| `classes/`    | The move classes (`MoveClass`), their colors, sets (`GOOD`, `GRAPH_DOTS`…), ranks, coach moods and icons (`classSvg`, `classImage`, `classIcon`)                 |
| `judge/`      | `judge` (one move, from its two positions' records), `mateVerdict`, `SURE_MATE`, the summary's `playerAccuracy` and `classCounts`                                |
| `rating/`     | The Game Rating: `model.json` (written by `tools/game-rating/fit.py`), Lichess's `divide`, `isTactical`, the odds, `rateGame`                                    |
| `coach/`      | The coach's words: `remark`, `trajectory`, `fact`, `explanation`, seeded by `CoachContext`                                                                       |
| `comment/`    | The comment's `[[…]]` tokens, `commentMarkup` (the typing's words at a given moment), `streamFor`, `verdictTitle`                                                |
| `i18n/`       | `ReviewLanguage`: every string, sentence and grammar rule, in `en` and `fr`; `pageLanguage()` picks one                                                          |

## The main types

- `PositionRecord`: `{ cp | mate, whiteWinChance, secondLineWinChance, best }`,
  White's view; `toRecord` makes one from an `EngineResult` (the engine's, or
  `fromCloud`'s). The cache stores them under the original's short keys
  (`wp`, `wp2`): `StoredRecordCodec` reads and writes that format.
- `JudgeInput` → `judge` → `MoveVerdict`: the class (`moveClass`), the win
  probability lost (`loss`), `accuracy`, the engine's `best` / `bestSan`, both
  records, both positions and the opponent's `previousMove`. Judge a game's
  moves in order, each with the one before; to relink a move to a later-judged
  previous move, spread it (`{ ...move, previousMove }`): a review is
  immutable. The UI's `JudgedMove` (`session.ts`) is one that may also name
  its opening.
- `GameRatingInput` → `rateGame` → `GameRating`: per color, `{ elo, phases }`,
  or null for a player without a move.
- `CoachContext` (`gameId`, `coach`, `language`) → `explanation(move, context,
opening)` → `CommentPart[]`: sentences, the droppable one going when the
  bubble lacks room.
- `StreamState` (`key`, `shown`, `dropped`): the typing's progress, kept by
  the UI. `streamFor(state, parts)` starts it over for a new comment;
  `commentMarkup(parts, { stream, assets, language })` draws the words.

## The UI

`index.ts` waits for the controller, `start.ts` wires the review up. One
`Session` (`session.ts`) holds what a page keeps: the view's state, the game's
analysis as it comes in (`GameWork`), the moves judged as they're played
(`LiveState`), the coach, the typing and the engine, which the game and the
moves played off it share (`engine-pool.ts`). Only `start.ts`, which builds the
session, calls the render directly; every other module goes through
`session.redraw` and `session.setMode`, which keeps the imports acyclic.

| Folder  | What it holds                                                                                                                                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game/` | The game's analysis: its export (opening, server analysis), the cache, the cloud, the engine's queue (`nextJob`), and `buildReview`, which judges the moves whose positions are in and drafts the rest                      |
| `live/` | Moves played on the board (the free board's, and those off a game): `judgeAt`, `bookAt`, `openingAt`, and the queue of engine and masters lookups (`pump`)                                                                  |
| `view/` | The DOM: the panel per mode (summary, moves, closed, live), the graph, the eval bar, the badge and arrows on the board, the move list's badges, the opening's name, the coach's avatar, the typing, the tooltip, the clicks |

`render.ts` runs every 150 ms: it draws the panel again only when what it
shows changes (`render-key.ts`), keeping the buttons and scroll positions a
redraw leaves as they were, then the board's marks.

## Tests

Besides each folder's unit tests, `golden/` drives the review through
scripts of steps on a fake analysis page (`fixtures/review-script.ts`,
`fixtures/review-scenarios.ts`: a fake controller, move list and Stockfish,
fake timers) and checks that after each step it shows exactly what the
original script showed (`golden/fixtures/legacy-*.json`). One scenario per
test file: a started review can't be stopped, so each needs its own window.
