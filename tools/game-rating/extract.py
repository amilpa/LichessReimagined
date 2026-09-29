r"""Step 1 of the Game Review's game rating calibration: every player-game of
a Lichess database slice, as its moves' win% losses and phases.

Needs python-chess. Feed it a slice of a monthly dump of rated games
(https://database.lichess.org). Only the games with Stockfish evals (about
10%) are kept, and 700 MB of a month holds about 230k of them:

  dump=https://database.lichess.org/standard/lichess_db_standard_rated_2026-08.pgn.zst
  curl -r 0-700000000 $dump | zstdcat \
    | python3 tools/game-rating/extract.py - openings/ > moves.jsonl

zstdcat complains that the slice ends mid-frame, as expected. openings/ holds
lichess-org/chess-openings' a.tsv to e.tsv, for the book moves. fit.py then
turns moves.jsonl into src/page/review/rating/model.json.

Each move is judged as the review judges it, and the two must stay in step:
the same win% curve (src/page/review/evaluation/score.ts), book moves by
Lichess's opening names, and the phase of the position it was played from,
by Lichess's own divider (src/page/review/rating/phases.ts), a middlegame
position being tactics when it has a tactic in it
(src/page/review/rating/tactical.ts).

Each line it writes is one side of a game: its speed (s), rating (r), the
opponent's rating (ro), score (res), moves (m), the opponent's moves (mo),
the game's id and the side's color (c). A move is [win% lost, win% before,
phase], the phase o, t, s or e (opening, tactics, strategy, endgame), or k
for a book move.
"""

import io
import json
import math
import multiprocessing
import sys
from pathlib import Path

import chess
import chess.pgn

# As an attacker the king is worth the most: it can only take what's undefended.
PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 100,
}
# Lichess's speeds by a game's estimated duration: its base time plus 40 increments.
SPEED_LIMITS = ((30, 'ultraBullet'), (180, 'bullet'), (480, 'blitz'), (1500, 'rapid'))
WHITE_SCORES = {'1-0': 1, '0-1': 0, '1/2-1/2': 0.5}
MIN_PLIES = 10
BOOK_PLIES = 40  # the book can't last longer
BOOK_MIN_PIECES = 20  # nor go on once fewer pieces are left
# The named openings' positions, filled in each worker by load_book.
BOOK_POSITIONS = set()


def win_percent(cp):
    """Lichess's win% curve, from White's centipawns."""
    return 50 + 50 * (2 / (1 + math.exp(-0.00368208 * cp)) - 1)


# ---- Lichess's divider (scalachess Divider.scala) ----


def majors_and_minors(board):
    return chess.popcount(board.occupied & ~(board.kings | board.pawns))


def back_rank_sparse(board):
    return (
        chess.popcount(chess.BB_RANK_1 & board.occupied_co[chess.WHITE]) < 4
        or chess.popcount(chess.BB_RANK_8 & board.occupied_co[chess.BLACK]) < 4
    )


def region_score(y, white, black):
    """A 2×2 region's score by its rank y (1 to 7) and its white and black pieces."""
    if white == 0:
        return {
            1: 1 + y,
            2: 2 + (6 - y) if y < 6 else 0,
            3: 3 + (7 - y) if y < 7 else 0,
            4: 3 + (7 - y) if y < 7 else 0,
        }.get(black, 0)
    if white == 1:
        return {0: 1 + (8 - y), 1: 5 + abs(4 - y), 2: 4 + (7 - y), 3: 5 + (7 - y)}.get(black, 0)
    if white == 2:
        return {0: 2 + (y - 2) if y > 2 else 0, 1: 4 + (y - 1), 2: 7}.get(black, 0)
    if white == 3:
        return {0: 3 + (y - 1) if y > 1 else 0, 1: 5 + (y - 1)}.get(black, 0)
    if white == 4:
        return 3 + (y - 1) if black == 0 and y > 1 else 0
    return 0


# The board's 49 2×2 regions, each as its squares and its rank.
REGIONS = [(0x0303 << (x + 8 * y), y + 1) for y in range(7) for x in range(7)]


def mixedness(board):
    white, black = board.occupied_co[chess.WHITE], board.occupied_co[chess.BLACK]
    return sum(
        region_score(rank, chess.popcount(white & squares), chess.popcount(black & squares))
        for squares, rank in REGIONS
    )


def is_middlegame(board):
    return majors_and_minors(board) <= 10 or back_rank_sparse(board) or mixedness(board) > 150


def is_endgame(board):
    return majors_and_minors(board) <= 6


def first_index(boards, test):
    return next((i for i, board in enumerate(boards) if test(board)), None)


def division(boards):
    """The indexes of the first middlegame and endgame positions, or None."""
    middle = first_index(boards, is_middlegame)
    end = first_index(boards, is_endgame) if middle is not None else None
    if middle is not None and end is not None and middle >= end:
        middle = None
    return middle, end


# ---- tactics ----


def is_hanging(board, square, piece):
    attackers = board.attackers(not piece.color, square)
    if not attackers:
        return False
    cheapest = min(PIECE_VALUES[board.piece_type_at(attacker)] for attacker in attackers)
    return cheapest < PIECE_VALUES[piece.piece_type] or not board.attackers(piece.color, square)


def hangs_a_piece(board):
    """A piece (not a pawn or the king) either side could win: attacked, and
    undefended or attacked by something cheaper. Pins are ignored, as in
    the review's `attackerValues` (src/page/review/chess/material.ts)."""
    pieces = board.piece_map(mask=board.knights | board.bishops | board.rooks | board.queens)
    return any(is_hanging(board, square, piece) for square, piece in pieces.items())


def is_tactical(board, previous_loss):
    """A position with a tactic in it: the side to move is in check, the
    opponent's last move threw away 10% or more (a chance to punish it), or
    a piece hangs."""
    return board.is_check() or previous_loss >= 10 or hangs_a_piece(board)


# ---- games ----


def opening_lines(folder):
    """The moves of every named opening, as PGN."""
    for name in 'abcde':
        with (Path(folder) / f'{name}.tsv').open() as file:
            next(file)  # the header
            for line in file:
                yield line.rstrip('\n').split('\t')[2]


def opening_position(pgn):
    board = chess.Board()
    for token in pgn.split():
        if not token[0].isdigit():  # a move, not its number
            board.push_san(token)
    return board.epd()


def load_book(folder):
    global BOOK_POSITIONS
    BOOK_POSITIONS = {opening_position(pgn) for pgn in opening_lines(folder)}


def speed(time_control):
    if time_control == '-':
        return 'correspondence'
    base, increment = (int(part) for part in time_control.split('+'))
    duration = base + 40 * increment
    return next((name for limit, name in SPEED_LIMITS if duration < limit), 'classical')


def read_game(text):
    """A standard game from the start with evals in it, or None."""
    if '%eval' not in text:
        return None
    game = chess.pgn.read_game(io.StringIO(text))
    if game is None:
        return None
    standard = game.headers.get('Variant', 'Standard') == 'Standard' and 'FEN' not in game.headers
    return game if standard else None


def white_win_percent(score):
    if score.is_mate():
        return 100 if score.mate() > 0 else 0
    return win_percent(score.score())


def replay(game):
    """The game's positions and White's win% in each, up to the first move
    without an eval (checkmate needs none)."""
    board = game.board()
    # The start position, at +0.18.
    boards, win_percents = [board.copy(stack=False)], [win_percent(18)]
    for node in game.mainline():
        board.push(node.move)
        boards.append(board.copy(stack=False))
        evaluation = node.eval()
        if evaluation is not None:
            win_percents.append(white_win_percent(evaluation.white()))
        elif board.is_checkmate():
            win_percents.append(0 if board.turn == chess.WHITE else 100)
        else:
            break
    return boards[: len(win_percents)], win_percents


def book_length(boards):
    """How many plies the book lasted: up to the last named opening position."""
    length = 0
    for ply in range(1, min(len(boards) - 1, BOOK_PLIES) + 1):
        if chess.popcount(boards[ply - 1].occupied) < BOOK_MIN_PIECES:
            break
        if boards[ply].epd() in BOOK_POSITIONS:
            length = ply
    return length


def phase(boards, index, middle, end, previous_loss):
    if end is not None and index >= end:
        return 'e'
    if middle is None or index < middle:
        return 'o'
    return 't' if is_tactical(boards[index], previous_loss) else 's'


def judge_moves(boards, win_percents):
    """Each side's moves, as [win% lost, the mover's win% before, phase]."""
    book = book_length(boards)
    middle, end = division(boards)
    moves = {'w': [], 'b': []}
    previous_loss = 0
    for ply in range(1, len(win_percents)):
        color = 'w' if ply % 2 == 1 else 'b'
        before, after = win_percents[ply - 1], win_percents[ply]
        if color == 'b':
            before, after = 100 - before, 100 - after
        loss = max(0, before - after)
        in_book = ply <= book
        # The phase of the position the move was played from.
        move_phase = 'k' if in_book else phase(boards, ply - 1, middle, end, previous_loss)
        moves[color].append([round(loss, 2), round(before, 1), move_phase])
        previous_loss = 0 if in_book else loss
    return moves


def score_of(white_score, color):
    if white_score is None:
        return None
    return white_score if color == 'w' else 1 - white_score


def player_games(text):
    """The game's two sides, or nothing when it doesn't count."""
    game = read_game(text)
    if game is None:
        return []
    headers = game.headers
    try:
        ratings = {'w': int(headers['WhiteElo']), 'b': int(headers['BlackElo'])}
    except (KeyError, ValueError):
        return []
    boards, win_percents = replay(game)
    if len(win_percents) - 1 < MIN_PLIES:
        return []
    moves = judge_moves(boards, win_percents)
    white_score = WHITE_SCORES.get(headers.get('Result'))
    return [
        {
            's': speed(headers.get('TimeControl', '-')),
            'r': ratings[color],
            'ro': ratings[opponent],
            'res': score_of(white_score, color),
            'm': moves[color],
            'mo': moves[opponent],
            'id': headers.get('Site', '')[-8:],
            'c': color,
        }
        for color, opponent in (('w', 'b'), ('b', 'w'))
    ]


def pgn_texts(path):
    """Each game's text in a PGN file, or in stdin for '-'."""
    lines = []
    with sys.stdin if path == '-' else Path(path).open() as file:
        for line in file:
            if line.startswith('[Event ') and lines:
                yield ''.join(lines)
                lines = []
            lines.append(line)
    if lines:
        yield ''.join(lines)


def main(pgn, openings):
    with multiprocessing.Pool(initializer=load_book, initargs=(openings,)) as pool:
        for sides in pool.imap_unordered(player_games, pgn_texts(pgn), chunksize=200):
            for side in sides:
                sys.stdout.write(json.dumps(side, separators=(',', ':')) + '\n')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
