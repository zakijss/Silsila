#!/usr/bin/env python3
"""Build Silsila's reference data from public sources.

    python3 tools/build_data.py --ftdna haplotree.json --yfull current_tree.json \
        --aadr v66.anno --chip ftdna-y-file.csv --world ne_110m_admin_0_countries.geojson \
        --liftover hg38ToHg19.over.chain.gz [--chip37 other-chip-y-positions.txt ...]

Sources (see README for where to download each):
  --ftdna  FamilyTreeDNA public haplotree, https://www.familytreedna.com/public/y-dna-haplotree/get
  --yfull  YFull YTree current_tree.json (CC BY 4.0), https://github.com/YFullTeam/YTree
  --aadr   Allen Ancient DNA Resource annotation (.anno), doi:10.7910/DVN/FFIDCW
  --chip   any FamilyTreeDNA Family Finder Y-chromosome file; only its POSITION column is read,
           so the chip's SNP list can be indexed without storing anyone's genotypes (GRCh38)
  --liftover UCSC's GRCh38 to GRCh37 chain file,
           https://hgdownload.soe.ucsc.edu/goldenPath/hg38/liftOver/hg38ToHg19.over.chain.gz:
           gives each indexed SNP its GRCh37 position, so Y files in GRCh37 (23andMe, AncestryDNA,
           MyHeritage, Living DNA) can be placed too
  --chip37 a list of Y positions (GRCh37, one per line) carried by another company's chip; every
           tree SNP whose GRCh37 position is on it is indexed as well. Repeatable.
  --world  Natural Earth 1:110m admin-0 countries GeoJSON (public domain)

Writes data/tree.js, data/ancient.js and data/world.js.
"""
import argparse, csv, gzip, json, re, sys
from bisect import bisect_right
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'data'


def js(name, obj):
    """Write obj as a script that sets SILSILA.<name>, so the page also works from file://."""
    text = 'window.SILSILA=window.SILSILA||{};SILSILA.%s=%s;\n' % (name, json.dumps(obj, separators=(',', ':'), ensure_ascii=False))
    (OUT / f'{name}.js').write_text(text)
    print(f'data/{name}.js {len(text) / 1e6:.2f} MB', file=sys.stderr)


def num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def build_tree(a):
    ftdna = json.load(open(a.ftdna))
    nodes = ftdna['allNodes']
    kids = {}
    for h, n in nodes.items():
        p = n.get('parentId')
        kids.setdefault(str(p) if p is not None and str(p) in nodes else None, []).append(h)
    # Depth-first order, so a node's subtree is the index range [i, end[i]).
    order, end, parent, stack = [], {}, {}, [(h, None, False) for h in sorted(kids[None], key=lambda h: nodes[h]['name'], reverse=True)]
    while stack:
        h, p, done = stack.pop()
        if done:
            end[h] = len(order); continue
        parent[h] = p; order.append(h); stack.append((h, p, True))
        stack += [(c, h, False) for c in sorted(kids.get(h, []), key=lambda c: nodes[c]['name'], reverse=True)]
    idx = {h: i for i, h in enumerate(order)}

    # YFull: ages per node, and SNP name -> node, with equivalent names (A/B/C) sharing a node.
    yf, snp2yf = [], {}
    def walk(o):
        i = len(yf)
        yf.append([o.get('id') or 'ROOT', num(o.get('formed')), num(o.get('tmrca')), num(o.get('tmrcalowage')), num(o.get('tmrcahighage'))])
        for group in re.split(r',\s*', o.get('snps') or ''):
            for s in group.split('/'):
                if s.strip():
                    snp2yf.setdefault(s.strip(), i)
        for c in o.get('children') or []:
            walk(c)
    sys.setrecursionlimit(100000)
    walk(json.load(open(a.yfull)))

    var2node, yfull_of, chip = {}, [], []
    positions = chip_positions(a.chip)
    lift = liftover_y(a.liftover) if a.liftover else (lambda p: 0)
    on37 = set()
    for path in a.chip37 or []:
        on37 |= {int(x) for x in open(path) if x.strip().isdigit()}
    for h in order:
        votes = Counter()
        for v in nodes[h].get('variants') or []:
            var2node.setdefault(v['variant'], []).append(idx[h])
            if v['variant'] in snp2yf:
                votes[snp2yf[v['variant']]] += 1
            anc, der = v.get('ancestral') or '', v.get('derived') or ''
            if len(anc) != 1 or len(der) != 1:
                continue
            p37 = lift(v.get('position') or 0)
            if v.get('position') in positions or (p37 and p37 in on37):
                chip.append([v['position'], idx[h], anc + der, v['variant'], v.get('region') or '', p37])
        yfull_of.append(votes.most_common(1)[0][0] if votes else -1)
    # Keep only the YFull nodes something points at.
    used = sorted({i for i in yfull_of if i >= 0})
    remap = {i: k for k, i in enumerate(used)}
    chip.sort()
    tree = {
        'version': {'ftdna': a.ftdna_version or (ftdna.get('publishedDate') or '')[:10], 'yfull': a.yfull_version},
        'names': '\n'.join(nodes[h]['name'] for h in order),
        'parent': [idx[parent[h]] if parent[h] else -1 for h in order],
        'end': [end[h] for h in order],
        'kits': [nodes[h].get('kitsCount') or 0 for h in order],
        'yfull': [remap.get(i, -1) for i in yfull_of],
        'yf': [yf[i] for i in used],
        'chip': chip,
    }
    js('tree', tree)
    return nodes, order, idx, var2node, snp2yf, yf


def liftover_y(path):
    """A function from a GRCh38 chrY position to its GRCh37 position (0 when it does not map).
    Uses the same-strand chrY-to-chrY chains of a UCSC chain file, best-scoring chain first."""
    chains, take = [], False
    with gzip.open(path, 'rt') as f:
        for line in f:
            w = line.split()
            if not w:
                continue
            if w[0] == 'chain':
                take = w[2] == 'chrY' and w[7] == 'chrY' and w[4] == '+' and w[9] == '+'
                t, q = int(w[5]), int(w[10])
                if take:
                    chains.append(([], []))
                continue
            if take:
                size = int(w[0])
                chains[-1][0].append(t); chains[-1][1].append((t + size, q))
                if len(w) == 3:
                    t += size + int(w[1]); q += size + int(w[2])

    def lift(pos):
        p = pos - 1   # chains count from 0
        for starts, rest in chains:
            k = bisect_right(starts, p) - 1
            if k >= 0 and p < rest[k][0]:
                return rest[k][1] + p - starts[k] + 1
        return 0
    return lift


def chip_positions(path):
    with open(path, newline='') as f:
        head = f.readline()
        if 'POSITION' in head.upper():
            f.seek(0)
            return {int(r['POSITION']) for r in csv.DictReader(f) if r.get('CHROMOSOME', 'Y') in ('Y', '24')}
        return {int(x) for x in [head, *f] if x.strip().isdigit()}


def build_ancient(a, nodes, order, idx, var2node, snp2yf, yf):
    # Same-node aliases from YFull let a YFull-named call find FamilyTreeDNA's name for that SNP.
    yf_names = {}
    for s, i in snp2yf.items():
        yf_names.setdefault(i, []).append(s)
    top = {}
    for h in order:
        r = nodes[h].get('root')
        p = nodes[h].get('parentId')
        if r and r not in top and (p is None or str(p) not in nodes or nodes[str(p)].get('root') != r):
            top[r] = idx[h]

    root_of = [nodes[h].get('root') for h in order]

    def place(call):
        # SNP names recur in unrelated haplogroups, so only accept a node under the call's own letter.
        call = call.strip().rstrip('~*').split(' ')[0]
        m = re.match(r'^([A-Z]+)-(.+)$', call)
        if m:
            letter, snp = m.groups()
            for name in [snp, *yf_names.get(snp2yf.get(snp), [])]:
                hit = [i for i in var2node.get(name, []) if root_of[i] == letter]
                if hit:
                    return hit[0], False
            return top.get(letter), True
        m = re.match(r'^([A-Z]+)', call)
        return (top.get(m.group(1)), True) if m else (None, True)

    rows, seen = [], set()
    with open(a.aadr, newline='', encoding='utf-8', errors='replace') as f:
        r = csv.reader(f, delimiter='\t')
        next(r)
        for x in r:
            if len(x) < 37 or x[30].strip() != 'M':
                continue
            manual, auto = x[36].strip(), x[34].strip()
            call = manual if manual and manual != '..' and re.match(r'^[A-Z]+-', manual) else auto
            if not call or call in ('..', 'n/a', 'na'):
                continue
            node, coarse = place(call)
            ind = x[2].strip() or x[0]
            if node is None or ind in seen:
                continue
            seen.add(ind)
            warn = x[48] if len(x) > 48 else ''
            rows.append([x[0].strip(), node, num(x[10]), x[12].strip(), x[14].strip(), x[15].strip(), x[16].strip(),
                         round(float(x[17]), 3) if re.match(r'^-?\d', x[17]) else None,
                         round(float(x[18]), 3) if re.match(r'^-?\d', x[18]) else None,
                         x[6].strip(), call, 1 if coarse else 0, 1 if re.search(r'FAIL|CRITICAL', warn) else 0])
    js('ancient', {'source': a.aadr_version, 'cols': ['id', 'node', 'bp', 'date', 'group', 'locality', 'country', 'lat', 'lon', 'pub', 'call', 'coarse', 'qc'], 'rows': rows})


def build_world(a):
    d = json.load(open(a.world))
    def rnd(c):
        return [rnd(x) for x in c] if isinstance(c[0], list) else [round(c[0], 2), round(c[1], 2)]
    feats = [{'type': 'Feature', 'properties': {'n': f['properties']['NAME'], 'c': f['properties'].get('ISO_A2_EH') or f['properties'].get('ISO_A2')},
              'geometry': {'type': f['geometry']['type'], 'coordinates': rnd(f['geometry']['coordinates'])}} for f in d['features']]
    js('world', {'type': 'FeatureCollection', 'features': feats})


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    for k in ('ftdna', 'yfull', 'aadr', 'chip', 'world'):
        p.add_argument('--' + k, required=True)
    p.add_argument('--liftover', help='UCSC hg38ToHg19.over.chain.gz, for GRCh37 positions')
    p.add_argument('--chip37', action='append', help='GRCh37 Y positions on another chip, one per line')
    p.add_argument('--ftdna-version', default='', help="defaults to the date in the haplotree's publishedDate")
    p.add_argument('--yfull-version', default='')
    p.add_argument('--aadr-version', default='AADR')
    a = p.parse_args()
    OUT.mkdir(exist_ok=True)
    built = build_tree(a)
    build_ancient(a, *built)
    build_world(a)
