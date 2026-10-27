#!/usr/bin/env python3
"""Save FamilyTreeDNA Discover data for one branch, for the page to use offline.

    python3 tools/enrich.py R-M222

Discover sends no CORS headers, so a browser page can't fetch it directly. This fetches the
branch, every ancestor inside its haplogroup letter, and its children, and writes
data/enrich/<branch>.js: ages for the whole line, tester counts by country, ancient samples
and notable lines, and the migration route Discover draws for it. The page loads it whenever
the branch is on a loaded person's line.
"""
import json, sys, time, urllib.error, urllib.request
from pathlib import Path

URL = 'https://discover.familytreedna.com/resources/y-dna/{}.json'
OUT = Path(__file__).resolve().parent.parent / 'data' / 'enrich'
# http and https only: branch names come from the command line and from Discover's own data
_web = urllib.request.OpenerDirector()
for _h in (urllib.request.UnknownHandler, urllib.request.HTTPHandler, urllib.request.HTTPSHandler,
           urllib.request.HTTPRedirectHandler, urllib.request.HTTPDefaultErrorHandler,
           urllib.request.HTTPErrorProcessor):
    _web.add_handler(_h())


def get(name):
    req = urllib.request.Request(URL.format(name), headers={'User-Agent': 'silsila-enrich'})
    try:
        with _web.open(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def countries(d):
    return [[c['name'], c['code'], c['count'], c['total']] for c in d.get('countries') or [] if c.get('code') != 'X' and c.get('total')]


def route(d):
    """Discover's migration map: [start, end, colour, side arrow, [[lon, lat], ...]] per leg, and a [lon, lat] per node."""
    m = d.get('migrationmap') or {}
    paths, nodes = [], {}
    for f in (m.get('geojson') or {}).get('features') or []:
        p, g = f.get('properties') or {}, f.get('geometry') or {}
        if g.get('type') == 'LineString' and g.get('coordinates'):
            c = [[round(x, 2), round(y, 2)] for x, y in g['coordinates']]
            paths.append([p.get('startNode'), p.get('endNode'), p.get('stroke'), bool(p.get('secondaryArrow')), c])
            if p.get('startNode'):
                nodes.setdefault(p['startNode'], c[0])
            if p.get('endNode'):
                nodes.setdefault(p['endNode'], c[-1])
        elif g.get('type') == 'Point' and p.get('name'):
            nodes[p['name']] = [round(v, 2) for v in g['coordinates'][:2]]
    return {'family': m.get('haplogroup'), 'paths': paths, 'nodes': nodes,
            'legend': [[x.get('name'), x.get('color'), x.get('tmrca')] for x in m.get('haplogroup_legend') or []]}


def main(term):
    d = get(term)
    if not d:
        sys.exit(f'{term}: not found on Discover')
    letter = d['haplogroup']['root'] + '-'
    out = {'term': term, 'version': '%(version_major)s.%(version_minor)s.%(version_micro)s' % d['tree'],
           'fetched': time.strftime('%Y-%m-%d'), 'subclades': d.get('upgrades', {}).get('bigy', {}).get('subclades'),
           'ages': {}, 'countries': {}, 'children': {}, 'ancient': {}, 'famous': {}, 'route': route(d)}
    for a in d['ancestors']:
        t = a.get('tmrca') or {}
        out['ages'][a['name']] = [t.get('mean'), t.get('oldest'), t.get('youngest'), a.get('note'), a.get('modern')]

    def take(x):
        for s in x.get('ancient') or []:
            out['ancient'].setdefault(s['code'], [s['code'], s.get('haplogroup_y'), s.get('age_estimate_mean'), s.get('site'), s.get('country_name'),
                                                   s.get('culture'), s.get('time_period'), bool(s.get('uncertain_placement')),
                                                   [v for v in s.get('studies') or [] if isinstance(v, str)], s.get('latitude'), s.get('longitude')])
        for f in x.get('famous') or []:
            out['famous'].setdefault(f['name'], [f['name'], f.get('haplogroup_y'), f.get('category'), f.get('country_code')])

    take(d)
    out['countries'][term] = countries(d)
    for name in [a['name'] for a in d['ancestors'] if a['name'].startswith(letter)]:
        x = get(name)
        if x:
            take(x); out['countries'][name] = countries(x)
        print('.', end='', flush=True, file=sys.stderr)
    for name in d.get('descendants', {}).get('children') or []:
        x = get(name)
        if x:
            out['children'][name] = [x['time']['tmrca']['mean'], x['time']['formed']['mean']]
            out['countries'][name] = countries(x)
    out['ancient'] = list(out['ancient'].values())
    out['famous'] = list(out['famous'].values())
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{term}.js').write_text('window.SILSILA=window.SILSILA||{};(SILSILA.enrich=SILSILA.enrich||{})[%s]=%s;\n'
                                    % (json.dumps(term), json.dumps(out, separators=(',', ':'), ensure_ascii=False)))
    index = sorted(p.stem for p in OUT.glob('*.js') if p.stem != 'index')
    (OUT / 'index.js').write_text('window.SILSILA=window.SILSILA||{};SILSILA.enrichIndex=%s;\n' % json.dumps(index))
    print(f'\ndata/enrich/{term}.js: {len(out["ages"])} ages, {len(out["ancient"])} ancient, {len(out["famous"])} notable, {len(out["countries"])} country lists, {len(out["route"]["paths"])} route legs', file=sys.stderr)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
