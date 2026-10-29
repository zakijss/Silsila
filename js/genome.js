// Silsila analysis core: reading genotype and STR files, placing a Y result on the tree,
// autosomal statistics. No DOM, so it also runs under Node for the tests.
(function (root) {
  'use strict';
  const S = {};

  /* ---------- tree ---------- */
  // t: SILSILA.tree from tools/build_data.py. Nodes are in depth-first order, so the subtree of i is [i, end[i]).
  S.Tree = function (t) {
    const names = t.names.split('\n'), n = names.length, byName = new Map(names.map((x, i) => [x.toUpperCase(), i]));
    const kids = Array.from({ length: n }, () => []);
    t.parent.forEach((p, i) => { if (p >= 0) kids[p].push(i); });
    const chipByPos = new Map();
    t.chip.forEach((r, k) => { const a = chipByPos.get(r[0]); a ? a.push(k) : chipByPos.set(r[0], [k]); });
    const chipByName = new Map(t.chip.map((r, k) => [r[3].toUpperCase(), k]));
    // the same SNPs by GRCh37 position (column 5, 0 when unknown), for files in the older build
    const chipBy37 = new Map();
    t.chip.forEach((r, k) => { if (r[5]) { const a = chipBy37.get(r[5]); a ? a.push(k) : chipBy37.set(r[5], [k]); } });
    const pre = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + t.kits[i];
    return {
      n, names, parent: t.parent, end: t.end, kits: t.kits, chip: t.chip, chipByPos, chipBy37, chipByName, version: t.version,
      children: i => kids[i],
      find: name => { if (!name) return -1; const k = String(name).trim().toUpperCase(); return byName.has(k) ? byName.get(k) : -1; },
      under: (i, a) => i >= a && i < t.end[a],
      path(i) { const out = []; for (; i >= 0; i = t.parent[i]) out.push(i); return out.reverse(); },
      depth(i) { let d = 0; for (; t.parent[i] >= 0; i = t.parent[i]) d++; return d; },
      // YFull ages in years before 1950, as [formed, tmrca, tmrcaLow, tmrcaHigh, yfullId]
      yfull: i => { const k = t.yfull[i]; return k >= 0 ? t.yf[k] : null; },
      // testers placed anywhere in the subtree
      subtreeKits: i => pre[t.end[i]] - pre[i],
      // deepest node on `path` (an array of indices from the root) that contains i
      meet(path, i) { let best = -1; for (const p of path) { if (i >= p && i < t.end[p]) best = p; else break; } return best; },
    };
  };

  /* ---------- files ---------- */
  S.sniff = function (text) {
    const head = text.slice(0, 4000), first = head.split(/\r?\n/)[0].toUpperCase();
    if (/RSID/.test(first) && /CHROM/.test(first) && /POSITION/.test(first)) return 'genotypes';
    if (/^#.*(23andMe|AncestryDNA|MyHeritage|Living ?DNA|rsid)/im.test(head) || /^"?(rs|i)\d+"?[\t,]"?\w+"?[\t,]"?\d+"?[\t,]"?[ACGTDI0-]/m.test(head)) return 'genotypes';
    if (/SHARED (DNA|CM)|SHARED CENTIMORGANS/i.test(first)) return 'ffmatches';
    if (/GENETIC DISTANCE/i.test(first)) return 'ymatches';
    if (/DYS\s?3(93|90|91)|DYS\s?19\b/i.test(head)) return 'str';
    return 'unknown';
  };
  // Which company made a raw genotype file, and the genome build its header states (37 when it says
  // nothing: all five companies use GRCh37 for the autosomes; FamilyTreeDNA's Y file is GRCh38,
  // which S.yTo38 finds from the positions themselves).
  S.vendor = function (text, filename = '') {
    const head = text.slice(0, 6000);
    const name = /23andMe/i.test(head) ? '23andMe' : /AncestryDNA/i.test(head) ? 'AncestryDNA' : /MyHeritage/i.test(head) ? 'MyHeritage'
      : /Living ?DNA/i.test(head) ? 'Living DNA' : /^"?RSID"?,"?CHROMOSOME"?,"?POSITION"?,"?RESULT/im.test(head) ? 'FamilyTreeDNA' : 'unknown';
    // FamilyTreeDNA states the build only in the file name (..._o37_... or 37_...; 36 for the old build)
    const b = head.match(/^#.*?(?:build|GRCh|hg)\s*(\d{2})/im) || filename.match(/(?:^|[_-])o?(3[67])[_-]/i);
    const build = !b ? 37 : +b[1] === 19 ? 37 : +b[1] === 18 ? 36 : +b[1];
    return { name, build };
  };

  // A genotype as one byte: 0 for no call, otherwise 1 + 4 * one allele + the other, smaller first.
  const BASEN = { A: 0, C: 1, G: 2, T: 3 };
  S.gtCode = function (gt) {
    if (!gt) return 0;
    const a = BASEN[gt[0]], b = BASEN[gt.length > 1 ? gt[1] : gt[0]];   // one letter: a hemizygous call
    if (a == null || b == null || gt.length > 2) return 0;
    return 1 + 4 * Math.min(a, b) + Math.max(a, b);
  };
  const CHR = { 23: 'X', 24: 'Y', 25: 'XY', 26: 'MT', M: 'MT' };
  // Raw genotype files from FamilyTreeDNA and MyHeritage (quoted CSV, RSID,CHROMOSOME,POSITION,RESULT),
  // 23andMe and Living DNA (tab-separated, one genotype column) and AncestryDNA (tab-separated,
  // allele1 and allele2, chromosomes 23 to 26 for X, Y, XY and MT).
  // Returns Y calls keyed by position, per-chromosome arrays for the autosomes and X (positions, genotype
  // codes and 0/1/2 for homozygous/heterozygous/no call), and the genotypes of wanted SNPs: `want` maps an
  // rsid or "chromosome:position" to the rsid the result is stored under.
  S.parseGenotypes = function (text, want) {
    const out = { rows: 0, nocall: 0, y: new Map(), yNoCall: 0, chroms: {}, rs: {} }, tmp = {};
    let start = 0;
    while (start < text.length) {
      let end = text.indexOf('\n', start); if (end < 0) end = text.length;
      const line = text.slice(start, end).replace(/\r$/, ''); start = end + 1;
      if (!line || line[0] === '#' || /^"?RSID/i.test(line)) continue;
      const f = line.split(line.indexOf('\t') >= 0 ? '\t' : ',').map(s => s.replace(/"/g, '').trim());
      if (f.length < 4) continue;
      let [rs, chr, pos, gt] = f;
      if (f.length >= 5 && /^[ACGTDI0-]$/.test(f[3]) && /^[ACGTDI0-]$/.test(f[4])) gt = f[3] + f[4];   // AncestryDNA splits the alleles
      chr = chr.replace(/^chr/i, '').toUpperCase(); chr = CHR[chr] || chr;
      if (chr === '0') continue;
      out.rows++;
      const p = +pos, code = S.gtCode(gt), nc = !code;
      if (want) { const id = want.get(rs.toLowerCase()) || want.get(chr + ':' + p); if (id) out.rs[id] = nc ? '--' : gt; }
      if (nc) out.nocall++;
      if (chr === 'Y') { if (nc) out.yNoCall++; else if (gt.length === 1 || gt[0] === gt[1]) out.y.set(p, gt[0]); continue; }
      if (chr === 'XY' || chr === 'MT') continue;
      (tmp[chr] = tmp[chr] || []).push(p, code);
    }
    for (const [chr, a] of Object.entries(tmp)) {
      const n = a.length / 2, ord = Array.from({ length: n }, (_, i) => i).sort((x, y) => a[2 * x] - a[2 * y]);
      const pos = new Int32Array(n), gt = new Uint8Array(n), st = new Uint8Array(n);
      ord.forEach((k, i) => { pos[i] = a[2 * k]; gt[i] = a[2 * k + 1]; const c = gt[i] - 1; st[i] = !gt[i] ? 2 : (c >> 2) !== (c & 3) ? 1 : 0; });
      out.chroms[chr] = { pos, gt, st };   // st: 0 homozygous, 1 heterozygous, 2 no call
    }
    return out;
  };

  // Share of heterozygous X calls outside the two pseudoautosomal regions (GRCh37). Near 0 with one X, about
  // a quarter with two; a file with two X chromosomes has no real Y calls, only chip noise.
  S.xHet = function (c) {
    let n = 0, het = 0;
    for (let i = 0; i < c.pos.length; i++) {
      const p = c.pos[i];
      if (c.st[i] === 2 || (p >= 60001 && p <= 2699520) || (p >= 154931044 && p <= 155260560)) continue;
      n++; het += c.st[i];
    }
    return n ? het / n : null;
  };

  // Y calls from a file in either build, as a map of GRCh38 position to base for S.placeY. The build is
  // whichever of GRCh38 and GRCh37 more of the positions fall on in the tree's SNP index.
  S.yTo38 = function (calls, tree) {
    let h38 = 0, h37 = 0;
    for (const p of calls.keys()) { if (tree.chipByPos.has(p)) h38++; if (tree.chipBy37.has(p)) h37++; }
    if (h37 <= h38) return { calls, build: 38, hits: h38 };
    const out = new Map();
    for (const [p, b] of calls) for (const k of tree.chipBy37.get(p) || []) out.set(tree.chip[k][0], b);
    return { calls: out, build: 37, hits: h37 };
  };

  /* ---------- Y placement ---------- */
  // calls: Map position -> base (homozygous calls only). Scores every branch on the path from the root:
  // +1 per derived call, -2 per ancestral call, and takes the best total, the deeper branch on a tie.
  S.placeY = function (calls, tree) {
    const der = new Map(), anc = new Map(), push = (m, k, v) => { const a = m.get(k); a ? a.push(v) : m.set(k, [v]); };
    let read = 0;
    tree.chip.forEach((r, k) => {
      const b = calls.get(r[0]); if (!b) return;
      read++;
      if (b === r[2][1]) push(der, r[1], k); else if (b === r[2][0]) push(anc, r[1], k);
    });
    const memo = new Map();
    const score = i => {
      if (i < 0) return 0;
      if (memo.has(i)) return memo.get(i);
      const s = (der.get(i)?.length || 0) - 2 * (anc.get(i)?.length || 0) + score(tree.parent[i]);
      memo.set(i, s); return s;
    };
    let best = -1, bestScore = -Infinity;
    for (const i of der.keys()) {
      const s = score(i);
      if (s > bestScore || (s === bestScore && tree.depth(i) > tree.depth(best))) { best = i; bestScore = s; }
    }
    if (best < 0) return null;
    const path = tree.path(best), onPath = new Set(path);
    const conflicts = [...der.keys()].filter(i => !onPath.has(i) && !tree.under(i, best)).map(i => [i, der.get(i).length]);
    const below = [...anc.keys()].filter(i => i !== best && tree.under(i, best));
    const children = tree.children(best).map(c => {
      let neg = 0, pos = 0;
      for (const i of below) if (tree.under(i, c)) neg++;
      for (const i of der.keys()) if (tree.under(i, c)) pos++;
      return { node: c, own: [...(der.get(c) || []).map(k => [k, '+']), ...(anc.get(c) || []).map(k => [k, '-'])], negBranches: neg, posBranches: pos, size: tree.end[c] - c };
    });
    return { terminal: best, path, der, anc, read, conflicts, below, children };
  };
  // Every indexed SNP with its call and what it says about the person's place on the tree.
  S.snpStatus = function (place, tree, calls) {
    const onPath = new Set(place.path);
    return tree.chip.map((r, k) => {
      const b = calls.get(r[0]);
      let status = 'not read';
      if (b) {
        const d = b === r[2][1], a = b === r[2][0];
        if (onPath.has(r[1])) status = d ? 'positive, your line' : a ? 'negative, your line' : 'other base';
        else if (tree.under(r[1], place.terminal)) status = d ? 'positive, below you' : a ? 'negative, below you' : 'other base';
        else status = d ? 'positive, other line' : a ? 'negative, other line' : 'other base';
      }
      return { k, name: r[3], pos: r[0], anc: r[2][0], der: r[2][1], region: r[4], node: r[1], call: b || '', status };
    });
  };

  /* ---------- STR ---------- */
  S.STR = function (ref) {
    const bases = [];
    ref.order.trim().split('|').forEach((s, i) => s.trim().split(/\s+/).forEach(t => {
      const [n, c] = t.split('*'); bases.push({ n, panel: i + 1, copies: +c || 1 });
    }));
    const canon = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(GATA|GGAAT)/, 'Y$1');
    const alias = { DYS3891: 'DYS389I', DYS3892: 'DYS389II', YCA2: 'YCAII', DYS394: 'DYS19' };
    bases.forEach(b => { alias[canon(b.n)] = b.n; });
    const copies = Object.fromEntries(bases.map(b => [b.n, b.copies]));
    function lookup(cell) {
      const k = canon(cell || '');
      if (!k) return null;
      if (alias[k]) return { base: alias[k], copy: null };
      let m = k.match(/^(.*?)([A-D]+)$/);                      // DYS385A, DYS464ABCD, YCAIIAB
      if (m && alias[m[1]]) return { base: alias[m[1]], copy: m[2].length === 1 ? 'ABCD'.indexOf(m[2]) : null };
      return null;
    }
    function put(out, hit, raw) {
      const v = String(raw || '').trim();
      if (!/\d/.test(v)) return;
      if (hit.copy == null) out[hit.base] = v.split(/\s*[-/]\s*/);
      else (out[hit.base] = out[hit.base] || [])[hit.copy] = v;
    }
    // A table copied from FamilyTreeDNA (a row of names over a row of values, per panel), its CSV download,
    // or lines like "DYS393 13".
    function parse(text) {
      const out = {};
      const rows = text.split(/\r?\n/).map(l => l.split(/\t|,|;|\|/).map(c => c.trim().replace(/^"|"$/g, '')));
      for (let i = 0; i < rows.length; i++) {
        const hits = rows[i].map(lookup), n = hits.filter(Boolean).length;
        if (n < 2 || n < rows[i].filter(Boolean).length / 2) continue;
        let j = i + 1;
        while (j < rows.length && !rows[j].some(c => /\d/.test(c) && !lookup(c))) j++;
        if (j >= rows.length) break;
        hits.forEach((h, x) => h && put(out, h, rows[j][x]));
        i = j;
      }
      if (Object.keys(out).length < 2) {
        const re = /\b((?:Y-?)?(?:DYS\s?\d+(?:-?(?:II|I)|-[12]|[A-D])?|GATA-?[A-Z]\d+|GGAAT-?1B07|CA\s?II[AB]?|DYF\d+S1[AB]?)|CDY[AB]?|YCA\s?II[AB]?)\b[\s:=]+([\d.]+(?:\s*[-/]\s*[\d.]+)*)/gi;
        for (const m of text.matchAll(re)) { const h = lookup(m[1]); if (h) put(out, h, m[2]); }
      }
      return out;
    }
    // one id per reported value: DYS385a, DYS385b, ...
    const ids = bases.flatMap(b => b.copies > 1 ? Array.from({ length: b.copies }, (_, c) => b.n + 'abcd'[c]) : [b.n]);
    const value = (values, id) => {
      const m = id.match(/^(.*?)([abcd])?$/), base = copies[id] ? id : m[1], c = copies[id] ? 0 : 'abcd'.indexOf(m[2]);
      return values[base]?.[c] ?? '';
    };
    const count = values => Object.values(values).reduce((s, v) => s + v.filter(x => x != null && x !== '').length, 0);
    // Compare with a published motif such as the Cohen Modal Haplotype; only markers both sides have count.
    const motif = (values, m) => {
      const rows = Object.entries(m.v).map(([id, want]) => ({ id, want, mine: value(values, id) }));
      const known = rows.filter(r => r.mine !== '');
      return { rows, compared: known.length, same: known.filter(r => +r.mine === r.want).length, steps: known.reduce((s, r) => s + Math.abs(+r.mine - r.want), 0) };
    };
    return { bases, ids, lookup, parse, value, count, motif };
  };

  /* ---------- match lists ---------- */
  S.parseCSV = function (text) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.some(Boolean));
  };
  // Y-DNA matches (Genetic Distance) or Family Finder matches (Shared DNA). Column names vary between exports.
  S.parseMatches = function (text) {
    const rows = S.parseCSV(text); if (rows.length < 2) return [];
    const h = rows[0].map(s => s.trim().toLowerCase().replace(/_/g, ' '));
    const col = (...res) => h.findIndex(x => res.some(r => r.test(x)));
    const c = {
      name: col(/^full name$/, /^name$/, /^match name$/), first: col(/^first name$/), last: col(/^last name$/),
      gd: col(/genetic distance/, /^gd$/), shared: col(/shared (dna|cm)|shared centimorgans/), longest: col(/longest block/),
      range: col(/relationship range/, /suggested relationship/), eka: col(/earliest known ancestor/, /paternal ancestor/),
      hap: col(/y-?dna haplogroup/, /^haplogroup$/), snp: col(/terminal snp/), mt: col(/mtdna haplogroup/), surnames: col(/ancestral surnames/),
      date: col(/match date/), country: col(/country/), bucket: col(/matching bucket/), xmatch: col(/x-match/),
    };
    if (c.gd < 0 && c.shared < 0) return [];
    const get = (r, k) => c[k] >= 0 ? (r[c[k]] || '').trim() : '';
    return rows.slice(1).map((r, i) => ({
      i, kind: c.gd >= 0 ? 'y' : 'ff',
      name: get(r, 'name') || [get(r, 'first'), get(r, 'last')].filter(Boolean).join(' ') || 'Match ' + (i + 1),
      gd: c.gd >= 0 ? parseFloat(get(r, 'gd')) : null, shared: c.shared >= 0 ? parseFloat(get(r, 'shared')) : null,
      longest: parseFloat(get(r, 'longest')) || null, range: get(r, 'range'), eka: get(r, 'eka'),
      hap: get(r, 'snp') || get(r, 'hap'), mt: get(r, 'mt'), surnames: get(r, 'surnames'), date: get(r, 'date'),
      country: get(r, 'country'), bucket: get(r, 'bucket'), xmatch: get(r, 'xmatch'),
    })).filter(m => m.kind === 'y' ? !isNaN(m.gd) : !isNaN(m.shared));
  };

  /* ---------- autosomes ---------- */
  // GRCh37 lengths, which FamilyTreeDNA autosomal files use.
  S.LEN37 = { 1: 249250621, 2: 243199373, 3: 198022430, 4: 191154276, 5: 180915260, 6: 171115067, 7: 159138663, 8: 146364022, 9: 141213431, 10: 135534747, 11: 135006516,
    12: 133851895, 13: 115169878, 14: 107349540, 15: 102531392, 16: 90354753, 17: 81195210, 18: 78077248, 19: 59128983, 20: 63025520, 21: 48129895, 22: 51304566, X: 155270560 };
  S.chromStats = function (c, binSize = 1e6) {
    let het = 0, nc = 0;
    const bins = [];
    for (let i = 0; i < c.pos.length; i++) {
      const b = Math.floor(c.pos[i] / binSize), x = bins[b] || (bins[b] = [0, 0]);
      if (c.st[i] === 2) { nc++; continue; }
      x[0]++; if (c.st[i] === 1) { het++; x[1]++; }
    }
    const called = c.pos.length - nc;
    return { snps: c.pos.length, nocall: nc, het, hetRate: called ? het / called : 0, bins: Array.from(bins, x => x || [0, 0]) };
  };
  // Runs of homozygosity: windows of `win` called SNPs with at most `slack` heterozygous calls are homozygous;
  // neighbouring homozygous windows merge, and a run is kept when it spans at least `minLen` bases.
  S.roh = function (c, { win = 50, slack = 1, minLen = 1e6 } = {}) {
    const idx = []; for (let i = 0; i < c.pos.length; i++) if (c.st[i] !== 2) idx.push(i);
    const segs = []; let cur = null;
    for (let w = 0; w + win <= idx.length; w += win) {
      let het = 0; for (let k = w; k < w + win; k++) het += c.st[idx[k]];
      if (het <= slack) {
        if (cur) { cur.end = c.pos[idx[w + win - 1]]; cur.snps += win; cur.het += het; }
        else cur = { start: c.pos[idx[w]], end: c.pos[idx[w + win - 1]], snps: win, het };
      } else if (cur) { segs.push(cur); cur = null; }
    }
    if (cur) segs.push(cur);
    return segs.filter(s => s.end - s.start >= minLen);
  };
  // Expected share of the autosomes in long runs of homozygosity for a child of each parental relationship.
  S.INBREEDING = [['double first cousins', 1 / 8], ['first cousins', 1 / 16], ['first cousins once removed', 1 / 32], ['second cousins', 1 / 64]];

  // Trait SNPs: { id, chr, pos37, gene, trait, eff, ref, texts: [0, 1, 2 copies], pop, src, group }.
  S.traits = function (rs, list) {
    return list.map(t => {
      const gt = rs[t.id] || '', r = { ...t, gt, n: null };
      if (!gt) return { ...r, text: 'Not on this chip.' };
      if (gt === '--') return { ...r, text: 'No call at this SNP.' };
      const g = gt.length === 1 ? gt + gt : gt;   // a one-letter (hemizygous) call counts twice
      if (![...g].every(b => b === t.eff || b === t.ref)) return { ...r, text: `Unexpected alleles; this reading expects ${t.ref} or ${t.eff}.` };
      const n = [...g].filter(b => b === t.eff).length;
      return { ...r, n, text: t.texts[n] };
    });
  };
  // Several variants behind one trait, such as the lactase persistence variants that arose separately
  // in different regions: which were read, which are carried, and which the chip does not have.
  S.traitGroup = function (rows) {
    const read = rows.filter(r => r.n != null);
    return { read, carried: read.filter(r => r.n > 0), missing: rows.filter(r => !r.gt), nocall: rows.filter(r => r.gt === '--') };
  };

  /* ---------- comparing two people ---------- */
  // Genetic map (data/gmap.js): cM at a GRCh37 position, interpolated between points STEP bases apart.
  S.GeneticMap = function (gm) {
    const chr = {};
    for (const [c, [start, d]] of Object.entries(gm.chr)) {
      const v = new Float64Array(d.length); let s = 0;
      d.forEach((x, k) => { s += x; v[k] = s / 100; });
      chr[c] = { start, v };
    }
    return (c, pos) => {
      const m = chr[c]; if (!m) return null;
      const f = (pos - m.start) / gm.step, k = Math.floor(f), v = m.v;
      return k < 0 ? v[0] : k >= v.length - 1 ? v[v.length - 1] : v[k] + (v[k + 1] - v[k]) * (f - k);
    };
  };
  // Runs of consecutive indices where ok(i) holds. A single failing index between two pieces that are
  // each at least `bunch` long is read as a genotyping error and does not split the run.
  S.runs = function (n, ok, bunch = Infinity) {
    const raw = []; let s = -1;
    for (let i = 0; i <= n; i++) {
      if (i < n && ok(i)) { if (s < 0) s = i; } else if (s >= 0) { raw.push([s, i - 1]); s = -1; }
    }
    const out = [];
    for (const r of raw) {
      const last = out[out.length - 1];
      if (last && r[0] - last.end === 2 && last.piece >= bunch && r[1] - r[0] + 1 >= bunch) { last.end = r[1]; last.piece = r[1] - r[0] + 1; }
      else out.push({ start: r[0], end: r[1], piece: r[1] - r[0] + 1 });
    }
    return out.map(r => [r.start, r.end]);
  };
  // One chromosome of two people, on the positions both files called. Half identical: at every SNP the
  // two share at least one allele (no opposite homozygotes), so one copy may come from a shared ancestor.
  // Fully identical: both alleles the same, as full siblings share on about a quarter of their DNA.
  // Segments count when they reach minCM centimorgans and minSnps SNPs, the defaults GEDmatch uses.
  S.compareChrom = function (a, b, cmAt, { minCM = 7, minSnps = 500, bunch = Math.floor(minSnps / 2) } = {}) {
    const pos = [], ga = [], gb = [];
    for (let i = 0, j = 0; i < a.pos.length && j < b.pos.length;) {
      if (a.pos[i] < b.pos[j]) i++;
      else if (a.pos[i] > b.pos[j]) j++;
      else { if (a.gt[i] && b.gt[j]) { pos.push(a.pos[i]); ga.push(a.gt[i] - 1); gb.push(b.gt[j] - 1); } i++; j++; }
    }
    const n = pos.length;
    const share = i => { const x = ga[i], y = gb[i], x1 = x >> 2, x2 = x & 3, y1 = y >> 2, y2 = y & 3; return x1 === y1 || x1 === y2 || x2 === y1 || x2 === y2; };
    const seg = ([s, e]) => ({ start: pos[s], end: pos[e], snps: e - s + 1, cm: Math.max(0, cmAt(pos[e]) - cmAt(pos[s])) });
    const keep = g => g.snps >= minSnps && g.cm >= minCM;
    return {
      snps: n,
      half: S.runs(n, share, bunch).map(seg).filter(keep),
      full: S.runs(n, i => ga[i] === gb[i], bunch).map(seg).filter(keep),
    };
  };
  // Both people's chromosomes (parseGenotypes().chroms) compared with a genetic map (S.GeneticMap).
  // Totals cover the autosomes; the X is reported on its own, as the matching sites do.
  S.compare = function (A, B, cm, opts = {}) {
    const chroms = {};
    let snps = 0, half = 0, full = 0, segments = 0, longest = null;
    for (const c of [...Array.from({ length: 22 }, (_, i) => String(i + 1)), 'X']) {
      if (!A[c] || !B[c]) continue;
      const r = chroms[c] = S.compareChrom(A[c], B[c], p => cm(c, p), opts);
      if (c === 'X') continue;
      snps += r.snps; segments += r.half.length;
      for (const g of r.half) { half += g.cm; if (!longest || g.cm > longest.cm) longest = { c, ...g }; }
      for (const g of r.full) full += g.cm;
    }
    const x = chroms.X ? chroms.X.half.reduce((t, g) => t + g.cm, 0) : 0;
    return { chroms, snps, half, full, segments, longest, x };
  };
  // Relationships whose published range of shared cM includes `cm`, closest average first.
  // table: [[relationship, average, low, high], ...] from the Shared cM Project.
  S.relationships = function (cm, table) {
    return table.filter(r => cm >= r[2] && cm <= r[3]).sort((a, b) => Math.abs(cm - a[1]) - Math.abs(cm - b[1]));
  };

  /* ---------- people, time and place ---------- */
  // Generations back for a span of years, and the kinship word for that many father-to-son steps.
  S.generations = function (years, perGen = 30) {
    const n = Math.max(0, Math.round(years / perGen));
    const who = n === 0 ? 'you' : n === 1 ? 'father' : n === 2 ? 'grandfather' : n === 3 ? 'great-grandfather'
      : `${(n - 2).toLocaleString('en-US')}-times-great-grandfather`;
    return { n, who };
  };
  // Dated events ([year, ...]) inside a man's date range, nearest his mean first; when none fall inside,
  // the closest event on each side.
  S.eventsAround = function (events, mean, lo = mean, hi = mean) {
    if (lo > hi) [lo, hi] = [hi, lo];
    const inside = events.filter(e => e[0] >= lo && e[0] <= hi).sort((a, b) => Math.abs(a[0] - mean) - Math.abs(b[0] - mean));
    if (inside.length) return { inside: true, list: inside };
    let before = null, after = null;
    for (const e of events) {
      if (e[0] < lo && (!before || e[0] > before[0])) before = e;
      if (e[0] > hi && (!after || e[0] < after[0])) after = e;
    }
    return { inside: false, list: [before, after].filter(Boolean) };
  };
  // Great-circle distance in km, and the item nearest a point (items need lat and lon).
  S.distanceKm = function (lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180, a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
  };
  S.nearest = function (items, lat, lon) {
    let best = null, km = Infinity;
    for (const it of items) {
      if (it.lat == null || it.lon == null) continue;
      const d = S.distanceKm(lat, lon, it.lat, it.lon);
      if (d < km) { best = it; km = d; }
    }
    return best && { item: best, km };
  };
  // Middle of the largest ring of a GeoJSON Polygon or MultiPolygon, in plain lon/lat: good enough for
  // "the middle of a country" and indifferent to ring winding.
  S.geoMiddle = function (geom) {
    const rings = geom?.type === 'MultiPolygon' ? geom.coordinates.map(p => p[0]) : geom?.type === 'Polygon' ? [geom.coordinates[0]] : [];
    let best = null;
    for (const r of rings) {
      let a = 0, cx = 0, cy = 0;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
        a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
      }
      if (a && (!best || Math.abs(a) > best.a)) best = { a: Math.abs(a), lon: cx / (3 * a), lat: cy / (3 * a) };
    }
    return best && { lat: best.lat, lon: best.lon };
  };
  // Records from the autosomal summaries: the longest run of homozygosity and the most and least heterozygous autosome.
  S.autoRecords = function (auto) {
    let longest = null, most = null, least = null;
    for (const [c, segs] of Object.entries(auto.roh || {}))
      for (const g of segs) if (!longest || g.end - g.start > longest.end - longest.start) longest = { c, ...g };
    for (const [c, s] of Object.entries(auto.stats || {})) {
      if (c === 'X' || !s.snps) continue;
      if (!most || s.hetRate > most.rate) most = { c, rate: s.hetRate };
      if (!least || s.hetRate < least.rate) least = { c, rate: s.hetRate };
    }
    return { longest, most, least };
  };

  // A .gz file may hold several gzip members back to back (FamilyTreeDNA's autosomal download has two), and
  // DecompressionStream fails after the first (Chrome reports "Failed to fetch"). Each candidate member start
  // (1f 8b 08) is tried in turn: a slice that will not decompress on its own ends inside a member, so it grows
  // to the next candidate.
  S.gunzip = async function (bytes) {
    const one = async b => new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    const cuts = [];
    for (let i = 1; i < bytes.length - 2; i++) if (bytes[i] === 0x1f && bytes[i + 1] === 0x8b && bytes[i + 2] === 8) cuts.push(i);
    cuts.push(bytes.length);
    const parts = []; let start = 0;
    for (const end of cuts) {
      try { parts.push(await one(bytes.subarray(start, end))); start = end; } catch (e) { /* ends inside a member: try the next cut */ }
    }
    if (start !== bytes.length) throw new Error('not a readable gzip file');
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0; for (const p of parts) { out.set(p, at); at += p.length; }
    return new TextDecoder().decode(out);
  };

  // The text inside a .zip download (23andMe, AncestryDNA, MyHeritage and Living DNA send one): the
  // largest .txt, .csv or .tsv entry, read through the central directory. Stored and deflated entries only.
  S.unzip = async function (bytes) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let e = bytes.length - 22;
    while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('not a readable zip file');
    let at = v.getUint32(e + 16, true), best = null;
    for (let n = v.getUint16(e + 10, true); n > 0; n--) {
      if (v.getUint32(at, true) !== 0x02014b50) break;
      const nl = v.getUint16(at + 28, true), name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nl));
      const ent = { method: v.getUint16(at + 10, true), size: v.getUint32(at + 20, true), full: v.getUint32(at + 24, true), off: v.getUint32(at + 42, true), name };
      if (/\.(txt|csv|tsv)$/i.test(name) && !/__MACOSX/.test(name) && (!best || ent.full > best.full)) best = ent;
      at += 46 + nl + v.getUint16(at + 30, true) + v.getUint16(at + 32, true);
    }
    if (!best) throw new Error('no text file inside the zip');
    const start = best.off + 30 + v.getUint16(best.off + 26, true) + v.getUint16(best.off + 28, true), data = bytes.subarray(start, start + best.size);
    if (best.method === 0) return new TextDecoder().decode(data);
    if (best.method !== 8) throw new Error('this zip uses a compression method the browser cannot read');
    return new TextDecoder().decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  };

  S.toCSV = rows => rows.map(r => r.map(v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n');

  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.Genome = S;
})(typeof window !== 'undefined' ? window : globalThis);
