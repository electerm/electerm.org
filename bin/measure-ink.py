#!/usr/bin/env python3
"""
Measure a sponsor logo's `ink` box for src/data/sponsors.js.

Every logo file carries a lot of empty padding, so sponsors.js stores two boxes
per sponsor: the file's own size (`logo`) and the bounding box of the artwork
inside it (`ink`). This prints both, ready to paste:

    python3 bin/measure-ink.py \
      https://cdn.jsdelivr.net/gh/electerm/electerm-resource@master/static/images/sidrune.png

Transparent files are measured on alpha. Opaque ones (logos shot on a card)
are measured against the background colour, taken as the mean of the four
corners; `--tol` is the per-channel distance that counts as ink. The existing
entries in sponsors.js were measured at tol=12, so keep that default unless a
logo has an unusually soft edge.
"""

import io
import sys
import urllib.request

from PIL import Image

TOL = 12


def _box(mask):
    """Bounding box (x, y, w, h) of a PIL/numpy bool mask, or None if empty."""
    xs = mask.getbbox()
    if not xs:
        return None
    x0, y0, x1, y1 = xs
    return x0, y0, x1 - x0, y1 - y0


def measure_image(img, tol=TOL):
    rgba = img.convert('RGBA')
    w, h = rgba.size

    alpha = rgba.getchannel('A')
    if alpha.getextrema()[0] < 250:
        # transparent file: alpha alone tells the whole story
        box = _box(alpha)
    else:
        # opaque file: anything that differs from the corner colour is artwork
        rgb = rgba.convert('RGB')
        corners = [rgb.getpixel(p) for p in
                   ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))]
        bg = tuple(round(sum(c[i] for c in corners) / 4) for i in range(3))
        px = rgb.load()
        minx = w
        miny = h
        maxx = -1
        maxy = -1
        for y in range(h):
            for x in range(w):
                p = px[x, y]
                if max(abs(p[i] - bg[i]) for i in range(3)) > tol:
                    if x < minx:
                        minx = x
                    if x > maxx:
                        maxx = x
                    if y < miny:
                        miny = y
                    if y > maxy:
                        maxy = y
        box = None if maxx < 0 else (minx, miny, maxx - minx + 1, maxy - miny + 1)

    if not box:
        sys.exit('no ink found — is the file empty or fully transparent?')
    return {'w': w, 'h': h, 'x': box[0], 'y': box[1],
            'iw': box[2], 'ih': box[3]}


def measure(path_or_url, tol=TOL):
    if path_or_url.startswith(('http://', 'https://')):
        req = urllib.request.Request(
            path_or_url, headers={'User-Agent': 'measure-ink'})
        with urllib.request.urlopen(req) as res:
            img = Image.open(io.BytesIO(res.read()))
    else:
        img = Image.open(path_or_url)
    return measure_image(img, tol)


def main():
    args = sys.argv[1:]
    tol = TOL
    if '--tol' in args:
        i = args.index('--tol')
        tol = int(args[i + 1])
        del args[i:i + 2]
    if len(args) != 1:
        sys.exit(__doc__)

    r = measure(args[0], tol)
    print(f"logo: {{ w: {r['w']}, h: {r['h']} }}")
    print(f"ink: {{ x: {r['x']}, y: {r['y']}, w: {r['iw']}, h: {r['ih']} }}")
    print(f"// artwork fills {r['iw'] * r['ih'] / (r['w'] * r['h']) * 100:.1f}% "
          f"of the file, tol={tol}")


if __name__ == '__main__':
    main()
