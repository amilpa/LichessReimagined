"""Traces the Game Review coaches' features out of their portraits.

Run it when a portrait changes (needs numpy and opencv-python-headless):

  python3 tools/coach-rig/extract.py

It writes into public/img/coaches:

  rig.json              each coach's brows as sprites, lips and lids as curves
                        (in the portrait's pixels), and their colors
  coach-<n>-plate.webp  the portrait with its brows and mouth painted out, for
                        the animated features to move over

src/content/coach/lottie builds the coach's Lottie animations from rig.json.
"""

import base64
import json
from pathlib import Path

import cv2
import numpy as np

COACHES_DIR = Path(__file__).resolve().parents[2] / 'public/img/coaches'
COACHES = (1, 2, 3, 4)
MOUTH_SAMPLES = 17  # points per lip curve, corner to corner
EYE_SAMPLES = 11  # points per lid curve
SUBPIXELS = 8  # per pixel, when tracing the mouth
KERNEL = np.ones((3, 3), np.uint8)  # grows a mask by a pixel
# Where each lip's color is sampled for its gradient, from its top to its bottom.
UPPER_LIP_STOPS = (0.15, 0.5, 0.85)
LOWER_LIP_STOPS = (0.2, 0.4, 0.6, 0.8, 0.92)

# Measured by hand on each portrait (300×275): the x of the mouth's corners,
# the rows it spans, and reference colors for its parts. Each sub-pixel is
# taken for the part of the nearest color. On coaches 1 and 2, 'upper' is
# both lips, told apart by the teeth between them.
MOUTHS = {
    1: {
        'corners': (124, 176),
        'rows': (149.5, 167),
        'skin': ['#f7bc93', '#e5ae89', '#eeb48e'],
        'upper': ['#e09274', '#e8957a'],
        'teeth': ['#fdf4f0', '#f4e2dc'],
        'line': ['#974f36', '#b86a52'],
    },
    2: {
        'corners': (126, 173),
        'rows': (150, 172),
        'skin': ['#fbcaa7'],
        'upper': ['#cf7167', '#ec8b80', '#e8988c'],
        'teeth': ['#fdf7f6', '#f3e6e4'],
    },
    3: {
        'corners': (125, 176),
        'rows': (157, 176),
        'skin': ['#cd8159', '#bf704c', '#c7784f'],
        'upper': ['#a04b3b', '#aa5242'],
        'lower': ['#bb604e', '#d57763', '#c86b58'],
    },
    4: {
        'corners': (131, 172),
        'rows': (157.5, 167.6),
        'skin': ['#fdcba8', '#f5bc98'],
        'upper': ['#eea887', '#f2b996'],
        'lower': ['#f1a788', '#f4ac8c'],
        'line': ['#bc7557', '#c9805f'],
        # Between these x, a pale highlight on the lower lip reads as skin.
        'highlight': (141, 162),
    },
}
# A tie between two colors goes to the first part here.
PARTS = ('skin', 'upper', 'lower', 'teeth', 'line')
MOUTH_PARTS = ['upper', 'lower', 'teeth', 'line']
# Each brow's x range and y range.
BROWS = {
    1: [((104, 142), (80, 97)), ((159, 199), (80, 97))],
    2: [((106, 139), (84, 96)), ((161, 190), (84, 96))],
    3: [((102, 141), (89, 105)), ((161, 200), (88, 105))],
    4: [((102, 142), (87, 102)), ((159, 199), (87, 102))],
}
# The box around each eye, lashes included: left, top, right, bottom.
EYES = {
    1: [(110, 95, 138, 109), (163, 95, 192, 108)],
    # Her left one stops short of the glasses' frame.
    2: [(110, 101, 134, 113), (164, 101, 189, 113)],
    3: [(107, 106, 138, 119), (165, 105, 197, 119)],
    4: [(110, 101, 138, 114), (163, 101, 191, 114)],
}


def lerp(a, b, t):
    return a + (b - a) * t


def hex_color(bgr):
    blue, green, red = (round(value) for value in bgr)
    return f'#{red:02x}{green:02x}{blue:02x}'


def hex_to_lab(color):
    bgr = np.uint8([[[int(color[5:7], 16), int(color[3:5], 16), int(color[1:3], 16)]]])
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)[0, 0].astype(float)


def median_color(pixels):
    return hex_color(np.median(np.array(pixels), axis=0)) if pixels else None


def smooth(xs, ys, degree):
    """A polynomial through noisy samples, NaNs left out."""
    xs, ys = np.asarray(xs, float), np.asarray(ys, float)
    known = ~np.isnan(ys)
    return np.poly1d(np.polyfit(xs[known], ys[known], min(degree, known.sum() - 1)))


def window(values, k, width):
    half = width // 2
    return values[max(0, k - half) : k + half + 1]


def soften(ys, width=9):
    """A running median then a running mean: follows the lip, not the pixel steps."""
    ys = np.asarray(ys, float)
    if np.all(np.isnan(ys)):
        return ys
    medians = np.array([np.nanmedian(window(ys, k, width)) for k in range(len(ys))])
    return np.array([np.nanmean(window(medians, k, width)) for k in range(len(medians))])


# ---- mouth ----


def reference_colors(mouth):
    """The mouth's reference colors in Lab, and the part each one is."""
    colors, parts = [], []
    for part in PARTS:
        for color in mouth.get(part, []):
            colors.append(hex_to_lab(color))
            parts.append(part)
    return np.array(colors), np.array(parts)


def close_gaps(is_mouth, longest):
    """Fills in place the gaps of up to `longest` between two runs."""
    k = 0
    while k < len(is_mouth):
        if is_mouth[k]:
            k += 1
            continue
        end = k
        while end < len(is_mouth) and not is_mouth[end]:
            end += 1
        if k > 0 and end < len(is_mouth) and end - k <= longest:
            is_mouth[k:end] = True
        k = end


def lips_parting(parts):
    """Where the lips part when no teeth or line show between them: the first
    long run of lower lip below the upper lip."""
    in_lower_run = np.convolve(parts == 'lower', np.ones(6), 'same') >= 6
    upper = np.nonzero(parts == 'upper')[0]
    below_upper = np.arange(len(parts)) > (upper[0] + 4 if len(upper) else 0)
    starts = np.nonzero(in_lower_run & below_upper)[0]
    return starts[0] - 3 if len(starts) else None


def trace_column(parts, lips_by_color):
    """One sub-pixel column across the mouth: the rows of its top and bottom
    and of the opening's top and bottom (NaN where the lips don't part), and
    its parts, the skin inside the mouth taken for the upper lip."""
    is_mouth = np.isin(parts, MOUTH_PARTS)
    # A thin line of shading between two parts (the teeth and a lip) is
    # still the mouth.
    close_gaps(is_mouth, SUBPIXELS)
    # The mouth is the first run of at least 3 sub-pixels, down to the skin.
    in_run = np.nonzero(np.convolve(is_mouth, np.ones(3), 'same') >= 3)[0]
    if len(in_run) < 3:
        return None
    top = in_run[0]
    skin = np.nonzero(~is_mouth[top:])[0]
    bottom = top + (skin[0] if len(skin) else len(is_mouth) - top)
    parts = np.where(is_mouth & (parts == 'skin'), 'upper', parts)
    inside = parts[top:bottom]
    if lips_by_color:
        parting = lips_parting(inside)
        opening_top = opening_bottom = np.nan if parting is None else top + parting
    else:
        teeth = np.nonzero(np.isin(inside, ['teeth', 'line']))[0]
        opening_top, opening_bottom = (
            (top + teeth[0], top + teeth[-1] + 1) if len(teeth) else (np.nan, np.nan)
        )
    return top, bottom, opening_top, opening_bottom, parts


def sample_colors(samples, pixels, parts, top, bottom, opening_top):
    """Adds a column's pixels to its parts' samples: all of the line's, only
    those well inside the mouth for the others."""
    for k in range(top, bottom):
        if parts[k] == 'line':
            samples['line'].append(pixels[k])
    for k in range(top + 3, bottom - 3):
        if parts[k] == 'teeth':
            samples['teeth'].append(pixels[k])
        elif parts[k] in ('upper', 'lower'):
            upper = parts[k] == 'upper' and (np.isnan(opening_top) or k < opening_top)
            samples['upper' if upper else 'lower'].append(pixels[k])


def mouth_curves(mouth, xs, lip_tops, opening_tops, opening_bottoms, lip_bottoms):
    """The corners' y, and the edges as curves from corner to corner, under
    the rig's keys: the upper lip's top, the opening's top and bottom, the
    lower lip's bottom."""
    # The opening's edges are smoother than the classification: a wider window first.
    opening_tops = soften(soften(opening_tops, 25))
    opening_bottoms = soften(soften(opening_bottoms, 25))
    # The corners: on the opening, or where the lips meet.
    middle = np.where(
        np.isnan(opening_tops),
        (np.array(lip_tops) + np.array(lip_bottoms)) / 2,
        (opening_tops + opening_bottoms) / 2,
    )
    left_y, right_y = float(np.median(middle[:4])), float(np.median(middle[-4:]))
    if 'highlight' in mouth:
        start, end = mouth['highlight']
        sides = (xs < start) | (xs > end)
        lip_bottoms = np.poly1d(np.polyfit(xs[sides], np.array(lip_bottoms)[sides], 4))(xs)
    left, right = mouth['corners']
    samples_x = np.linspace(left, right, MOUTH_SAMPLES)
    curves = {}
    edges = {'up': lip_tops, 'ot': opening_tops, 'ob': opening_bottoms, 'lo': lip_bottoms}
    for key, edge in edges.items():
        edge = soften(edge)
        known = ~np.isnan(edge)
        # Pinned to the corners at each end.
        curves[key] = np.interp(
            samples_x, np.r_[left, xs[known], right], np.r_[left_y, edge[known], right_y]
        )
    # No edge crosses the one before it.
    curves['ob'] = np.maximum(curves['ob'], curves['ot'])
    curves['up'] = np.minimum(curves['up'], curves['ot'])
    curves['lo'] = np.maximum(curves['lo'], curves['ob'])
    return [left_y, right_y], {key: list(np.round(curve, 2)) for key, curve in curves.items()}


def trace_mouth(mouth, bgr):
    """The mouth's corners, its edges as curves and its parts' colors,
    traced on the portrait magnified SUBPIXELS times."""
    big = cv2.resize(bgr, None, fx=SUBPIXELS, fy=SUBPIXELS, interpolation=cv2.INTER_CUBIC)
    lab = cv2.cvtColor(big, cv2.COLOR_BGR2LAB).astype(float)
    colors, parts_of_colors = reference_colors(mouth)
    left, right = mouth['corners']
    first_row, last_row = (int(row * SUBPIXELS) for row in mouth['rows'])
    lips_by_color = 'teeth' not in mouth and 'line' not in mouth
    xs, lip_tops, opening_tops, opening_bottoms, lip_bottoms = [], [], [], [], []
    samples = {'upper': [], 'lower': [], 'teeth': [], 'line': []}
    for column in range(left * SUBPIXELS + 2, right * SUBPIXELS - 1, 2):
        pixels = lab[first_row:last_row, column]
        distances = np.linalg.norm(pixels[:, None, :] - colors[None], axis=2)
        traced = trace_column(parts_of_colors[distances.argmin(1)], lips_by_color)
        if traced is None:
            continue
        top, bottom, opening_top, opening_bottom, parts = traced
        xs.append(column / SUBPIXELS)
        lip_tops.append((first_row + top) / SUBPIXELS)
        opening_tops.append((first_row + opening_top) / SUBPIXELS)
        opening_bottoms.append((first_row + opening_bottom) / SUBPIXELS)
        lip_bottoms.append((first_row + bottom) / SUBPIXELS)
        sample_colors(samples, big[first_row:last_row, column], parts, top, bottom, opening_top)
    corners_y, curves = mouth_curves(
        mouth, np.array(xs), lip_tops, opening_tops, opening_bottoms, lip_bottoms
    )
    return {
        'x': [float(left), float(right)],
        'y': corners_y,
        'curves': curves,
        'colors': {part: median_color(samples[part]) for part in MOUTH_PARTS},
    }


def shades(bgr, center, top, bottom, stops):
    return [
        hex_color(bgr[round(lerp(top, bottom, t)), center - 2 : center + 3].mean(axis=0))
        for t in stops
    ]


def lip_shading(bgr, mouth):
    """Each lip's colors down the middle, for a gradient."""
    curves = mouth['curves']
    k = MOUTH_SAMPLES // 2
    center = round((mouth['x'][0] + mouth['x'][1]) / 2)
    upper = shades(bgr, center, curves['up'][k] + 0.5, curves['ot'][k] - 0.5, UPPER_LIP_STOPS)
    lower = shades(bgr, center, curves['ob'][k], curves['lo'][k], LOWER_LIP_STOPS)
    return {'upper': upper, 'lower': lower}


# ---- brows and eyes ----


def brow_mask(dark, left, top, eyes):
    """The largest dark patch, grown by a pixel, less the eyes."""
    _count, labels, stats, _centroids = cv2.connectedComponentsWithStats(dark.astype(np.uint8))
    largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    mask = cv2.dilate((labels == largest).astype(np.uint8), KERNEL)
    for eye_left, eye_top, eye_right, eye_bottom in eyes:
        rows = slice(max(eye_top - 1 - top, 0), max(eye_bottom + 1 - top, 0))
        columns = slice(max(eye_left - 2 - left, 0), max(eye_right + 2 - left, 0))
        mask[rows, columns] = 0
    return mask


def trace_brow(bgr, lab, brow, eyes):
    """A brow as a sprite: its core color, with an alpha matte from how much
    darker than the skin each pixel is. Over the plate it composes back into
    the brow as painted, hair and soft edge included. Also returns the mask
    that paints the brow out of the plate."""
    (brow_left, brow_right), (brow_top, brow_bottom) = brow
    left, top, right, bottom = brow_left - 4, brow_top - 4, brow_right + 5, brow_bottom + 3
    middle = (brow_left + brow_right) // 2
    skin_lightness = np.median(lab[brow_top - 3, middle - 6 : middle + 7, 0])
    lightness = lab[top:bottom, left:right, 0]
    core = lightness < skin_lightness * 0.5
    core_lightness = np.median(lightness[core])
    alpha = np.clip((skin_lightness - lightness) / (skin_lightness - core_lightness), 0, 1)
    # Only the brow and a soft margin, not the eyes.
    mask = brow_mask(lightness < skin_lightness * 0.84, left, top, eyes)
    alpha = alpha * cv2.GaussianBlur(mask.astype(float), (0, 0), 0.6)
    color = np.median(bgr[top:bottom, left:right][core], axis=0)
    sprite = np.dstack([np.full((*lightness.shape, 3), color), alpha * 255]).astype(np.uint8)
    # At 2x, so it stays sharp on a high-density screen.
    sprite = cv2.resize(sprite, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    _ok, png = cv2.imencode('.png', sprite, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    ys, xs = np.nonzero(core)
    return {
        'x': left,
        'y': top,
        'w': right - left,
        'h': bottom - top,
        'color': hex_color(color),
        'center': [float(left + xs.mean()), float(top + ys.mean())],
        'png': base64.b64encode(png.tobytes()).decode(),
    }, (left, top, mask)


def eye_rows(column, skin_lightness):
    """The eye's rows in a column: its white (light and grey) or its iris and
    lashes (dark), not the shading around it. One run from the top, so a
    frame or a crease below doesn't count."""
    lightness = column[:, 0]
    chroma = np.hypot(column[:, 1] - 128, column[:, 2] - 128)
    is_white = (lightness > skin_lightness + 12) & (chroma < 18)
    is_eye = is_white | (lightness < skin_lightness * 0.6)
    rows = np.nonzero(is_eye)[0]
    if len(rows) < 2:
        return []
    run = rows[:1].tolist()
    for row in rows[1:]:
        if row - run[-1] > 2:
            break
        run.append(row)
    return run


def trace_eye(bgr, lab, box):
    """An eye's lid and lower lash line as curves, corner to corner, and the
    skin's color above and below them."""
    left, top, right, bottom = box
    skin_lightness = np.median(lab[top - 2, left + 4 : right - 4, 0])
    xs, tops, bottoms = [], [], []
    for x in range(left + 1, right):
        rows = eye_rows(lab[top : bottom + 1, x], skin_lightness)
        if rows:
            xs.append(x)
            tops.append(top + rows[0])
            bottoms.append(top + rows[-1] + 1)
    lid, lash = smooth(xs, tops, 4), smooth(xs, bottoms, 4)
    samples_x = np.linspace(xs[0] - 0.5, xs[-1] + 1.5, EYE_SAMPLES)
    lid_ys, lash_ys = lid(samples_x), lash(samples_x)
    # The corners, where the lid and the lower lash meet.
    middle = (lid_ys + lash_ys) / 2
    lid_ys[0] = lash_ys[0] = middle[0]
    lid_ys[-1] = lash_ys[-1] = middle[-1]
    last_row = bgr.shape[0] - 1
    above = [bgr[max(round(lid(x)) - 3, 0), int(x)] for x in samples_x[2:-2]]
    below = [bgr[min(round(lash(x)) + 2, last_row), int(x)] for x in samples_x[2:-2]]
    return {
        'x': np.round(samples_x, 2).tolist(),
        'top': np.round(lid_ys, 2).tolist(),
        'bottom': np.round(lash_ys, 2).tolist(),
        'skin': [hex_color(np.median(above, axis=0)), hex_color(np.median(below, axis=0))],
    }


# ---- plate ----


def paint_out_brows(bgr, brow_masks):
    """The portrait with its brows painted over from the forehead above them,
    column by column: below them are the lids and, on coach 2, the glasses."""
    plate = bgr.copy().astype(float)
    painted = np.zeros(bgr.shape[:2], np.uint8)
    for left, top, mask in brow_masks:
        mask = cv2.dilate(mask, KERNEL, iterations=2)
        painted[top : top + mask.shape[0], left : left + mask.shape[1]] |= mask
    for x in range(bgr.shape[1]):
        rows = np.nonzero(painted[:, x])[0]
        if len(rows):
            highest = rows.min()
            plate[rows, x] = plate[max(highest - 3, 0) : highest - 1, x].mean(axis=0)
    blurred = cv2.GaussianBlur(plate, (0, 0), 1.6)
    weight = cv2.GaussianBlur(painted.astype(float), (0, 0), 1.0)[..., None]
    return np.clip(plate * (1 - weight) + blurred * weight, 0, 255).astype(np.uint8)


def paint_out_mouth(image, mouth):
    """The image with the mouth inpainted, then blurred where it was filled,
    fading into the rest: inpainting leaves streaks."""
    curves = mouth['curves']
    xs = np.linspace(*mouth['x'], MOUTH_SAMPLES)
    outline = [*zip(xs, curves['up'], strict=True), *zip(xs[::-1], curves['lo'][::-1], strict=True)]
    mask = np.zeros(image.shape[:2], np.uint8)
    # With shift=3 the points are in eighths of a pixel.
    points = np.round(np.array(outline, np.float32) * 8).astype(np.int32)
    cv2.fillPoly(mask, [points], 255, shift=3)
    mask = cv2.dilate(mask, KERNEL, iterations=2)
    plate = cv2.inpaint(image, mask, 6, cv2.INPAINT_TELEA)
    blurred = cv2.GaussianBlur(plate, (0, 0), 2.2)
    weight = cv2.GaussianBlur(cv2.dilate(mask, KERNEL).astype(float) / 255, (0, 0), 1.2)[..., None]
    return np.clip(plate * (1 - weight) + blurred * weight, 0, 255).astype(np.uint8)


def main():
    rig = {}
    for coach in COACHES:
        portrait = cv2.imread(str(COACHES_DIR / f'coach-{coach}.webp'), cv2.IMREAD_UNCHANGED)
        bgr = np.ascontiguousarray(portrait[:, :, :3])
        lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(float)
        mouth = trace_mouth(MOUTHS[coach], bgr)
        brows = [trace_brow(bgr, lab, brow, EYES[coach]) for brow in BROWS[coach]]
        eyes = [trace_eye(bgr, lab, box) for box in EYES[coach]]
        plate = paint_out_brows(bgr, [mask for _sprite, mask in brows])
        plate = paint_out_mouth(plate, mouth)
        mouth['shade'] = lip_shading(bgr, mouth)
        cv2.imwrite(
            str(COACHES_DIR / f'coach-{coach}-plate.webp'),
            np.dstack([plate, portrait[:, :, 3]]),
            [cv2.IMWRITE_WEBP_QUALITY, 92],
        )
        rig[coach] = {'mouth': mouth, 'brows': [sprite for sprite, _mask in brows], 'eyes': eyes}
    with (COACHES_DIR / 'rig.json').open('w') as file:
        json.dump(rig, file, separators=(',', ':'))


if __name__ == '__main__':
    main()
