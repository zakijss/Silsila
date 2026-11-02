#!/usr/bin/env python3
"""Build data/gmap.js, the GRCh37 genetic map the relative comparison measures centimorgans with.

    curl -O https://bochet.gcc.biostat.washington.edu/beagle/genetic_maps/plink.GRCh37.map.zip
    python3 tools/build_gmap.py plink.GRCh37.map.zip

The source is the HapMap Phase II genetic map (International HapMap Consortium 2007,
doi:10.1038/nature06258) lifted to GRCh37 by Adam Auton and written in PLINK format by
Brian Browning for Beagle. Each line of a PLINK map is: chromosome, id, cM, base position.

The page only needs cM at segment ends, so the map is resampled to one point every STEP bases
(linear interpolation between the original points) and stored per chromosome as the first
position and the differences between successive cM values in hundredths of a cM.
"""
import io, json, re, sys, zipfile
from bisect import bisect_right
from pathlib import Path

STEP = 100_000
OUT = Path(__file__).resolve().parent.parent / 'data' / 'gmap.js'


def read_maps(path):
    """{chromosome: [(position, cM), ...]} for 1-22 and X (PAR files are skipped)."""
    maps = {}
    z = zipfile.ZipFile(path) if zipfile.is_zipfile(path) else None
    names = z.namelist() if z else [str(p) for p in Path(path).glob('*.map')]
    for name in names:
        m = re.search(r'plink\.chr(\d+|X)\.GRCh37\.map$', name)
        if not m:
            continue
        text = z.read(name).decode() if z else Path(name).read_text()
        pts = []
        for line in io.StringIO(text):
            f = line.split()
            if len(f) == 4:
                pts.append((int(f[3]), float(f[2])))
        pts.sort()
        maps[m.group(1)] = pts
    return maps


def resample(pts, step=STEP):
    pos = [p for p, _ in pts]
    cm = [c for _, c in pts]
    start = pos[0] // step * step
    out = []
    for g in range(start, pos[-1] + step, step):
        k = bisect_right(pos, g)
        if k == 0:
            v = cm[0]
        elif k == len(pos):
            v = cm[-1]
        else:
            p0, p1, c0, c1 = pos[k - 1], pos[k], cm[k - 1], cm[k]
            v = c0 + (c1 - c0) * (g - p0) / (p1 - p0)
        out.append(round(v * 100))
    # the lifted map has a few small dips; keep cM from going backwards
    for i in range(1, len(out)):
        out[i] = max(out[i], out[i - 1])
    return start, [out[0]] + [b - a for a, b in zip(out, out[1:])]


def main(path):
    maps = read_maps(path)
    order = [str(c) for c in range(1, 23)] + ['X']
    missing = [c for c in order if c not in maps]
    if missing:
        sys.exit('missing chromosomes: ' + ', '.join(missing))
    data = {
        'source': 'HapMap Phase II genetic map lifted to GRCh37 (International HapMap Consortium 2007), PLINK format from the Beagle project',
        'url': 'https://bochet.gcc.biostat.washington.edu/beagle/genetic_maps/',
        'step': STEP,
        'chr': {},
    }
    for c in order:
        start, deltas = resample(maps[c])
        data['chr'][c] = [start, deltas]
        print(f'chr{c}: {len(deltas)} points, {sum(deltas) / 100:.1f} cM', file=sys.stderr)
    text = 'window.SILSILA=window.SILSILA||{};SILSILA.gmap=%s;\n' % json.dumps(data, separators=(',', ':'))
    OUT.write_text(text)
    print(f'{OUT.relative_to(OUT.parent.parent)} {len(text) / 1e3:.0f} kB', file=sys.stderr)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
