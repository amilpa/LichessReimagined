"""Chess.com's boards and piece sets, bundled in img/boards and img/pieces.

Reads the lists in src/boards.js (BOARDS, PIECE_SETS), downloads each one
from its CDN and writes it as WebP:

  img/boards/<id>.webp        the board, 1200px (150px squares)
  img/boards/<id>-tile.webp   its two top-left squares, 160x80, for the menu
  img/pieces/<set>/<wp…>.webp each piece, PIECE_PX square

Run it again when a board or a set is added to src/boards.js. Existing files
are kept unless --force. Needs Pillow (with WebP).

  python3 tools/boards/fetch.py [--force]
"""

import io
import re
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FILES = 'https://images.chesscomfiles.com/chess-themes'
THEMES = 'https://assets-themes.chess.com/image'
PIECES = [c + p for c in 'wb' for p in 'pnbrqk']
BOARD_PX = 1200
TILE_SQ = 80
PIECE_PX = 300  # sharp on a big board at 2x; the CDN serves up to 300


def lists():
    src = (ROOT / 'src/boards.js').read_text()

    def block(name):
        body = re.search(rf'const {name} = \[(.*?)\n  \];', src, re.S).group(1)
        return [re.findall(r"'([^']*)'", row) for row in re.findall(r'\[([^\]]*)\]', body)]

    return block('BOARDS'), block('PIECE_SETS')


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 Chrome/140'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return Image.open(io.BytesIO(res.read()))
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1)


def save(img, path, **opts):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, 'WEBP', method=6, **opts)


def main(force):
    boards, sets = lists()
    out = ROOT / 'img'
    for row in boards:
        id, host = row[0], row[4] if len(row) > 4 else None
        board, tile = out / f'boards/{id}.webp', out / f'boards/{id}-tile.webp'
        if board.exists() and tile.exists() and not force:
            continue
        # The newer host serves 200px squares; the older one 150px as well.
        url = f'{THEMES}/{id}/200.{host}' if host else f'{FILES}/boards/{id}/150.png'
        img = get(url).convert('RGB')
        img = img.resize((BOARD_PX, BOARD_PX), Image.LANCZOS) if img.width != BOARD_PX else img
        save(img, board, quality=86)
        sq = BOARD_PX // 8
        save(img.crop((0, 0, 2 * sq, sq)).resize((2 * TILE_SQ, TILE_SQ), Image.LANCZOS), tile, quality=86)
        print('board', id)
    for row in sets:
        id, host = row[0], row[2] if len(row) > 2 else None
        for p in PIECES:
            path = out / f'pieces/{id}/{p}.webp'
            if path.exists() and not force:
                continue
            url = f'{THEMES}/{id}/{PIECE_PX}/{p}.png' if host else f'{FILES}/pieces/{id}/{PIECE_PX}/{p}.png'
            img = get(url).convert('RGBA')
            if img.width != PIECE_PX:
                img = img.resize((PIECE_PX, PIECE_PX), Image.LANCZOS)
            save(img, path, quality=88, alpha_quality=100)
        print('pieces', id)


if __name__ == '__main__':
    main('--force' in sys.argv)
