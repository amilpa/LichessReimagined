"""Chess.com's icons and sounds, bundled in img/icons and sounds/.

So the extension asks for no permission on Chess.com's hosts and loads nothing
from them while it runs. Reads what the code names and downloads what's
missing:

  img/icons/<name>.svg   every img/icons/… the CSS names: a color icon from
                         Chess.com's design system, or one of the few images
                         of its web bundle (BUNDLE)
  sounds/<name>.mp3      every sound in content.js's SOUND_NAMES

Run it again when a rule names a new icon or a sound is added. Existing files
are kept unless --force. Needs only Python.

  python3 tools/assets/fetch.py [--force]
"""

import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ICONS = 'https://assets-ds.chess.com/color-icons'
SOUNDS = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default'
# Icons that aren't color icons: where each comes from in Chess.com's bundle.
BUNDLE = {
    'user-image': 'https://www.chess.com/bundles/web/images/user-image.007dad08.svg',
    'variant-atomic': 'https://www.chess.com/bundles/web/images/variants/variant-atomic.svg',
    'variant-giveaway': 'https://www.chess.com/bundles/web/images/variants/giveaway.svg',
    'variant-horde': 'https://www.chess.com/bundles/web/images/variants/horde.svg',
}


def get(url):
    # Chess.com's CDN turns away unknown user agents.
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 Chrome/140'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return res.read()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1)


def icons():
    names = set()
    for css in (ROOT / 'src/styles').glob('*.css'):
        names |= set(re.findall(r'img/icons/([\w-]+)\.svg', css.read_text()))
    return sorted(names)


def sounds():
    src = (ROOT / 'src/content.js').read_text()
    body = re.search(r'const SOUND_NAMES = \[(.*?)\];', src, re.S).group(1)
    return re.findall(r"'([^']*)'", body)


def fetch(url, path, force):
    if path.exists() and not force:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(get(url))
    print(path.relative_to(ROOT))


def main(force):
    for name in icons():
        fetch(BUNDLE.get(name, f'{ICONS}/{name}.svg'), ROOT / f'img/icons/{name}.svg', force)
    for name in sounds():
        fetch(f'{SOUNDS}/{name}.mp3', ROOT / f'sounds/{name}.mp3', force)


if __name__ == '__main__':
    main('--force' in sys.argv)
