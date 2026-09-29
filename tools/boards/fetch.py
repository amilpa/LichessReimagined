"""Chess.com's boards and piece sets, bundled in public/img/boards and
public/img/pieces.

Downloads every board and piece set of src/content/boards/catalog.json from
its CDN and writes it as WebP:

  public/img/boards/<id>.webp            the board, 1200px (150px squares)
  public/img/boards/<id>-tile.webp       its two top-left squares, 160x80, for the menu
  public/img/pieces/<set>/<piece>.webp   each piece (wp, wn … bk), 300px

An entry's "host" says which CDN has it: "themes" for the newer
assets-themes.chess.com, where a board's "format" is its file type (png if
not given), otherwise images.chesscomfiles.com.

Run it again when a board or a set is added to the catalog. Existing files
are kept unless --force. Needs Pillow, with WebP.

  python3 tools/boards/fetch.py [--force]
"""

import io
import json
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'src/content/boards/catalog.json'
IMAGES_DIR = ROOT / 'public/img'
FILES_HOST = 'https://images.chesscomfiles.com/chess-themes'
THEMES_HOST = 'https://assets-themes.chess.com/image'
# The CDN turns away unknown user agents.
HEADERS = {'User-Agent': 'Mozilla/5.0 Chrome/140'}
ATTEMPTS = 3
PIECES = [color + role for color in 'wb' for role in 'pnbrqk']
BOARD_PX = 1200
TILE_SQUARE_PX = 80
PIECE_PX = 300  # sharp on a big board at 2x; the CDN serves up to 300


def load_catalog():
    with CATALOG.open(encoding='utf-8') as file:
        catalog = json.load(file)
    return catalog['boards'], catalog['pieceSets']


def download_image(url):
    request = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(1, ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return Image.open(io.BytesIO(response.read()))
        except Exception:
            if attempt == ATTEMPTS:
                raise
            time.sleep(1)


def save(image, path, **options):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, 'WEBP', method=6, **options)


def on_themes_host(entry):
    return entry.get('host') == 'themes'


def board_url(board):
    # 200px squares on the newer host, 150px on the older one.
    if on_themes_host(board):
        return f'{THEMES_HOST}/{board["id"]}/200.{board.get("format", "png")}'
    return f'{FILES_HOST}/boards/{board["id"]}/150.png'


def piece_url(piece_set, piece):
    if on_themes_host(piece_set):
        return f'{THEMES_HOST}/{piece_set["id"]}/{PIECE_PX}/{piece}.png'
    return f'{FILES_HOST}/pieces/{piece_set["id"]}/{PIECE_PX}/{piece}.png'


def fetch_board(board, force):
    board_path = IMAGES_DIR / f'boards/{board["id"]}.webp'
    tile_path = IMAGES_DIR / f'boards/{board["id"]}-tile.webp'
    if board_path.exists() and tile_path.exists() and not force:
        return
    image = download_image(board_url(board)).convert('RGB')
    if image.width != BOARD_PX:
        image = image.resize((BOARD_PX, BOARD_PX), Image.LANCZOS)
    save(image, board_path, quality=86)
    square = BOARD_PX // 8
    tile = image.crop((0, 0, 2 * square, square))
    save(tile.resize((2 * TILE_SQUARE_PX, TILE_SQUARE_PX), Image.LANCZOS), tile_path, quality=86)
    print('board', board['id'])


def fetch_piece_set(piece_set, force):
    for piece in PIECES:
        path = IMAGES_DIR / f'pieces/{piece_set["id"]}/{piece}.webp'
        if path.exists() and not force:
            continue
        image = download_image(piece_url(piece_set, piece)).convert('RGBA')
        if image.width != PIECE_PX:
            image = image.resize((PIECE_PX, PIECE_PX), Image.LANCZOS)
        save(image, path, quality=88, alpha_quality=100)
    print('pieces', piece_set['id'])


def main(force):
    boards, piece_sets = load_catalog()
    for board in boards:
        fetch_board(board, force)
    for piece_set in piece_sets:
        fetch_piece_set(piece_set, force)


if __name__ == '__main__':
    main('--force' in sys.argv)
