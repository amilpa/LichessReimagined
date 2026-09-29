"""Chess.com's icons and sounds, bundled in public/img/icons and public/sounds
so that the extension loads nothing from its hosts while it runs.

Downloads what the code names and the folders lack:

  public/img/icons/<name>.svg   every img/icons/<name>.svg of the CSS in src/styles: a
                                color icon from Chess.com's design system, or one of
                                the few images of its web bundle (BUNDLE)
  public/sounds/<name>.mp3      every sound of SoundNameSchema in src/shared/sounds.ts

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
STYLES_DIR = ROOT / 'src/styles'
SOUNDS_SOURCE = ROOT / 'src/shared/sounds.ts'
COLOR_ICONS = 'https://assets-ds.chess.com/color-icons'
SOUNDS = 'https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default'
# The icons that aren't color icons, and where each one is in the web bundle.
BUNDLE = {
    'user-image': 'https://www.chess.com/bundles/web/images/user-image.007dad08.svg',
    'variant-atomic': 'https://www.chess.com/bundles/web/images/variants/variant-atomic.svg',
    'variant-giveaway': 'https://www.chess.com/bundles/web/images/variants/giveaway.svg',
    'variant-horde': 'https://www.chess.com/bundles/web/images/variants/horde.svg',
}
# The CDN turns away unknown user agents.
HEADERS = {'User-Agent': 'Mozilla/5.0 Chrome/140'}
ATTEMPTS = 3


def download(url):
    request = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(1, ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read()
        except Exception:
            if attempt == ATTEMPTS:
                raise
            time.sleep(1)


def icon_names():
    return sorted(
        {
            name
            for stylesheet in STYLES_DIR.rglob('*.css')
            for name in re.findall(r'img/icons/([\w-]+)\.svg', stylesheet.read_text())
        }
    )


def sound_names():
    source = SOUNDS_SOURCE.read_text()
    names = re.search(r'SoundNameSchema = z\.enum\(\[(.*?)\]\)', source, re.DOTALL).group(1)
    return re.findall(r"'([^']*)'", names)


def fetch(url, path, force):
    if path.exists() and not force:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(download(url))
    print(path.relative_to(ROOT))


def main(force):
    for name in icon_names():
        url = BUNDLE.get(name, f'{COLOR_ICONS}/{name}.svg')
        fetch(url, ROOT / f'public/img/icons/{name}.svg', force)
    for name in sound_names():
        fetch(f'{SOUNDS}/{name}.mp3', ROOT / f'public/sounds/{name}.mp3', force)


if __name__ == '__main__':
    main('--force' in sys.argv)
