// Silsila page: views, the reading panel, the database tables, help and file import.
// Analysis lives in genome.js; scene3d.js loads and wraps the 3D libraries.
(function () {
  'use strict';
  const REF = window.SILSILA || {}, G = window.Genome, S3 = window.Scene3D;
  if (!REF.tree || !REF.ancient || !REF.world) {
    document.getElementById('panel').innerHTML = `<div class="eyebrow">Setup</div><h2>The reference data is missing</h2>
      <p>Silsila needs <code>data/tree.js</code>, <code>data/ancient.js</code> and <code>data/world.js</code>, built from public sources by <code>tools/build_data.py</code>. The README lists the downloads and the command.</p>`;
    return;
  }
  const T = G.Tree(REF.tree), STR = G.STR(REF.str), SR = REF.str, NOTES = REF.notes, FACTS = REF.facts;
  const EVENTS = FACTS.events.slice().sort((a, b) => a[0] - b[0]);
  const NOW = new Date().getFullYear(), YLEN = 57227415;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const COMP = { A: 'T', C: 'G', G: 'C', T: 'A' };
  // Colours come from the theme's CSS tokens; tokens() reads them again when the theme changes.
  const BASE = {}, DYE = [], COL = {};
  const gdScale = d3.scaleLinear().domain([0, 5, 10]).clamp(true);
  function tokens() {
    Object.assign(BASE, { A: css('--joe'), C: css('--fam'), G: css('--ned'), T: css('--pet') });
    DYE.splice(0, DYE.length, ...['--fam', '--joe', '--ned', '--pet', '--liz'].map(css));
    for (const k of ['fg', 'muted', 'dim', 'line', 'hair', 'raise', 'surface', 'bg', 'hap', 'share', 'anc', 'fame', 'ff', 'ned', 'you']) COL[k] = css('--' + k);
    gdScale.range([css('--ok'), css('--warn'), css('--bad')]);
  }
  tokens();
  const PANEL_RANGE = ['1-12', '13-25', '26-37', '38-67', '68-111'];
  const rnd = v => (Math.abs(v) >= 10000 ? Math.round(v / 100) * 100 : Math.abs(v) >= 1000 ? Math.round(v / 10) * 10 : Math.round(v)).toLocaleString('en-US');
  const yr = y => y == null ? 'n/a' : y < 0 ? `${rnd(-y)} BCE` : `${rnd(y)} CE`;
  const yrsAgo = y => Math.max(0, NOW - y);
  const ago = y => y == null ? '' : `${rnd(yrsAgo(y))} years ago`;
  const gens = y => G.generations(yrsAgo(y), FACTS.yearsPerGen);
  const num = n => n == null || isNaN(n) ? '' : Number(n).toLocaleString('en-US');
  const pct = x => (100 * x).toFixed(x < .1 || x > .99 ? 1 : 0) + '%';
  const rgba = (c, a) => { const x = d3.color(c); if (!x) return c; x.opacity = a; return x.formatRgb(); };
  const speedScale = d3.scaleSequentialLog(d3.interpolatePlasma).domain([0.0003, 0.03]).clamp(true);
  const link = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  const srcs = list => (list || []).filter(Boolean).map(([l, u]) => link(u, l)).join(' · ');
  const discover = name => `https://discover.familytreedna.com/y-dna/${encodeURIComponent(name)}/story`;
  const letterOf = i => T.names[i].split('-')[0];
  const baseOf = id => STR.bases.find(b => id === b.n || id.slice(0, -1) === b.n && b.copies > 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduced = S3.reduced();
  // a "?" that opens the glossary entry for a term
  const q = id => FACTS.glossary[id] ? `<button type="button" class="q" data-term="${id}" aria-label="Explain: ${esc(FACTS.glossary[id][0])}" aria-haspopup="dialog" aria-expanded="false">?</button>` : '';

  /* ---------- state ---------- */
  const KEY = 'silsila.v1', UIKEY = 'silsila.ui', TOURKEY = 'silsila.tour', THEMEKEY = 'silsila.theme';
  const local = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const blank = () => ({ v: 1, y: null, str: {}, matches: [], auto: null, focus: null, home: null });
  let me = Object.assign(blank(), local.get(KEY) || {});
  const ui = Object.assign({ view: 'net', snp: true, sis: false, anc: true, fam: true, strL: true, match: true, strColor: 'panel', db: 'line', mapNode: null, dim: '3d', route: true,
    labels: 'key', particles: true, size: 'M', spread: 'normal', spin: false, scale: 'log', gCountries: true, gLabels: true, gGrid: true, gAtmo: true, gSurface: 'day' }, local.get(UIKEY) || {});
  const saveUi = () => local.set(UIKEY, ui);
  const save = () => { if (!local.set(KEY, me)) toast('This browser would not keep the data, so it will be gone after a reload.'); };
  let D = {};

  function derive() {
    D = { calls: me.y ? new Map(me.y.calls) : null, ages: new Map() };
    D.place = D.calls ? G.placeY(D.calls, T) : null;
    const f = me.focus ? T.find(me.focus) : -1;
    D.focus = f >= 0 ? f : D.place ? D.place.terminal : -1;
    D.line = D.focus >= 0 ? T.path(D.focus) : [];
    D.pos = new Map(D.line.map((i, k) => [i, k]));
    D.lineStart = D.focus >= 0 ? Math.max(0, D.line.findIndex(i => letterOf(i) === letterOf(D.focus))) : 0;
    D.mine = D.place && D.focus === D.place.terminal;
    D.enr = enrichment();
    D.route = D.enr?.route?.paths?.length ? D.enr.route : null;
    D.home = homePoint();
    D.ancient = buildAncient();
    D.famous = (D.enr?.famous || []).map(([name, y, category, country], n) => {
      const node = T.find(y); return { n, name, y, category, country, node, meet: node >= 0 && D.line.length ? T.meet(D.line, node) : -1 };
    }).filter(f => f.meet >= 0);
    D.matches = (me.matches || []).map(m => {
      const node = m.hap ? T.find(m.hap) : -1; return Object.assign(m, { node, meet: node >= 0 && D.line.length ? T.meet(D.line, node) : -1 });
    });
    D.span = Math.ceil(Math.max(1000, D.line.length ? yrsAgo(ageOrUp(D.line[0])) : 300000) / 10000) * 10000;   // the linear time axis
  }
  const onLine = a => a.meet >= 0 && D.pos.get(a.meet) >= D.lineStart;
  // For the net and the map: ancient men whose line meets this one within the last 20,000 years.
  const close = a => onLine(a) && !a.present && meetAge(a.meet) >= NOW - 20000;
  const meetAge = i => D.ages.has(i) ? D.ages.get(i) : (D.ages.set(i, ageOrUp(i)), D.ages.get(i));
  // The two branches on the line whose common ancestors bracket a calendar year.
  function lineAt(y) {
    let k = -1;
    D.line.forEach((i, n) => { if (ageOrUp(i) <= y) k = n; });
    return { older: k >= 0 ? D.line[k] : -1, younger: k + 1 < D.line.length ? D.line[k + 1] : -1 };
  }
  // The middle of the optional paternal country, for distances.
  const middles = new Map();
  function homePoint() {
    if (!me.home) return null;
    if (!middles.has(me.home)) {
      const f = REF.world.features.find(x => x.properties.c === me.home), m = f && G.geoMiddle(f.geometry);
      middles.set(me.home, m ? { ...m, name: f.properties.n } : null);
    }
    return middles.get(me.home);
  }

  // Discover data saved by tools/enrich.py, for the deepest branch on the line that has a file.
  const loading = new Set();
  function enrichment() {
    const have = new Set(REF.enrichIndex || []);
    for (let k = D.line.length - 1; k >= 0; k--) {
      const name = T.names[D.line[k]];
      if (!have.has(name)) continue;
      if (REF.enrich?.[name]) return REF.enrich[name];
      D.enrLoading = name;
      if (!loading.has(name)) {
        loading.add(name);
        const s = document.createElement('script');
        s.src = 'data/enrich/' + encodeURIComponent(name) + '.js';
        s.onload = () => { derive(); render(); if (cur) open(cur[0], cur[1], true); };
        s.onerror = () => { D.enrLoading = null; toast(`Could not load the Discover data for ${name}.`); };
        document.head.appendChild(s);
      }
      return null;
    }
    return null;
  }
  const baseId = id => String(id).replace(/\.(AG|SG|DG|HO|TW|BY|AA|EC|WGC|REF)$/i, '');
  function buildAncient() {
    const out = new Map();
    for (const [id, node, bp, date, group, site, country, lat, lon, pub, call, coarse] of REF.ancient.rows)
      out.set(baseId(id), { id, node, year: bp ? 1950 - bp : bp === 0 ? NOW : null, present: bp === 0, date, culture: group, site, country, lat, lon, pub, call, coarse: !!coarse, src: 'AADR' });
    for (const [code, y, year, site, country, culture, period, uncertain, studies, lat, lon] of D.enr?.ancient || []) {
      const node = T.find(y); if (node < 0) continue;
      const a = out.get(baseId(code));
      if (a) Object.assign(a, { node, call: y, uncertain, period, coarse: false, src: 'AADR, placed by FamilyTreeDNA' });
      else out.set(baseId(code), { id: code, node, year, present: false, culture, period, site, country, lat, lon, pub: (studies || []).join('; '), call: y, uncertain, src: 'FamilyTreeDNA Discover' });
    }
    return [...out.values()].map((a, n) => Object.assign(a, { n, meet: D.line.length ? T.meet(D.line, a.node) : -1 }));
  }

  /* ---------- ages ---------- */
  // FamilyTreeDNA's own estimate when Discover data is loaded, otherwise YFull's, mapped through a shared SNP.
  function ages(i) {
    const out = [], e = D.enr?.ages?.[T.names[i]], c = D.enr?.children?.[T.names[i]];
    if (e && e[0] != null) out.push({ src: 'FamilyTreeDNA', tmrca: e[0], lo: e[1], hi: e[2], formed: D.enr.ages[T.names[T.parent[i]]]?.[0] ?? null, modern: e[4] });
    else if (c) out.push({ src: 'FamilyTreeDNA', tmrca: c[0], formed: c[1] });
    const y = T.yfull(i);
    if (y && y[2] != null) out.push({ src: 'YFull', id: y[0], tmrca: 1950 - y[2], lo: y[4] != null ? 1950 - y[4] : null, hi: y[3] != null ? 1950 - y[3] : null, formed: y[1] != null ? 1950 - y[1] : null });
    return out;
  }
  const age = i => ages(i)[0] || null;
  const ageOrUp = i => { for (; i >= 0; i = T.parent[i]) { const a = age(i); if (a) return a.tmrca; } return NOW; };

  /* ---------- top bar ---------- */
  let menuOpen = false;
  // The View menu: how the current view is drawn. Every choice is kept with the other settings.
  function viewMenu(v) {
    const three = use3d();
    const seg = (k, opts, label, term) => `<div class="opt"><span>${label}${term ? q(term) : ''}</span><div class="seg" role="group" aria-label="${label}">${opts.map(([val, t]) => `<button type="button" data-opt="${k}" data-val="${val}" aria-pressed="${ui[k] === val}">${t}</button>`).join('')}</div></div>`;
    const box = (k, label) => `<label class="chip"><input type="checkbox" data-ui="${k}" ${ui[k] ? 'checked' : ''}>${label}</label>`;
    let h = '';
    if (v === 'map') {
      h += `<div class="opt"><span>Layers</span><div class="chips">${box('gCountries', 'Countries')}${box('anc', 'Ancient men')}${D.route ? box('route', 'Route') : ''}${box('gLabels', 'Labels')}${box('gGrid', 'Graticule')}${three ? box('gAtmo', 'Atmosphere') : ''}</div></div>`;
      if (three) h += seg('gSurface', [['day', 'Day'], ['night', 'Night'], ['plain', 'Plain']], 'Earth');
    } else {
      h += seg('labels', [['all', 'All'], ['key', 'Important'], ['none', 'None']], 'Labels');
      h += seg('size', [['S', 'S'], ['M', 'M'], ['L', 'L']], 'Node size');
      h += seg('spread', [['tight', 'Tight'], ['normal', 'Normal'], ['loose', 'Loose']], 'Spread');
      if (v === 'time') h += seg('scale', [['log', 'Log'], ['linear', 'Linear']], 'Time scale', 'logscale');
    }
    if (!reduced) h += `<div class="opt"><span>Motion</span><div class="chips">${v !== 'map' ? box('particles', 'Link particles') : ''}${three ? box('spin', 'Auto-rotate') : ''}</div></div>`;
    if (S3.webgl) h += seg('dim', [['3d', '3D'], ['2d', '2D']], 'Drawing');
    return `<details class="menu" id="viewMenu" ${menuOpen ? 'open' : ''}><summary class="btn small">View</summary><div class="menu-body">${h}</div></details>`;
  }
  function renderBar() {
    const bar = $('#bar'), v = ui.view, a = document.activeElement;
    // the bar is redrawn on every change, so put the focus back where it was
    const keep = a && bar.contains(a) ? (a.dataset.opt ? `[data-opt="${a.dataset.opt}"][data-val="${a.dataset.val}"]` : a.dataset.ui ? `[data-ui="${a.dataset.ui}"]` : a.dataset.strc ? `[data-strc="${a.dataset.strc}"]` : a.id ? '#' + a.id : a.matches('summary') ? '#viewMenu > summary' : null) : null;
    const chip = (k, label, term) => `<label class="chip"><input type="checkbox" data-ui="${k}" ${ui[k] ? 'checked' : ''}>${label}${term ? q(term) : ''}</label>`;
    if (v === 'net' || v === 'time') {
      bar.innerHTML = `<span class="label">Show</span><div class="group">${chip('snp', 'Your SNPs', 'snp')}${chip('sis', 'Sister branches', 'branch')}${chip('anc', 'Ancient men', 'ancient')}${chip('fam', 'Notables')}${chip('strL', 'STR markers', 'str')}${chip('match', 'Matches')}</div>` +
        (ui.strL ? `<div class="seg" role="group" aria-label="Colour STR markers by"><button data-strc="panel" aria-pressed="${ui.strColor === 'panel'}">By panel</button><button data-strc="speed" aria-pressed="${ui.strColor === 'speed'}">By speed</button></div>` : '') +
        `<div class="end">${D.place && !D.mine ? `<button class="btn small" data-act="mine">Back to my line</button>` : ''}${viewMenu(v)}</div>`;
    } else if (v === 'map') {
      const opts = D.line.filter(i => D.enr?.countries?.[T.names[i]]);
      if (ui.mapNode == null || !opts.includes(T.find(ui.mapNode))) ui.mapNode = opts.length ? T.names[opts[opts.length - 1]] : null;
      bar.innerHTML = (opts.length ? `<label class="label" for="mapNode">Testers${q('testers')} on</label><select id="mapNode">${opts.map(i => `<option ${T.names[i] === ui.mapNode ? 'selected' : ''}>${esc(T.names[i])}</option>`).join('')}</select>`
        : `<span class="note">${D.enrLoading ? 'Loading Discover data…' : D.line.length ? 'Country counts and the route need saved Discover data for this line (tools/enrich.py).' : 'Add a Y file, or open a branch and choose "Show this line", to put a line on the map.'}</span>`) +
        `<div class="end">${viewMenu(v)}</div>`;
    } else if (v === 'genome') {
      bar.innerHTML = `<span class="note">${me.auto ? esc(me.auto.file) + ' · ' + num(me.auto.rows) + ' SNPs' : 'The Y chromosome is drawn from your Y file. Add an autosomal raw file to fill in the other chromosomes and compare with a relative.'}</span>`;
    } else if (v === 'help') {
      bar.innerHTML = `<span class="note">Plain explanations of the views, the terms and where the data comes from.</span><div class="end"><button class="btn small" data-act="tour">Take the tour</button></div>`;
    } else bar.innerHTML = `<span class="note">Every table filters as you type and sorts by column; click a row to read it.</span>`;
    $$('[data-ui]').forEach(c => c.onchange = () => setOpt(c.dataset.ui, c.checked));
    $$('[data-opt]').forEach(b => b.onclick = () => setOpt(b.dataset.opt, b.dataset.val));
    $$('[data-strc]').forEach(b => b.onclick = () => { ui.strColor = b.dataset.strc; saveUi(); render(); });
    const vm = $('#viewMenu'); if (vm) vm.ontoggle = () => { menuOpen = vm.open; };
    const mn = $('#mapNode'); if (mn) mn.onchange = () => { ui.mapNode = mn.value; saveUi(); renderMap(); };
    if (keep) bar.querySelector(keep)?.focus();
  }
  function setOpt(k, v) {
    ui[k] = v; saveUi();
    if (k === 'spin') { spin(); renderBar(); return; }
    if (k === 'dim') povSet = false;
    render();
  }
  // auto-rotate in the 3D views, never with reduced motion
  function spin() {
    const on = ui.spin && !reduced;
    if (FG3) Object.assign(FG3.fg.controls(), { autoRotate: on, autoRotateSpeed: .8 });
    if (GL) Object.assign(GL.controls(), { autoRotate: on, autoRotateSpeed: .35 });
  }
  function setTheme(t) {
    document.documentElement.dataset.theme = t; local.set(THEMEKEY, t); tokens();
    $('meta[name=theme-color]')?.setAttribute('content', COL.surface);
    // the 3D network only needs new colours; rebuilding it would restart the layout
    if ((ui.view === 'net' || ui.view === 'time') && use3d() && GR3) { renderBar(); legend(); paint3D(); }
    else render();
    if (cur) open(cur[0], cur[1], true);
  }

  /* ---------- graph data (Net and Timeline, 2D and 3D) ---------- */
  const byKits = (a, b) => T.subtreeKits(b) - T.subtreeKits(a);
  function buildGraph() {
    const nodes = [], links = [], seen = new Set();
    const add = n => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } return n; };
    const edge = (source, target, kind, extra) => links.push({ source, target, kind, ...extra });
    const L = D.line;
    add({ id: 'you', kind: 'you', label: D.place ? (D.mine ? 'You' : 'You (elsewhere)') : 'Start', r: 15 });
    if (L.length) {
      L.forEach((i, k) => { add({ id: 'b' + i, kind: 'line', i, label: T.names[i], r: 4 + Math.log10(T.subtreeKits(i) + 10) * 1.2 }); if (k) edge('b' + L[k - 1], 'b' + i, 'tree'); });
      edge('you', 'b' + D.focus, 'yours');
      T.children(D.focus).slice().sort(byKits).slice(0, 10).forEach(c => { add({ id: 'b' + c, kind: 'child', i: c, label: T.names[c], r: 6 }); edge('b' + D.focus, 'b' + c, 'child'); });
      if (ui.sis) L.forEach((i, k) => {
        if (k < D.lineStart || i === D.focus) return;
        T.children(i).filter(c => c !== L[k + 1]).sort(byKits).slice(0, 4).forEach(c => { add({ id: 'b' + c, kind: 'sister', i: c, label: T.names[c], r: 3 + Math.log10(T.subtreeKits(c) + 1) * 1.2 }); edge('b' + i, 'b' + c, 'sister'); });
      });
      if (ui.snp && D.place) L.forEach(i => {
        for (const [m, sign] of [[D.place.der, '+'], [D.place.anc, '-']]) for (const k of m.get(i) || []) { add({ id: 's' + k, kind: 'snp', k, sign, label: T.chip[k][3], r: 4 }); edge('b' + i, 's' + k, 'snp'); }
      });
      if (ui.anc) D.ancient.forEach(a => { if (close(a)) { add({ id: 'a' + a.n, kind: 'ancient', a, label: a.id, r: 4.5 }); edge('b' + a.meet, 'a' + a.n, 'ancient'); } });
      if (ui.fam) D.famous.forEach(f => { add({ id: 'f' + f.n, kind: 'famous', f, label: f.name, r: 5.5 }); edge('b' + f.meet, 'f' + f.n, 'famous'); });
    }
    if (ui.strL) {
      for (let p = 1; p <= 5; p++) { add({ id: 'p' + p, kind: 'panel', panel: p, label: 'markers ' + PANEL_RANGE[p - 1], r: 9 }); edge('you', 'p' + p, 'panel'); }
      let prev = null, prevBase = null;
      STR.ids.forEach((id, k) => {
        const base = baseOf(id);
        add({ id: 'k:' + id, kind: 'marker', mid: id, base: base.n, panel: base.panel, idx: k + 1, val: STR.value(me.str || {}, id), info: SR.info[base.n] || {}, r: 7.5 });
        edge('p' + base.panel, 'k:' + id, 'marker');
        if (prevBase === base.n) edge(prev, 'k:' + id, 'copy');
        prev = 'k:' + id; prevBase = base.n;
      });
    }
    if (ui.match) D.matches.forEach(m => {
      if (m.kind === 'y') { add({ id: 'm' + m.id, kind: 'match', m, label: m.name, r: 5 }); edge('you', 'm' + m.id, 'match', { gd: m.gd }); }
      else if (onLine(m)) { add({ id: 'm' + m.id, kind: 'ffmatch', m, label: m.name, r: 4 + Math.min(4, Math.log10(m.shared + 1)) }); edge('b' + m.meet, 'm' + m.id, 'ffmatch'); }
    });
    return { nodes, links };
  }

  function color(d) {
    switch (d.kind) {
      case 'you': return COL.you;
      case 'line': return COL.hap;
      case 'child': return childState(d.i) === 'negative' ? COL.dim : COL.hap;
      case 'sister': return COL.dim;
      case 'snp': return d.sign === '+' ? BASE[T.chip[d.k][2][1]] : COL.dim;
      case 'ancient': return COL.anc;
      case 'famous': return COL.fame;
      case 'panel': return DYE[d.panel - 1];
      case 'match': return gdScale(d.m.gd);
      case 'ffmatch': return COL.ff;
    }
    if (d.val === '') return COL.dim;
    if (ui.strColor === 'speed') return d.info.r ? speedScale(d.info.r) : COL.dim;
    return DYE[d.panel - 1];
  }
  function childState(c) {
    const ch = D.place?.children.find(x => x.node === c);
    if (!ch || !D.mine) return 'unknown';
    if (ch.own.some(o => o[1] === '-')) return 'negative';
    if (ch.own.some(o => o[1] === '+') || ch.posBranches) return 'positive';
    return 'untested';
  }
  const hollow = d => d.kind === 'child' || d.kind === 'sister' || (d.kind === 'snp' && d.sign === '-');
  // labels drawn without hovering: you, the STR panels, the start of each haplogroup letter, your branch, noted branches
  const keyNode = d => d.kind === 'you' || d.kind === 'panel' || (d.kind === 'line' && (d.i === D.focus || D.pos.get(d.i) === D.lineStart ||
    !!NOTES.branches[T.names[d.i]] || T.parent[d.i] < 0 || letterOf(d.i) !== letterOf(T.parent[d.i])));
  const nearSet = gr => {
    const near = new Set([sel]);
    gr.links.forEach(l => { const s = l.source.id ?? l.source, t = l.target.id ?? l.target; if (s === sel) near.add(t); if (t === sel) near.add(s); });
    const d = gr.nodes.find(n => n.id === sel);
    if (d?.kind === 'line') for (let k = D.pos.get(d.i); k < D.line.length; k++) near.add('b' + D.line[k]);
    return near;
  };
  function tip(d) {
    const a = d.i != null ? age(d.i) : null;
    switch (d.kind) {
      case 'you': return `<b>${esc(d.label)}</b>`;
      case 'line': case 'child': case 'sister': return `<b>${esc(T.names[d.i])}</b><br>${a ? 'common ancestor ' + yr(a.tmrca) + '<br>' : ''}${num(T.subtreeKits(d.i))} testers`;
      case 'snp': { const r = T.chip[d.k]; return `<b>${esc(r[3])}</b> ${r[2][0]} to ${r[2][1]}<br>${d.sign === '+' ? 'you carry the new letter' : 'you read the old letter'}<br>defines ${esc(T.names[r[1]])}`; }
      case 'ancient': return `<b>${esc(d.a.id)}</b><br>${esc(d.a.site || d.a.country || '')}<br>${d.a.present ? 'present-day' : yr(d.a.year)}`;
      case 'famous': return `<b>${esc(d.f.name)}</b><br>${esc(d.f.category || '')}`;
      case 'panel': return `<b>STR panel ${d.panel}</b><br>markers ${PANEL_RANGE[d.panel - 1]}`;
      case 'marker': return `<b>${esc(d.mid)}</b> ${d.val ? '= ' + esc(d.val) : 'not loaded'}`;
      case 'match': case 'ffmatch': return `<b>${esc(d.m.name)}</b><br>${d.kind === 'match' ? 'genetic distance ' + d.m.gd : num(d.m.shared) + ' cM'}`;
    }
    return '';
  }

  /* ---------- 2D graph (the fallback, and the keyboard-friendly version) ---------- */
  const svg = d3.select('#net'), root = svg.append('g');
  const gAxis = root.append('g').attr('class', 'axis'), gLinks = root.append('g'), gNodes = root.append('g');
  const zoom = d3.zoom().scaleExtent([0.08, 8]).on('zoom', e => { root.attr('transform', e.transform); labelVis(e.transform.k); });
  svg.call(zoom).on('dblclick.zoom', null).on('dblclick', e => { if (!e.target.closest?.('.node, .ev')) resetView(); });
  svg.on('click', () => { sel = null; highlight(); });
  let sim, GR, linkSel, nodeSel, sel = null;

  // Position along the time axis, from today (log10 60) back to 700,000 years ago (log10 700,060), on a
  // log scale or, from the View menu, a linear one that spans the oldest ancestor on the line.
  const LOG0 = Math.log10(60), LOG1 = Math.log10(700060);
  const tpos = y => { const a = Math.max(NOW - y, 0); return ui.scale === 'linear' ? LOG0 + (LOG1 - LOG0) * Math.min(1, a / (D.span || 300000)) : Math.log10(a + 60); };
  const timeTicks = () => ui.scale === 'linear' ? d3.ticks(0, D.span || 300000, 6).reverse() : [200000, 50000, 20000, 10000, 5000, 3000, 2000, 1000, 500, 200, 0];
  const tx = y => -700 * tpos(y);
  // node size and spread from the View menu
  const SZ = () => ({ S: .72, M: 1, L: 1.4 })[ui.size] || 1;
  const SPREAD = () => ({ tight: .55, normal: 1, loose: 1.7 })[ui.spread] || 1;
  const timeOf = d => ({ line: () => ageOrUp(d.i), child: () => ageOrUp(d.i), sister: () => ageOrUp(d.i), snp: () => ageOrUp(T.chip[d.k][1]), ancient: () => d.a.year ?? NOW }[d.kind] || (() => NOW))();
  const yTarget = d => ui.view === 'net' ? 0 : ({ line: 0, child: 0, you: 0, sister: 45, snp: 90, ancient: -120, famous: -230, match: -330, ffmatch: -300, panel: 260, marker: 330 })[d.kind];
  function fxOf(d) {
    if (d.kind === 'marker') return tx(NOW) + 90 + ((d.idx - 1) % 12) * 17;
    if (d.kind === 'panel') return tx(NOW) + 40;
    return tx(timeOf(d));
  }
  const LINKDIST = { tree: 34, yours: 70, child: 30, sister: 26, snp: 16, ancient: 22, famous: 28, panel: 80, marker: 32, copy: 11, ffmatch: 30 };
  const CHARGE = { marker: -36, snp: -18, ancient: -18, famous: -30, match: -26, ffmatch: -18, sister: -40 };
  const linkDist = l => (l.kind === 'match' ? 90 + (l.gd || 0) * 20 : LINKDIST[l.kind]) * Math.sqrt(SPREAD()) * SZ();
  const charge = d => (CHARGE[d.kind] ?? -220) * SPREAD() * SZ();

  function renderGraph() {
    GR = buildGraph();
    sim?.stop();
    linkSel = gLinks.selectAll('line').data(GR.links, l => (l.source.id || l.source) + '>' + (l.target.id || l.target))
      .join('line').attr('class', l => 'link ' + l.kind).attr('stroke-width', l => l.kind === 'tree' || l.kind === 'yours' ? 2 : 1)
      .attr('stroke-opacity', l => l.kind === 'marker' || l.kind === 'snp' || l.kind === 'sister' ? .5 : .8);
    nodeSel = gNodes.selectAll('g.node').data(GR.nodes, d => d.id).join(enter => {
      const g = enter.append('g').attr('class', 'node').attr('tabindex', 0).attr('role', 'button');
      g.append('circle');
      g.append('text').attr('class', 'in').attr('text-anchor', 'middle').attr('dy', '.35em');
      g.append('text').attr('class', 'lab').attr('text-anchor', 'middle');
      return g;
    });
    nodeSel.attr('aria-label', d => d.label || d.mid)
      .on('click', (e, d) => { e.stopPropagation(); openNode(d); })
      .on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNode(d); } })
      .call(d3.drag().on('start', (e, d) => { if (!e.active) sim.alphaTarget(.2).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fy = null; d.fx = ui.view === 'time' ? fxOf(d) : null; }));
    nodeSel.select('circle').attr('r', d => d.r * SZ())
      .attr('fill', d => hollow(d) ? 'var(--bg)' : color(d))
      .attr('stroke', d => hollow(d) ? color(d) : d.kind === 'you' ? 'var(--hap)' : 'var(--bg)')
      .attr('stroke-width', d => d.kind === 'you' ? 3 : hollow(d) ? 1.6 : 1)
      .attr('stroke-dasharray', d => d.kind === 'child' && childState(d.i) !== 'negative' && childState(d.i) !== 'positive' ? '2 2' : null);
    nodeSel.select('text.in').text(d => d.kind === 'marker' ? d.val : d.kind === 'panel' ? d.panel : '')
      .attr('font-size', d => d.kind === 'panel' ? 10 : (d.val || '').length > 2 ? 5.5 : 7)
      .attr('fill', d => d.kind === 'marker' ? 'var(--bg)' : 'var(--fg)').attr('font-weight', 500);
    nodeSel.select('text.lab').text(d => d.kind === 'marker' ? d.mid : d.label)
      .attr('dy', d => -d.r * SZ() - 4).attr('font-size', d => d.kind === 'you' ? 12 : d.kind === 'line' ? 9.5 : 8)
      .attr('fill', d => d.kind === 'line' || d.kind === 'you' ? 'var(--fg)' : 'var(--muted)');
    sim = d3.forceSimulation(GR.nodes)
      .force('link', d3.forceLink(GR.links).id(d => d.id).distance(linkDist).strength(l => l.kind === 'copy' ? 1 : l.kind === 'match' ? .4 : .8))
      .force('charge', d3.forceManyBody().strength(charge))
      .force('collide', d3.forceCollide(d => d.r * SZ() + 2))
      .force('x', d3.forceX(0).strength(.02)).force('y', d3.forceY(yTarget).strength(.02))
      .on('tick', () => {
        linkSel.attr('x1', l => l.source.x).attr('y1', l => l.source.y).attr('x2', l => l.target.x).attr('y2', l => l.target.y);
        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
      });
    applyLayout();
    highlight(); labelVis(d3.zoomTransform(svg.node()).k);
  }
  // which nodes carry a label without hovering: the View menu's All, Important or None
  const labelled = d => ui.labels === 'all' || (ui.labels !== 'none' && (keyNode(d) || d.kind === 'child'));
  function labelVis(k) {
    nodeSel?.select('text.lab').attr('display', d => labelled(d) || (ui.labels !== 'none' && k > 1.8) || d.id === sel ? null : 'none');
  }
  function applyLayout() {
    GR.nodes.forEach(d => { d.fy = null; d.fx = ui.view === 'time' ? fxOf(d) : null; });
    sim.force('x').strength(ui.view === 'net' ? .02 : 0);
    sim.force('y').y(yTarget).strength(ui.view === 'net' ? .02 : .25);
    const time = ui.view === 'time', ticks = time ? timeTicks() : [];
    const g = gAxis.selectAll('g.tick').data(ticks).join(e => { const g = e.append('g').attr('class', 'tick'); g.append('line'); g.append('text'); return g; });
    g.attr('transform', t => `translate(${tx(NOW - t)},0)`);
    g.select('line').attr('y1', -420).attr('y2', 220);
    g.select('text').attr('y', -430).attr('text-anchor', 'middle').text(t => t ? t.toLocaleString('en-US') + ' years ago' : 'today');
    // history marks above the axis labels
    const ev = gAxis.selectAll('g.ev').data(time ? EVENTS.map((e, n) => ({ e, n })) : [], d => d.n).join(enter => {
      const g = enter.append('g').attr('class', 'ev').attr('tabindex', 0).attr('role', 'button');
      g.append('path').attr('d', 'M0,-4L4,0L0,4L-4,0Z'); g.append('text').attr('text-anchor', 'middle'); g.append('title');
      return g;
    });
    ev.attr('transform', d => `translate(${tx(d.e[0])},-470)`).attr('aria-label', d => `${d.e[3]}, ${d.e[1]}`);
    ev.select('text').attr('y', d => -9 - 9 * (d.n % 3)).text(d => d.e[2]);
    ev.select('title').text(d => `${d.e[3]}, ${d.e[1]}`);
    ev.on('click', (e, d) => { e.stopPropagation(); open('event', d.n); })
      .on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open('event', d.n); } });
    sim.alpha(1).restart();
    sim.on('end.fit', () => { fit(); sim.on('end.fit', null); });
    setTimeout(fit, 900);
  }
  function fit() {
    if (!GR?.nodes.length || use3d()) return;
    const xs = GR.nodes.map(d => d.x), ys = GR.nodes.map(d => d.y);
    if (xs.some(isNaN)) return;
    const [x0, x1, y0, y1] = [d3.min(xs) - 40, d3.max(xs) + 40, d3.min(ys) - (ui.view === 'time' ? 110 : 40), d3.max(ys) + 40];
    const { width: w, height: h } = svg.node().getBoundingClientRect();
    if (!w || !h) return;
    const k = Math.min(2.5, .95 * Math.min(w / (x1 - x0), h / (y1 - y0)));
    svg.transition().duration(reduced ? 0 : 500).call(zoom.transform, d3.zoomIdentity.translate(w / 2 - k * (x0 + x1) / 2, h / 2 - k * (y0 + y1) / 2).scale(k));
  }
  function highlight() {
    if (use3d() && (ui.view === 'net' || ui.view === 'time')) { paint3D(); return; }
    if (!GR || !nodeSel) return;
    const near = sel ? nearSet(GR) : null;
    nodeSel.classed('faded', d => !!near && !near.has(d.id));
    linkSel.classed('faded', l => !!near && !(near.has(l.source.id) && near.has(l.target.id)))
      .classed('hot', l => ui.particles && !!sel && (l.source.id === sel || l.target.id === sel));
    labelVis(d3.zoomTransform(svg.node()).k);
  }
  function focusNode(id) {
    if (!(ui.view === 'net' || ui.view === 'time')) return;
    if (use3d()) { const n = GR3?.nodes.find(x => x.id === id); if (n && FG3) FG3.fly(n, reduced ? 0 : 900); return; }
    const n = GR?.nodes.find(x => x.id === id); if (!n) return;
    const { width: w, height: h } = svg.node().getBoundingClientRect();
    svg.transition().duration(reduced ? 0 : 500).call(zoom.transform, d3.zoomIdentity.translate(w / 2 - 2.2 * n.x, h / 2 - 2.2 * n.y).scale(2.2));
  }
  function legend() {
    const dots = pairs => `<div class="row">${pairs.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}</div>`;
    const rows = [dots([[COL.you, 'you'], [COL.hap, 'your line'], ...(ui.anc ? [[COL.anc, 'ancient']] : []), ...(ui.fam ? [[COL.fame, 'notable']] : []), ...(ui.match && D.matches.some(m => m.kind === 'ff') ? [[COL.ff, 'Family Finder match']] : [])])];
    if (ui.snp && D.place) rows.push(`<div class="row">${Object.entries(BASE).map(([b, c]) => `<span><i style="background:${c}"></i>${b}</span>`).join('')}<span>SNP, coloured by the new base${q('derived')}</span></div>`);
    if (ui.strL) rows.push(ui.strColor === 'panel' ? `<div class="row">${PANEL_RANGE.map((r, i) => `<span><i style="background:${DYE[i]}"></i>${r}</span>`).join('')}<span>STR panel${q('panel')}</span></div>`
      : `<div class="row">STR slow <span class="ramp" style="background:linear-gradient(90deg,${d3.range(0, 1.01, .1).map(t => d3.interpolatePlasma(t)).join(',')})"></span> fast${q('rate')}</div>`);
    if (ui.view === 'time') rows.push(`<div class="row"><span>time runs left to right on a ${ui.scale === 'linear' ? 'linear' : 'log'} scale${q('logscale')}</span><span><i style="background:${COL.anc};border-radius:1px;transform:rotate(45deg) scale(.8)"></i>history</span></div>`);
    rows.push(`<div class="row"><span>faint or ringed: ruled out, untested or a sister branch${q('calls')}</span></div>`);
    $('#legend').innerHTML = rows.join('');
  }

  /* ---------- 3D graph ---------- */
  let FG3 = null, need3dP = null, broken3d = false, GR3 = null;
  const use3d = () => S3.webgl && ui.dim !== '2d' && !broken3d;
  const tx3 = y => -320 * tpos(y);
  const X3MID = -320 * (LOG0 + LOG1) / 2;
  const ticks3 = () => ui.scale === 'linear' ? timeTicks() : [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 0];
  const fx3 = d => (d.kind === 'marker' ? tx3(NOW) + 40 + ((d.idx - 1) % 12) * 12 : d.kind === 'panel' ? tx3(NOW) + 20 : tx3(timeOf(d))) - X3MID;
  function loadingMsg(text) { $('#loading').hidden = !text; if (text) $('#loadingText').textContent = text; }
  function need3d() {
    if (FG3) return Promise.resolve();
    return need3dP || (need3dP = (loadingMsg('Loading the 3D view'), S3.load('lib/3d-force-graph.min.js')).then(() => {
      FG3 = S3.graph($('#net3d'), $('#labels3d'), $('#axis3d'), { click: n => openNode(n), background: () => { sel = null; highlight(); }, reset: () => resetView() });
      FG3.fg.onEngineStop(() => { if (!FG3.moved) FG3.fg.zoomToFit(reduced ? 0 : 700, 30); });
      spin();
      sizeAll();
    }).finally(() => loadingMsg(null)));
  }
  function render3D() {
    if (!FG3 || !(ui.view === 'net' || ui.view === 'time') || !use3d()) return;
    const fg = FG3.fg, time = ui.view === 'time', old = new Map((GR3?.nodes || []).map(n => [n.id, n]));
    const fresh = !GR3 || GR3.mode !== ui.view;
    GR3 = buildGraph(); GR3.mode = ui.view;
    GR3.nodes.forEach(n => {
      const o = old.get(n.id); if (o) Object.assign(n, { x: o.x, y: o.y, z: o.z });
      n.fx = time ? fx3(n) : null; n.fy = null; n.fz = null;
      if (time && o == null) Object.assign(n, { x: n.fx, y: -yTarget(n) * .8, z: (Math.random() - .5) * 80 });
    });
    fg.enableNodeDrag(!time).nodeVal(d => (Math.round(d.r * SZ() * 2) / 2 * 1.7) ** 3).nodeLabel(tip)   // rounded sizes share sphere geometries
      .linkWidth(l => l.kind === 'tree' || l.kind === 'yours' ? 1.4 : 0)
      .linkDirectionalParticleWidth(2.4).linkDirectionalParticleSpeed(.007);
    fg.d3Force('link').distance(linkDist).strength(l => l.kind === 'copy' ? 1 : l.kind === 'match' ? .4 : .8);
    fg.d3Force('charge').strength(charge);
    fg.d3Force('lane', time ? d3.forceY(d => -yTarget(d) * .8).strength(.3) : null);
    fg.d3Force('flat', time ? flatZ(.06) : null);
    paint3D();
    fg.graphData(GR3);
    FG3.overlay(time ? drawAxis3D : null);
    FG3.start();
    if (fresh) { FG3.resetMoved(); setTimeout(() => { if (FG3 && !FG3.moved && GR3?.mode === ui.view) fg.zoomToFit(reduced ? 0 : 700, 30); }, 1200); }
  }
  // keeps the timeline from spreading too deep: pulls every node gently toward z = 0
  function flatZ(k) { let nodes = []; const f = a => { for (const n of nodes) n.vz -= (n.z || 0) * k * a; }; f.initialize = ns => { nodes = ns; }; return f; }
  function linkTint(l) {
    const t = typeof l.target === 'object' ? l.target : null;
    return ({ tree: COL.hap, yours: COL.hap, child: COL.hap, sister: COL.dim, snp: COL.muted, ancient: COL.anc, famous: COL.fame, ffmatch: COL.ff })[l.kind]
      || (l.kind === 'match' ? gdScale(l.gd) : t?.panel ? DYE[t.panel - 1] : COL.line);
  }
  function paint3D() {
    if (!FG3 || !GR3) return;
    const nb = sel ? nearSet(GR3) : null, ends = l => [l.source.id ?? l.source, l.target.id ?? l.target];
    FG3.fg.nodeColor(d => rgba(color(d), nb && !nb.has(d.id) ? .1 : hollow(d) ? .4 : 1))
      .linkColor(l => { const [s, t] = ends(l); const on = !nb || nb.has(s) && nb.has(t); return rgba(linkTint(l), !on ? .04 : nb ? .9 : l.kind === 'tree' || l.kind === 'yours' ? .75 : .32); })
      // particles: along the selected sphere's links, and down the line toward you
      .linkDirectionalParticles(l => { if (reduced || !ui.particles) return 0; const [s, t] = ends(l); return sel && (s === sel || t === sel) ? 3 : !sel && (l.kind === 'tree' || l.kind === 'yours') ? 1 : 0; })
      .linkDirectionalParticleColor(() => COL.fg);
    const rank = d => d.id === sel ? 0 : d.kind === 'you' ? 1 : d.i === D.focus ? 2 : d.kind === 'line' ? 3 : d.kind === 'panel' ? 4 : 5;
    const items = GR3.nodes.filter(d => labelled(d) || d.id === sel).sort((a, b) => rank(a) - rank(b)).map(d => ({
      node: d, text: d.kind === 'marker' ? d.mid : d.kind === 'panel' ? 'STR ' + PANEL_RANGE[d.panel - 1] : d.label, dy: 10,
      cls: d.id === sel ? 'sel' : d.kind === 'you' ? 'big' : d.kind === 'child' || d.kind === 'panel' ? 'minor' : '',
    }));
    if (ui.view === 'time') EVENTS.forEach((e, n) => items.push({ node: { x: tx3(e[0]) - X3MID, y: 330, z: 0 }, text: e[2], cls: 'ev', dy: 8 + 20 * (n % 3), click: () => open('event', n), title: `${e[3]}, ${e[1]}` }));
    FG3.labels(items);
  }
  function drawAxis3D(ctx, proj) {
    ctx.lineWidth = 1; ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'center';
    let right = -Infinity;
    ticks3().forEach((t, k) => {
      const x = tx3(NOW - t) - X3MID, a = proj(x, 310, 0), b = proj(x, -300, 0);
      if (!a || !b) return;
      ctx.strokeStyle = rgba(COL.line, .7); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const label = !t ? 'today' : (t >= 1000 ? t / 1000 + 'k' : t) + (k === 0 ? ' years ago' : ''), half = ctx.measureText(label).width / 2;   // ticks run oldest first
      if (b.x - half < right + 8) return;
      right = b.x + half; ctx.fillStyle = COL.muted; ctx.fillText(label, b.x, b.y + 14);
    });
    const l = proj(tx3(NOW - 700000) - X3MID, 330, 0), r = proj(tx3(NOW) - X3MID, 330, 0);
    if (l && r) { ctx.strokeStyle = rgba(COL.anc, .3); ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke(); }
    ctx.fillStyle = COL.anc;
    for (const e of EVENTS) {
      const p = proj(tx3(e[0]) - X3MID, 330, 0); if (!p) continue;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x + 4, p.y); ctx.lineTo(p.x, p.y + 4); ctx.lineTo(p.x - 4, p.y); ctx.closePath(); ctx.fill();
    }
  }
  function renderNet() {
    const three = use3d();
    $('#net3d').hidden = $('#labels3d').hidden = !three;
    $('#axis3d').hidden = !three || ui.view !== 'time';
    $('#net').style.display = three ? 'none' : '';
    $('#hint').innerHTML = three ? 'Drag to turn · right-drag to pan · scroll to zoom<br>click a sphere to read about it' : 'Drag · scroll to zoom · click a node<br>Tab and Enter work too';
    legend();
    if (!three) { FG3?.stop(); renderGraph(); return; }
    sim?.stop();
    need3d().then(render3D, err => { broken3d = true; toast('The 3D view could not start, so this is the 2D version. ' + err.message); render(); });
  }

  /* ---------- map: globe in 3D, flat map in 2D ---------- */
  // The time bar scrubs from the oldest ancestor on the route (or the oldest ancient man shown) to today on a
  // near-log scale of years ago; route legs, route stops and ancient men appear once their date has passed.
  const tb = { v: 1000, span: 1000 };
  // log-spaced, but with 1,500 years added before taking logs so the last few centuries do not take half the bar
  const yearAt = v => v >= 1000 ? NOW : Math.round(NOW - (Math.pow(tb.span + 1500, 1 - v / 1000) * Math.pow(1500, v / 1000) - 1500));
  function mapData() {
    const rows = (ui.mapNode && D.enr?.countries?.[ui.mapNode]) || [];
    const share = new Map(rows.filter(r => r[3] >= 30).map(r => [r[1], r]));
    const ratio = c => { const r = share.get(c); return r ? r[2] / r[3] : 0; };
    const max = d3.max([...share.values()], r => r[2] / r[3]) || 1;
    const fill = d3.scaleSequentialSqrt(d3.interpolate(COL.raise, COL.share)).domain([0, max]);
    const allPts = ui.anc ? D.ancient.filter(a => close(a) && a.lat != null && a.lon != null) : [];
    const ageCol = d3.scaleSequential(d3.interpolateYlOrBr).domain([NOW, -12000]);
    const R = ui.route && D.route ? D.route : null, { legs, flows, marks } = routeParts(R);
    // the time bar spans the oldest dated thing on the map
    const oldest = d3.min([...legs, ...marks, ...allPts], d => d.year ?? NOW) ?? NOW;
    tb.span = Math.max(1000, NOW - oldest);
    const year = yearAt(tb.v), pts = allPts.filter(a => (a.year ?? NOW) <= year);
    const f = R?.nodes?.[R.family];
    const center = f ? { lat: f[1], lng: f[0], altitude: 2.3 } : D.home ? { lat: D.home.lat, lng: D.home.lon, altitude: 2.3 } : { lat: 20, lng: 20, altitude: 2.5 };
    return { rows, share, ratio, max, fill, allPts, pts, ageCol, R, legs: legs.filter(l => l.year <= year), flows: flows.filter(l => l.year <= year), allLegs: legs, marks: marks.filter(d => d.year <= year), center, year };
  }
  // Route legs and stops, kept as the same objects while the time bar moves so the globe does not rebuild
  // them on every step; a new route, theme or label setting makes new ones.
  let routeCache = null;
  function routeParts(R) {
    const key = [R, document.documentElement.dataset.theme, ui.gLabels];
    if (routeCache && routeCache.key.every((v, i) => v === key[i])) return routeCache;
    const legs = [], marks = [];
    if (R) {
      R.paths.forEach(([from, to, , side, c], k) => {
        const node = T.find(to || from);
        legs.push({ from, to, side, k, node, coords: c, year: node >= 0 ? ageOrUp(node) : NOW });
      });
      let lastPrefix = null;
      Object.entries(R.nodes).forEach(([name, [lon, lat]], k) => {
        const i = T.find(name), prefix = name.split('-')[0];
        const label = k === 0 || name === R.family || !!NOTES.branches[name] || (prefix.length <= 2 && prefix !== lastPrefix);
        if (label) lastPrefix = prefix;
        marks.push({ name, lat, lon, node: i, label, k, year: i >= 0 ? ageOrUp(i) : NOW });
      });
    }
    return (routeCache = { key, legs, flows: legs.map(l => ({ ...l, flow: true })), marks });
  }
  const countryTip = (f, m) => { const r = m.share.get(f.properties.c); return `<b>${esc(f.properties.n)}</b>${r ? `<br>${num(r[2])} of ${num(r[3])} testers, ${pct(r[2] / r[3])}` : m.rows.length ? '<br>no testers on this branch, or fewer than 30 in all' : ''}${f.properties.c === me.home ? '<br>your paternal country' : ''}`; };
  const ancientTip = a => `<b>${esc(a.id)}</b><br>${a.year != null ? yr(a.year) : 'undated'}${a.site || a.country ? ', ' + esc(a.site || a.country) : ''}${a.culture ? '<br>' + esc(a.culture) : ''}<br>shares ${esc(T.names[a.meet] || '')}`;
  const legTip = l => `<b>${esc(l.from)}</b> to ${esc(l.to || 'later branches')}${l.node >= 0 ? `<br>${l.to ? 'founder of ' + esc(l.to) : 'from'} around ${yr(l.year)}` : ''}`;
  const markTip = d => `<b>${esc(d.name)}</b><br>${d.node >= 0 ? `common ancestor around ${yr(d.year)}<br>${num(T.subtreeKits(d.node))} testers` : ''}<br>stop ${d.k + 1} on the route`;
  function mapLegend(m) {
    const ramp = use3d() && ui.gSurface !== 'plain' ? `${rgba(COL.share, .12)},${rgba(COL.share, .82)}` : `${COL.raise},${COL.share}`;
    $('#mapLegend').innerHTML = (m.rows.length && ui.gCountries ? `<div class="row">testers on ${esc(ui.mapNode)}: 0 <span class="ramp" style="background:linear-gradient(90deg,${ramp})"></span> ${pct(m.max)} of a country's testers</div>` : '') +
      (m.allPts.length ? `<div class="row">${m.allPts.length} ancient men${q('ancient')} on your line from the last 20,000 years: <span class="ramp" style="background:linear-gradient(90deg,${d3.range(0, 1.01, .1).map(t => d3.interpolateYlOrBr(t)).join(',')})"></span> older${use3d() ? ', taller' : ''}</div>` : ui.anc ? `<div class="row">No dated ancient men with coordinates on this line yet.</div>` : '') +
      (m.R ? `<div class="row"><span><i style="background:${COL.hap}"></i>route of your line to ${esc(m.R.family)}, from FamilyTreeDNA, oldest first${q('route')}</span></div>` : '') +
      (D.home ? `<div class="row"><span><i style="background:${COL.ned}"></i>${esc(D.home.name)}, your paternal country</span></div>` : '') +
      (use3d() && ui.gSurface !== 'plain' ? `<div class="row note">Earth: NASA ${ui.gSurface === 'night' ? 'Black Marble 2012' : 'Blue Marble Next Generation'} (public domain)</div>` : '');
  }
  function timeBar(m) {
    const show = !!(m.allLegs.length || m.allPts.length);
    $('#timebar').hidden = !show;
    $('#play').hidden = reduced;
    $('#year').value = tb.v;
    $('#yearOut').textContent = tb.v >= 1000 ? 'today' : yr(m.year);
    $('#year').setAttribute('aria-valuetext', tb.v >= 1000 ? 'today' : yr(m.year));
  }
  function renderMap() {
    const three = use3d();
    $('#globe').hidden = !three; $('#map').style.display = three ? 'none' : '';
    $('#mapHint').innerHTML = three ? 'Drag to turn the globe · scroll to zoom<br>click a country, a point or the route' : 'Drag · scroll to zoom · click a country or a point';
    if (!three) { GL?.pauseAnimation(); renderMap2D(); return; }
    needGlobe().then(renderGlobe, err => { broken3d = true; toast('The globe could not start, so this is the flat map. ' + err.message); render(); });
  }
  let GL = null, needGlobeP = null, povSet = false, glHover = null, globeBase = null, globeUrl = null;
  const EARTH = { day: 'assets/earth-day.jpg', night: 'assets/earth-night.jpg' };
  function needGlobe() {
    if (GL) return Promise.resolve();
    return needGlobeP || (needGlobeP = (loadingMsg('Loading the globe'), S3.load('lib/globe.gl.min.js')).then(() => {
      GL = new window.Globe($('#globe'), { animateIn: !reduced })
        .backgroundColor('rgba(0,0,0,0)').atmosphereAltitude(.12)
        .polygonCapCurvatureResolution(4).polygonsTransitionDuration(reduced ? 0 : 500).pointsTransitionDuration(reduced ? 0 : 500).pathTransitionDuration(0)
        .pointRadius(.32).pointResolution(8).pointsMerge(false)
        .onPolygonClick(f => mapData().share.has(f.properties.c) && open('country', f.properties.c))
        .onPointClick(a => open('ancient', a.n)).onPointHover(a => { glHover = a; })
        .onPathClick(l => l.node >= 0 && open('branch', l.node)).onPathHover(l => { glHover = l; });
      globeBase = GL.globeMaterial().color;
      $('#globe').addEventListener('dblclick', e => { if (!glHover && !e.target.closest('.glabel')) resetView(); });
      spin();
      sizeAll();
    }).finally(() => loadingMsg(null)));
  }
  // the surface: NASA's day or night Earth, or a plain sphere in the theme's colour
  function globeSurface() {
    const url = EARTH[ui.gSurface] || null, mat = GL.globeMaterial();
    if (url !== globeUrl) { globeUrl = url; GL.globeImageUrl(url); }
    if (!url) { mat.map = null; mat.color = globeBase; globeBase.set(COL.surface); mat.needsUpdate = true; }
  }
  function renderGlobe() {
    if (!GL || ui.view !== 'map' || !use3d()) return;
    const m = mapData(), tex = ui.gSurface !== 'plain';
    globeSurface();
    GL.showGraticules(ui.gGrid).showAtmosphere(ui.gAtmo).atmosphereColor(COL.hap)
      .polygonsData(ui.gCountries ? REF.world.features : [])
      // over the photograph, countries without testers are clear and the others translucent
      .polygonAltitude(f => m.share.has(f.properties.c) ? .006 + .04 * m.ratio(f.properties.c) / m.max : .004)
      .polygonCapColor(f => m.share.has(f.properties.c) ? (tex ? rgba(COL.share, .12 + .7 * Math.sqrt(m.ratio(f.properties.c) / m.max)) : m.fill(m.ratio(f.properties.c))) : tex ? 'rgba(0,0,0,0)' : COL.raise)
      .polygonSideColor(f => m.share.has(f.properties.c) ? rgba(COL.share, .3) : tex ? 'rgba(0,0,0,0)' : rgba(COL.raise, .6))
      .polygonStrokeColor(f => f.properties.c === me.home ? COL.ned : tex ? 'rgba(255,255,255,0.28)' : rgba(COL.bg, .9))
      .polygonLabel(f => countryTip(f, m))
      .pointLat('lat').pointLng('lon').pointColor(a => m.ageCol(a.year ?? NOW))
      .pointAltitude(a => .02 + .2 * Math.min(1, yrsAgo(a.year ?? NOW) / 15000)).pointLabel(ancientTip)
      .pathPoints('coords').pathPointLat(p => p[1]).pathPointLng(p => p[0]).pathPointAlt(.05).pathResolution(2)
      .pathColor(l => l.flow ? COL.fg : rgba(COL.hap, l.side ? .45 : .9)).pathStroke(l => l.flow ? 3.2 : l.side ? 1.2 : 2)
      .pathLabel(legTip)
      .htmlLat('lat').htmlLng('lon').htmlAltitude(.055).htmlElement(routeMark)
      .ringsData(D.home && !reduced ? [D.home] : []).ringLat('lat').ringLng('lon').ringColor(() => t => rgba(COL.ned, 1 - t)).ringMaxRadius(3.5).ringPropagationSpeed(1.6).ringRepeatPeriod(1600);
    globeTime(m);
    GL.resumeAnimation();
    mapLegend(m);
    if (!povSet) { povSet = true; GL.pointOfView(m.center, reduced ? 0 : 1200); }
  }
  // The parts of the globe that follow the time bar. Each leg is drawn twice: a faint line, and one dash
  // that runs from the older end to the younger, leg after leg in time order.
  function globeTime(m) {
    const n = Math.max(1, m.allLegs.length), flow = reduced ? [] : m.flows;
    GL.pointsData(m.pts).htmlElementsData(m.marks)
      .pathsData([...m.legs, ...flow])
      .pathDashLength(l => l.flow ? .3 : 1).pathDashGap(l => l.flow ? n - .3 : 0)
      .pathDashInitialGap(l => l.flow ? l.k : 0).pathDashAnimateTime(l => l.flow ? 1400 : 0);
    timeBar(m);
  }
  function routeMark(d) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'glabel'; b.setAttribute('aria-label', d.name);
    b.style.cssText = `pointer-events:auto;cursor:pointer;background:none;border:0;padding:0;display:flex;flex-direction:column;align-items:center;gap:2px;font:500 10.5px ${css('--mono')};color:${COL.fg};-webkit-text-stroke:3px ${COL.bg};paint-order:stroke fill;transform:translateY(-8px)`;
    b.innerHTML = `${d.label && ui.gLabels ? `<span>${esc(d.name)}</span>` : ''}<i style="width:7px;height:7px;border-radius:50%;background:${d.name === D.route?.family ? COL.ned : COL.hap};box-shadow:0 0 0 1.5px ${COL.bg};display:block"></i>`;
    b.onclick = () => d.node >= 0 && open('branch', d.node);
    const show = e => { const t = $('#gtip'), r = b.getBoundingClientRect(); t.innerHTML = markTip(d); t.hidden = false; t.style.left = clamp((e?.clientX ?? r.left) + 14, 8, innerWidth - 270) + 'px'; t.style.top = ((e?.clientY ?? r.bottom) + 14) + 'px'; };
    b.onmouseenter = b.onmousemove = show; b.onfocus = () => show();
    b.onmouseleave = b.onblur = () => { $('#gtip').hidden = true; };
    return b;
  }
  const msvg = d3.select('#map'), mroot = msvg.append('g');
  const mzoom = d3.zoom().scaleExtent([1, 14]).on('zoom', e => { mroot.attr('transform', e.transform); mroot.selectAll('circle').attr('r', 4 / Math.sqrt(e.transform.k)); });
  msvg.call(mzoom).on('dblclick.zoom', null).on('dblclick', () => resetView());
  function renderMap2D() {
    const m = mapData();
    mapLegend(m); timeBar(m);
    const { width: w, height: h } = msvg.node().getBoundingClientRect();
    if (!w || !h) return;
    const proj = d3.geoNaturalEarth1().fitExtent([[8, 8], [w - 8, h - 8]], { type: 'Sphere' }), path = d3.geoPath(proj);
    mroot.selectAll('*').remove();
    mroot.append('path').attr('class', 'sphere').attr('d', path({ type: 'Sphere' }));
    if (ui.gGrid) mroot.append('path').attr('class', 'graticule').attr('d', path(d3.geoGraticule10()));
    mroot.append('g').selectAll('path').data(REF.world.features).join('path').attr('class', 'country').attr('d', path)
      .attr('fill', f => ui.gCountries && m.share.has(f.properties.c) ? m.fill(m.ratio(f.properties.c)) : COL.raise)
      .attr('stroke', f => f.properties.c === me.home ? COL.ned : null).attr('stroke-width', f => f.properties.c === me.home ? 1.2 : null)
      .style('cursor', f => m.share.has(f.properties.c) ? 'pointer' : null)
      .on('click', (e, f) => m.share.has(f.properties.c) && open('country', f.properties.c))
      .append('title').text(f => f.properties.n + (m.share.has(f.properties.c) ? `: ${m.share.get(f.properties.c)[2]} of ${m.share.get(f.properties.c)[3]} testers` : ''));
    mroot.append('g').selectAll('path').data(m.legs).join('path').attr('class', a => 'route' + (a.side ? ' side' : '')).attr('d', a => path({ type: 'LineString', coordinates: a.coords }))
      .append('title').text(a => `${a.from} to ${a.to || 'later branches'}, around ${yr(a.year)}`);
    mroot.append('g').selectAll('circle').data(m.pts).join('circle')
      .attr('transform', a => `translate(${proj([a.lon, a.lat])})`).attr('r', 4)
      .attr('fill', a => m.ageCol(a.year ?? NOW)).attr('stroke', COL.bg).attr('stroke-width', .8).style('cursor', 'pointer')
      .on('click', (e, a) => open('ancient', a.n)).append('title').text(a => `${a.id}, ${a.site || a.country}, ${yr(a.year)}`);
    const mk = mroot.append('g').selectAll('g').data(m.marks).join('g').attr('transform', d => `translate(${proj([d.lon, d.lat])})`).style('cursor', 'pointer').on('click', (e, d) => d.node >= 0 && open('branch', d.node));
    mk.append('rect').attr('x', -2.5).attr('y', -2.5).attr('width', 5).attr('height', 5).attr('fill', d => d.name === m.R.family ? COL.ned : COL.hap);
    mk.append('title').text(d => `${d.name}${d.node >= 0 ? ', around ' + yr(d.year) : ''}`);
    if (ui.gLabels) mk.filter(d => d.label).append('text').attr('y', -6).attr('text-anchor', 'middle').attr('font-size', 9).attr('font-family', 'var(--mono)').attr('fill', COL.fg).attr('paint-order', 'stroke').attr('stroke', COL.bg).attr('stroke-width', 3).text(d => d.name);
  }
  // time bar: drag, or Play to run it from the oldest ancestor to today
  let playing = 0, timeQueued = false;
  function setTime(v) {
    tb.v = clamp(Math.round(v), 0, 1000);
    if (timeQueued) return;
    timeQueued = true;
    requestAnimationFrame(() => { timeQueued = false; if (ui.view !== 'map') return; if (use3d() && GL) globeTime(mapData()); else renderMap2D(); });
  }
  function stopPlay() { cancelAnimationFrame(playing); playing = 0; $('#play').textContent = 'Play'; $('#play').setAttribute('aria-pressed', 'false'); }
  $('#year').addEventListener('input', e => { stopPlay(); setTime(+e.target.value); });
  $('#play').addEventListener('click', () => {
    if (playing) return stopPlay();
    const v0 = tb.v >= 1000 ? 0 : tb.v, t0 = performance.now();
    $('#play').textContent = 'Pause'; $('#play').setAttribute('aria-pressed', 'true');
    const step = t => { const v = v0 + (t - t0) / 16; setTime(v); if (v < 1000) playing = requestAnimationFrame(step); else stopPlay(); };
    playing = requestAnimationFrame(step);
  });
  // Reset view: frame the whole graph or globe again (button, R key, double-click on empty space)
  function resetView() {
    const ms = reduced ? 0 : 700;
    if (ui.view === 'map') { if (use3d()) GL?.pointOfView(mapData().center, ms); else msvg.transition().duration(ms).call(mzoom.transform, d3.zoomIdentity); }
    else if (ui.view === 'net' || ui.view === 'time') { if (use3d()) FG3?.reset(ms); else fit(); }
  }
  function sizeAll() {
    const st = $('#stage'), w = st.clientWidth, h = st.clientHeight;
    if (!w || !h) return;
    FG3?.size(w, h);
    if (GL) GL.width(w).height(h);
  }

  /* ---------- genome view ---------- */
  function ymap(ticks, label, h = 48) {
    const W = 600, x = p => 10 + (W - 20) * p / YLEN;
    const seg = (a, b, fill, extra = '') => `<rect x="${x(a)}" y="14" width="${x(b) - x(a)}" height="12" fill="${fill}" ${extra}/>`;
    return `<svg class="ymap" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(label)}">
      <defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--raise)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--line)" stroke-width="2"/></pattern></defs>
      ${seg(0, YLEN, 'var(--raise)', 'rx="6"')}${seg(0, 2781479, 'var(--line)', 'rx="6"')}${seg(26600000, 56887902, 'url(#hatch)')}${seg(56887902, YLEN, 'var(--line)', 'rx="6"')}
      <path d="M${x(10300000)} 13 L${x(10450000)} 20 L${x(10600000)} 13 M${x(10300000)} 27 L${x(10450000)} 20 L${x(10600000)} 27" stroke="var(--bg)" stroke-width="3" fill="none"/>
      ${ticks.map(([p, c, y1 = 10, y2 = 30]) => `<line x1="${x(p)}" x2="${x(p)}" y1="${y1}" y2="${y2}" stroke="${c}" stroke-width="1.5"/>`).join('')}
      <text x="${x(0)}" y="${h - 4}">PAR1</text><text x="${x(10450000)}" y="${h - 4}" text-anchor="middle">centromere</text><text x="${x(18000000)}" y="${h - 4}" text-anchor="middle">Yq11</text><text x="${x(41700000)}" y="${h - 4}" text-anchor="middle">Yq12, repeats, not read</text><text x="${x(YLEN)}" y="${h - 4}" text-anchor="end">57 Mb</text></svg>`;
  }
  function renderGenome() {
    const el = $('#v-genome'), A = me.auto;
    const yt = [];
    if (D.place) D.line.forEach(i => { (D.place.der.get(i) || []).forEach(k => yt.push([T.chip[k][0], BASE[T.chip[k][2][1]], 10, 30])); (D.place.anc.get(i) || []).forEach(k => yt.push([T.chip[k][0], COL.muted, 10, 30])); });
    Object.entries(SR.info).forEach(([n, i]) => (i.p || []).forEach(p => yt.push([p, DYE[STR.bases.find(b => b.n === n).panel - 1], 2, 12])));
    let html = `<div class="page"><h2>Y chromosome${q('ychrom')}</h2>
      <p>Long ticks are your SNP${q('snp')} calls on your line, coloured by the new base, or grey where you read the old one. Short ticks above are the STR${q('str')} markers, coloured by panel. Positions are GRCh38${q('build')}; the solid ends are the PAR${q('par')}, the hatched stretch is repeats no test reads.</p>
      ${ymap(yt, 'Your Y chromosome', 52)}
      <ul class="facts">${FACTS.y.map(([t, s]) => `<li>${esc(t)}<br><span class="note">${srcs(s)}</span></li>`).join('')}</ul>`;
    if (!A) {
      el.innerHTML = html + `<h2>Autosomes and X</h2><div class="empty"><b>Add an autosomal raw file to see your other chromosomes</b>A raw data download from FamilyTreeDNA (Family Finder, the autosomal file), 23andMe, AncestryDNA, MyHeritage or Living DNA. Silsila reads it in this browser and keeps only summaries: SNP density, heterozygosity${q('het')}, runs of homozygosity${q('roh')} and a set of well-studied trait SNPs. With it you can also compare your DNA with a relative's. <button class="link" data-act="import">Add files</button></div></div>`;
      return;
    }
    const chroms = Object.keys(G.LEN37).filter(c => A.stats[c]);
    const called = A.rows - A.nocall, autos = chroms.filter(c => c !== 'X');
    const het = autos.reduce((s, c) => s + A.stats[c].het, 0) / autos.reduce((s, c) => s + A.stats[c].snps - A.stats[c].nocall, 0);
    const rohAll = autos.flatMap(c => (A.roh[c] || []).map(s => ({ ...s, c })));
    const sum = min => rohAll.filter(s => s.end - s.start >= min).reduce((t, s) => t + s.end - s.start, 0);
    const autoLen = autos.reduce((s, c) => s + G.LEN37[c], 0), F = sum(1.5e6) / autoLen, R = G.autoRecords(A);
    html += `<h2>Autosomes and X</h2><p class="note">${esc(A.file)}${A.vendor && A.vendor !== 'unknown' ? ' (' + esc(A.vendor) + ')' : ''} · ${num(A.rows)} SNPs, ${pct(called / A.rows)} called · positions GRCh37${q('build')}</p>
      <ul class="facts">
        <li><b>${pct(het)}</b>of your called autosomal SNPs are heterozygous${q('het')}</li>
        <li><b>${(sum(1e6) / 1e6).toFixed(1)} Mb</b>in ${rohAll.length} runs of homozygosity${q('roh')} of 1 Mb or more, ${(sum(5e6) / 1e6).toFixed(1)} Mb of it in runs of 5 Mb or more</li>
        ${R.longest ? `<li><b>${((R.longest.end - R.longest.start) / 1e6).toFixed(1)} Mb</b>your longest run, on chromosome ${esc(R.longest.c)}</li>` : ''}
        ${R.most ? `<li><b>Chromosome ${esc(R.most.c)}</b>your most varied, ${pct(R.most.rate)} heterozygous; the least is chromosome ${esc(R.least.c)} at ${pct(R.least.rate)}</li>` : ''}
        <li><b>${pct(A.stats.X?.hetRate || 0)}</b>of X calls heterozygous${A.stats.X && A.stats.X.hetRate < .01 ? ': one X chromosome, as in most men' : A.stats.X ? ': two X chromosomes, as in most women' : ''}</li>
      </ul>
      <p class="measure">Long stretches where both copies are identical come from an ancestor your two parents share. ${pct(F)} of your autosomes lie in runs of 1.5 Mb or more. For comparison, the expected share for a child of ${G.INBREEDING.map(([r, f]) => `${r} is ${pct(f)}`).join(', ')}. Shorter runs build up in any population with a long history of marrying within a community, so a small amount says little about recent family.</p>`;
    const W = 1000, rowH = 22, x0 = 40, scale = (W - x0 - 10) / G.LEN37[1];
    const hcol = d3.scaleSequential(d3.interpolateViridis).domain([0, .4]);
    html += `<svg class="genome" viewBox="0 0 ${W} ${chroms.length * rowH + 30}" style="width:100%;display:block;margin-top:10px" role="img" aria-label="Chromosome heterozygosity and runs of homozygosity">
      ${chroms.map((c, r) => { const s = A.stats[c], y = r * rowH + 4;
        return `<g class="chrom" data-chrom="${c}" tabindex="0" role="button" aria-label="Chromosome ${c}"><text x="${x0 - 8}" y="${y + 12}" text-anchor="end">${c}</text>
          <rect class="outline" x="${x0}" y="${y + 3}" width="${G.LEN37[c] * scale}" height="12" rx="3" fill="var(--raise)" stroke="var(--line)"/>
          ${s.bins.map((b, k) => b[0] ? `<rect x="${x0 + k * 1e6 * scale}" y="${y + 3}" width="${Math.max(1e6 * scale, 1)}" height="12" fill="${hcol(b[1] / b[0])}"/>` : '').join('')}
          ${(A.roh[c] || []).map(g => `<rect x="${x0 + g.start * scale}" y="${y + 1}" width="${Math.max((g.end - g.start) * scale, 2)}" height="16" fill="none" stroke="var(--pet)" stroke-width="2" rx="2"/>`).join('')}</g>`; }).join('')}
      <text x="${x0}" y="${chroms.length * rowH + 22}">colour: share of heterozygous SNPs per Mb, dark low to yellow high · red outline: run of homozygosity of 1 Mb or more · click a chromosome</text></svg>`;
    html += traitsHtml(A) + compareHtml() + '</div>';
    el.innerHTML = html;
    compareWire(el);
    el.querySelectorAll('[data-chrom]').forEach(g => { const go_ = () => open('chrom', g.dataset.chrom); g.onclick = go_; g.onkeydown = e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go_()); });
  }

  // Trait SNPs, with the variants of one trait (lactase persistence, bitter taste) read together.
  function traitsHtml(A) {
    const tr = G.traits(A.rs || {}, NOTES.traits), done = new Set();
    const row = t => `<tr><td>${esc(t.gene)}</td><td>${esc(t.trait)}</td><td>${esc(t.id)}</td><td class="num">${esc(t.gt || '–')}</td><td class="wrap">${esc(t.text)}${t.pop ? `<span class="sub note">${esc(t.pop)}</span>` : ''}</td><td>${srcs(t.src)}</td></tr>`;
    let body = '';
    for (const t of tr) {
      if (!t.group) { body += row(t); continue; }
      if (done.has(t.group)) continue;
      done.add(t.group);
      const rows = tr.filter(x => x.group === t.group), g = G.traitGroup(rows), info = NOTES.traitGroups?.[t.group] || {};
      const short = r => (r.trait.match(/\(([^)]+)\)\s*$/) || [, r.trait.replace(/^.*?,\s*/, '')])[1];
      const summary = !g.read.length ? `None of these variants is on this chip, so it says nothing either way.`
        : g.carried.length ? `${info.carried || 'You carry:'} ${g.carried.map(r => `${short(r)} (${r.n === 2 ? 'two copies' : 'one copy'})`).join(', ')}.`
        : `${info.none || 'No copy of the variants read.'}`;
      body += `<tr><td colspan="6" style="white-space:normal"><b>${esc(info.name || t.group)}</b>: ${esc(summary)} ${g.missing.length ? `<span class="note">Not on this chip: ${g.missing.map(r => esc(short(r) + ' (' + r.id + ')')).join(', ')}.</span>` : ''}${info.text ? `<span class="sub note">${esc(info.text)}</span>` : ''}</td></tr>` + rows.map(row).join('');
    }
    return `<h2>Trait SNPs</h2>
      <p class="note measure">A few variants with well-replicated effects, chosen from studies in different parts of the world. None of them are medical, and each describes a tendency in the populations studied, so a reading can miss for one person; where a study looked mostly at one population, the reading says so. Alleles are on the plus strand, checked against dbSNP.</p>
      <div class="twrap"><table class="db static"><thead><tr><th>Gene</th><th>Trait</th><th>SNP</th><th>You</th><th>Reading</th><th>Source</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  /* ---------- comparing with a relative ---------- */
  // Kept in memory for this visit only: neither person's genotypes nor the result are stored.
  let GENO = null, CMP = null;
  const CMPOPT = { minCM: 7, minSnps: 500 };
  const gmapCM = REF.gmap ? G.GeneticMap(REF.gmap) : null;
  function compareHtml() {
    const scp = FACTS.scp;
    let h = `<h2 id="cmpHead">Compare with a relative${q('cm')}</h2>
      <p class="measure">Add a relative's raw file (from any of the five companies) to find the stretches of DNA you share, the way GEDmatch's one-to-one comparison does: a half-identical segment is a run of SNPs where you two never carry opposite letters, so one of your copies may come from the same ancestor. Segments are measured in centimorgans with a genetic map${q('cm')}. Both files are read in this browser; nothing is kept after you close the page.</p>
      <div class="cmpform">
        ${GENO ? `<span class="note">Yours: ${esc(GENO.file)}</span>` : `<label>Your autosomal file<input type="file" id="cmpMine" accept=".csv,.gz,.txt,.tsv,.zip"></label>`}
        <label>Your relative's file<input type="file" id="cmpTheirs" accept=".csv,.gz,.txt,.tsv,.zip"></label>
        <label>Minimum cM<input type="number" id="cmpCM" min="1" max="50" step="0.5" value="${CMPOPT.minCM}"></label>
        <label>Minimum SNPs<input type="number" id="cmpSnps" min="50" max="5000" step="50" value="${CMPOPT.minSnps}"></label>
        ${CMP ? `<button type="button" class="btn small" id="cmpRedo">Recompare</button>` : ''}
      </div><p class="note" id="cmpLog" aria-live="polite"></p>`;
    if (!CMP?.res) return h;
    const r = CMP.res, rel = scp ? G.relationships(r.half, scp.table) : [];
    const lg = r.longest;
    h += `<ul class="facts">
        <li><b>${num(Math.round(r.half))} cM</b>shared on the autosomes in ${r.segments} half-identical segments of ${CMP.opt.minCM} cM and ${num(CMP.opt.minSnps)} SNPs or more</li>
        <li><b>${lg ? lg.cm.toFixed(1) + ' cM' : 'none'}</b>${lg ? `the longest segment, on chromosome ${esc(lg.c)}` : 'no segment reaches the thresholds'}</li>
        <li><b>${num(Math.round(r.full))} cM</b>fully identical: both copies match. Full siblings usually share several hundred cM this way; parents and children, half siblings and most other relatives share almost none.</li>
        <li><b>${r.x ? r.x.toFixed(1) + ' cM' : 'none'}</b>shared on the X, counted apart as the matching sites do</li>
        <li><b>${num(r.snps)}</b>SNPs both files read on the autosomes${r.snps < 150000 ? '. That is few: the two chips overlap little, so short segments can be missed or invented; raise the minimum SNPs to be safe.' : ''}</li>
      </ul>`;
    h += `<h3 class="sec">Possible relationships</h3>` + (rel.length ? `<div class="twrap"><table class="db static"><thead><tr><th>Relationship</th><th>Average cM</th><th>Range</th></tr></thead><tbody>${rel.slice(0, 8).map(x => `<tr><td>${esc(x[0])}</td><td class="num">${num(x[1])}</td><td class="num">${num(x[2])} to ${num(x[3])}</td></tr>`).join('')}</tbody></table></div>`
      : `<p>${r.half < 10 ? 'Too little shared DNA to suggest a relationship: most likely distant or unrelated.' : 'No relationship in the table has a range that includes this total.'}</p>`) +
      (scp ? `<p class="note">Ranges from ${srcs([scp.src])} (${esc(scp.licence)}). They overlap a good deal, so the total narrows the possibilities rather than naming one; the age of each person and the family tree decide.</p>` : '');
    h += chromBrowser(r) + `<p class="note">Segments are listed in Database, Shared segments, and can be downloaded as CSV. Map: ${esc(REF.gmap.source)}.</p>`;
    return h;
  }
  // The chromosome browser: every autosome and the X with the shared segments drawn along it.
  function chromBrowser(r) {
    const chroms = Object.keys(G.LEN37).filter(c => r.chroms[c]), W = 1000, rowH = 22, x0 = 40, scale = (W - x0 - 10) / G.LEN37[1];
    const seg = (c, g, y, hgt, fill) => `<rect x="${x0 + g.start * scale}" y="${y}" width="${Math.max((g.end - g.start) * scale, 2)}" height="${hgt}" fill="${fill}" rx="2"><title>Chromosome ${c}: ${num(g.start)} to ${num(g.end)}, ${g.cm.toFixed(1)} cM, ${num(g.snps)} SNPs</title></rect>`;
    return `<svg class="genome" viewBox="0 0 ${W} ${chroms.length * rowH + 30}" style="width:100%;display:block;margin-top:10px" role="img" aria-label="Shared segments on each chromosome">
      ${chroms.map((c, k) => { const y = k * rowH + 4, x = r.chroms[c];
        return `<g><text x="${x0 - 8}" y="${y + 12}" text-anchor="end">${c}</text><rect x="${x0}" y="${y + 3}" width="${G.LEN37[c] * scale}" height="12" rx="3" fill="var(--raise)" stroke="var(--line)"/>
          ${x.half.map(g => seg(c, g, y + 3, 12, COL.hap)).join('')}${x.full.map(g => seg(c, g, y + 6, 6, COL.ned)).join('')}</g>`; }).join('')}
      <text x="${x0}" y="${chroms.length * rowH + 22}">teal: half identical · yellow inside: fully identical · hover a segment for its position and length</text></svg>`;
  }
  function compareWire(el) {
    const run = async () => {
      const lg = $('#cmpLog'), mine = $('#cmpMine')?.files?.[0], theirs = $('#cmpTheirs')?.files?.[0];
      CMPOPT.minCM = clamp(+$('#cmpCM').value || 7, 1, 50); CMPOPT.minSnps = clamp(Math.round(+$('#cmpSnps').value || 500), 50, 5000);
      try {
        if (mine) { lg.textContent = 'Reading your file…'; const t = await readText(mine), g = G.parseGenotypes(t, null); if (autosOf(g).length < 10) throw new Error(mine.name + ' has no autosomes'); GENO = { file: mine.name, vendor: G.vendor(t).name, chroms: g.chroms }; }
        if (theirs) { lg.textContent = 'Reading your relative\'s file…'; const t = await readText(theirs), g = G.parseGenotypes(t, null); if (autosOf(g).length < 10) throw new Error(theirs.name + ' has no autosomes'); CMP = { file: theirs.name, vendor: G.vendor(t).name, chroms: g.chroms }; }
        if (!GENO || !CMP?.chroms) { lg.textContent = GENO ? 'Now add your relative\'s file.' : 'Add your own autosomal file as well.'; return; }
        lg.textContent = 'Comparing…';
        await new Promise(r => setTimeout(r, 20));
        CMP.opt = { ...CMPOPT }; CMP.res = G.compare(GENO.chroms, CMP.chroms, gmapCM, CMP.opt);
        renderGenome(); renderBar(); const hd = $('#cmpHead'); if (hd) $('#v-genome').scrollTop = hd.offsetTop - 12;
        toast(`${num(Math.round(CMP.res.half))} cM shared in ${CMP.res.segments} segments.`);
      } catch (err) { lg.textContent = 'Could not compare: ' + err.message; }
    };
    for (const id of ['#cmpMine', '#cmpTheirs']) { const i = el.querySelector(id); if (i) i.onchange = run; }
    const redo = el.querySelector('#cmpRedo'); if (redo) redo.onclick = run;
  }

  /* ---------- database ---------- */
  const tbl = { q: '', sort: null, dir: 1, limit: 200 };
  const C = (key, label, o = {}) => ({ key, label, ...o });
  const TABLES = {
    line: {
      label: 'Your line', rows: () => D.line.map((i, k) => { const a = age(i); return { i, k, name: T.names[i], yfull: T.yfull(i)?.[0] || '', tmrca: a?.tmrca, ya: a ? yrsAgo(a.tmrca) : null, gen: a ? gens(a.tmrca).n : null, src: a?.src || '',
        testers: T.subtreeKits(i), pos: D.place?.der.get(i)?.length || 0, neg: D.place?.anc.get(i)?.length || 0, ancient: D.ancient.filter(x => x.meet === i).length }; }),
      cols: [C('k', 'Step', { num: 1 }), C('name', 'Branch', { help: 'branch' }), C('yfull', 'YFull'), C('tmrca', 'Common ancestor', { num: 1, fmt: yr, help: 'tmrca' }), C('ya', 'Years ago', { num: 1, fmt: rnd }), C('gen', 'Generations', { num: 1, fmt: num, help: 'generation' }), C('src', 'Age from'), C('testers', 'Testers', { num: 1, fmt: num, help: 'testers' }), C('pos', 'Your +', { num: 1, help: 'calls' }), C('neg', 'Your −', { num: 1 }), C('ancient', 'Ancient', { num: 1, help: 'ancient' })],
      open: r => open('branch', r.i), note: 'Add your Y file, or search a branch and choose "Show this line".',
    },
    branches: {
      label: 'All branches', note: 'Type at least two characters to search all branches of the FamilyTreeDNA tree.',
      rows: () => { const s = tbl.q.trim().toUpperCase(); if (s.length < 2) return []; const out = []; for (let i = 0; i < T.n && out.length < 5000; i++) if (T.names[i].toUpperCase().includes(s)) out.push({ i, name: T.names[i], parent: T.parent[i] >= 0 ? T.names[T.parent[i]] : '', kids: T.children(i).length, testers: T.subtreeKits(i), tmrca: age(i)?.tmrca, yfull: T.yfull(i)?.[0] || '' }); return out; },
      cols: [C('name', 'Branch', { help: 'branch' }), C('parent', 'Parent'), C('yfull', 'YFull'), C('tmrca', 'Common ancestor', { num: 1, fmt: yr, help: 'tmrca' }), C('kids', 'Branches', { num: 1 }), C('testers', 'Testers', { num: 1, fmt: num })],
      open: r => open('branch', r.i), selfFilter: true,
    },
    snps: {
      label: 'Y SNPs',
      rows: () => D.place ? G.snpStatus(D.place, T, D.calls).map(r => ({ ...r, branch: T.names[r.node], change: r.anc + '→' + r.der })) : T.chip.map((r, k) => ({ k, name: r[3], pos: r[0], change: r[2][0] + '→' + r[2][1], region: r[4], branch: T.names[r[1]], call: '', status: 'no data' })),
      cols: [C('name', 'SNP', { help: 'snp' }), C('pos', 'Position', { num: 1, fmt: num, help: 'build' }), C('region', 'Band', { help: 'band' }), C('change', 'Change', { help: 'derived' }), C('branch', 'Branch'), C('call', 'You'), C('status', 'What it says', { help: 'calls' })],
      open: r => open('snp', r.k),
    },
    str: {
      label: 'STR markers',
      rows: () => STR.ids.map((id, k) => { const b = baseOf(id), i = SR.info[b.n] || {};
        return { id, k: k + 1, panel: PANEL_RANGE[b.panel - 1], val: STR.value(me.str || {}, id), rate: i.r, src: i.rs, motif: i.m || (i.unit ? i.unit + '-base' : ''), pos: i.p?.[b.copies > 1 ? 'abcd'.indexOf(id.slice(-1)) : 0] ?? i.p?.[0], arm: i.arm, fast: i.fast ? 'yes' : '' }; }),
      cols: [C('k', '#', { num: 1 }), C('id', 'Marker', { help: 'str' }), C('panel', 'Panel', { help: 'panel' }), C('val', 'You', { num: 1 }), C('rate', 'Rate / gen', { num: 1, fmt: v => v ? v.toFixed(5) : '', help: 'rate' }), C('src', 'Rate from'), C('fast', 'FTDNA fast'), C('motif', 'Repeat'), C('arm', 'Arm'), C('pos', 'Position', { num: 1, fmt: num })],
      open: r => open('marker', r.id),
    },
    ancient: {
      label: 'Ancient',
      rows: () => D.ancient.filter(a => !ui.allAnc ? onLine(a) : true).map(a => ({ ...a, shared: a.meet >= 0 ? T.names[a.meet] : '', sharedAge: a.meet >= 0 ? age(a.meet)?.tmrca : null })),
      cols: [C('id', 'Sample', { help: 'ancient' }), C('year', 'Lived', { num: 1, fmt: (v, r) => r.present ? 'present-day' : yr(v) }), C('site', 'Site'), C('country', 'Country'), C('culture', 'Group'), C('call', 'Branch'), C('shared', 'Shared with you'), C('sharedAge', 'Shared ancestor', { num: 1, fmt: yr, help: 'tmrca' }), C('pub', 'Publication'), C('src', 'Source')],
      open: r => open('ancient', r.n), toggle: ['allAnc', 'Include samples not on your line'], note: 'No ancient men share this line yet.',
    },
    famous: {
      label: 'Notables', rows: () => D.famous.map(f => ({ ...f, shared: T.names[f.meet], sharedAge: age(f.meet)?.tmrca })),
      cols: [C('name', 'Name'), C('category', 'Category'), C('country', 'Country'), C('y', 'Their branch'), C('shared', 'Shared with you'), C('sharedAge', 'Shared ancestor', { num: 1, fmt: yr, help: 'tmrca' })],
      open: r => open('famous', r.n), note: 'From FamilyTreeDNA Discover, for lines with saved data (tools/enrich.py).',
    },
    countries: {
      label: 'Countries',
      rows: () => Object.entries(D.enr?.countries || {}).flatMap(([n, rows]) => rows.map(([name, code, count, total]) => ({ branch: n, name, code, count, total, share: count / total }))),
      cols: [C('branch', 'Branch'), C('name', 'Country'), C('count', 'Testers', { num: 1, fmt: num, help: 'testers' }), C('total', 'All testers', { num: 1, fmt: num }), C('share', 'Share', { num: 1, fmt: pct })],
      open: r => open('branch', T.find(r.branch)), note: 'FamilyTreeDNA testers by paternal country, not population samples. Needs saved Discover data (tools/enrich.py).',
    },
    events: {
      label: 'History',
      rows: () => EVENTS.map((e, n) => { const L = D.line.length ? lineAt(e[0]) : { older: -1 }; return { n, year: e[0], when: e[1], name: e[3], region: e[4], ya: yrsAgo(e[0]), gen: gens(e[0]).n, then: L.older >= 0 ? T.names[L.older] : '', src: e[5][0] }; }),
      cols: [C('year', 'When', { num: 1, fmt: (v, r) => r.when }), C('name', 'Event'), C('region', 'Region'), C('ya', 'Years ago', { num: 1, fmt: rnd }), C('gen', 'Generations', { num: 1, fmt: num, help: 'generation' }), C('then', 'Your line had reached'), C('src', 'Source')],
      open: r => open('event', r.n),
    },
    matches: {
      label: 'Matches', rows: () => D.matches.map(m => ({ ...m, meetName: m.meet >= 0 ? T.names[m.meet] : '' })),
      cols: [C('name', 'Name'), C('kind', 'Test', { fmt: v => v === 'y' ? 'Y-DNA' : 'Family Finder' }), C('gd', 'GD', { num: 1, help: 'gd' }), C('shared', 'cM', { num: 1, help: 'cm' }), C('longest', 'Longest', { num: 1 }), C('range', 'Relationship'), C('hap', 'Y haplogroup'), C('meetName', 'Y line meets yours at'), C('eka', 'Earliest ancestor')],
      open: r => open('match', r.id), note: 'Add the Y-DNA or Family Finder matches CSV (Export CSV on the matches page).',
    },
    chroms: {
      label: 'Chromosomes', rows: () => me.auto ? Object.keys(G.LEN37).filter(c => me.auto.stats[c]).map(c => { const s = me.auto.stats[c], r = me.auto.roh[c] || []; return { c, snps: s.snps, nocall: s.nocall, het: s.hetRate, roh: r.length, rohMb: r.reduce((t, g) => t + g.end - g.start, 0) / 1e6 }; }) : [],
      cols: [C('c', 'Chromosome'), C('snps', 'SNPs', { num: 1, fmt: num }), C('nocall', 'No call', { num: 1, fmt: num }), C('het', 'Heterozygous', { num: 1, fmt: pct, help: 'het' }), C('roh', 'Runs ≥ 1 Mb', { num: 1, help: 'roh' }), C('rohMb', 'Run length (Mb)', { num: 1, fmt: v => v.toFixed(1) })],
      open: r => open('chrom', r.c), note: 'Add an autosomal raw file to fill this table.',
    },
    segments: {
      label: 'Shared segments', rows: () => CMP?.res ? Object.entries(CMP.res.chroms).flatMap(([c, x]) => [...x.half.map(g => ({ c, kind: 'half identical', ...g })), ...x.full.map(g => ({ c, kind: 'fully identical', ...g }))]) : [],
      cols: [C('c', 'Chromosome'), C('kind', 'Kind'), C('start', 'Start', { num: 1, fmt: num }), C('end', 'End', { num: 1, fmt: num }), C('cm', 'cM', { num: 1, fmt: v => v.toFixed(1), help: 'cm' }), C('snps', 'SNPs', { num: 1, fmt: num })],
      open: () => setView('genome'), note: 'Compare with a relative in the Genome view to fill this table. It is kept only until the page closes.',
    },
    roh: {
      label: 'Runs of homozygosity', rows: () => me.auto ? Object.entries(me.auto.roh).flatMap(([c, segs]) => segs.map(s => ({ c, start: s.start, end: s.end, mb: (s.end - s.start) / 1e6, snps: s.snps }))) : [],
      cols: [C('c', 'Chromosome'), C('start', 'Start', { num: 1, fmt: num }), C('end', 'End', { num: 1, fmt: num }), C('mb', 'Length (Mb)', { num: 1, fmt: v => v.toFixed(2) }), C('snps', 'SNPs', { num: 1, fmt: num })],
      open: r => open('chrom', r.c), note: 'Add an autosomal raw file to fill this table.',
    },
  };
  function renderDb() {
    const el = $('#v-db'), spec = TABLES[ui.db] || TABLES.line;
    const counts = Object.fromEntries(Object.entries(TABLES).map(([k, t]) => [k, k === 'branches' ? T.n : t.rows().length]));
    let rows = spec.rows();
    const s = tbl.q.trim().toLowerCase();
    if (s && !spec.selfFilter) rows = rows.filter(r => spec.cols.some(c => String(r[c.key] ?? '').toLowerCase().includes(s)));
    if (tbl.sort) { const c = spec.cols.find(x => x.key === tbl.sort); if (c) rows = rows.slice().sort((a, b) => { const x = a[c.key], y = b[c.key]; return (x == null || x === '') - (y == null || y === '') || (c.num ? (x - y) : String(x).localeCompare(String(y))) * tbl.dir; }); }
    const cell = (c, r) => { const v = r[c.key]; return c.fmt ? (v == null || v === '' ? '' : c.fmt(v, r)) : v ?? ''; };
    el.innerHTML = `<div class="dbtabs" role="tablist" aria-label="Tables">${Object.entries(TABLES).map(([k, t]) => `<button role="tab" data-tab="${k}" aria-selected="${k === ui.db}">${esc(t.label)} <small>${num(counts[k])}</small></button>`).join('')}</div>
      <div class="tbar"><input type="search" id="tq" placeholder="Filter" value="${esc(tbl.q)}" aria-label="Filter rows"><span class="count">${num(rows.length)} rows${rows.length > tbl.limit ? `, showing ${num(tbl.limit)}` : ''}</span>
      ${spec.toggle ? `<label class="chip"><input type="checkbox" id="ttog" ${ui[spec.toggle[0]] ? 'checked' : ''}> ${esc(spec.toggle[1])}</label>` : ''}
      <button class="btn small" id="tcopy">Copy CSV</button><button class="btn small" id="tdown">Download CSV</button></div>
      ${!rows.length ? `<div class="empty"><b>Nothing here yet</b>${esc(spec.note || 'No rows match.')}</div>` : `<div class="twrap"><table class="db"><thead><tr>${spec.cols.map(c => `<th data-sort="${c.key}" ${tbl.sort === c.key ? `aria-sort="${tbl.dir > 0 ? 'ascending' : 'descending'}"` : ''}>${esc(c.label)}${c.help ? q(c.help) : ''}${tbl.sort === c.key ? (tbl.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead>
      <tbody>${rows.slice(0, tbl.limit).map((r, n) => `<tr data-row="${n}" tabindex="0">${spec.cols.map(c => `<td class="${c.num ? 'num' : ''}">${esc(cell(c, r))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${rows.length > tbl.limit ? `<button class="btn more" id="tmore" style="margin-top:10px">Show ${num(Math.min(1000, rows.length - tbl.limit))} more</button>` : ''}
      ${spec.note && rows.length ? `<p class="note" style="margin-top:8px">${esc(spec.note)}</p>` : ''}`}`;
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { ui.db = b.dataset.tab; tbl.q = ''; tbl.sort = null; tbl.limit = 200; saveUi(); renderDb(); });
    const tq = $('#tq'); tq.oninput = () => { tbl.q = tq.value; tbl.limit = 200; renderDb(); const t = $('#tq'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); };
    el.querySelectorAll('[data-sort]').forEach(th => th.onclick = e => { if (e.target.closest('.q')) return; tbl.dir = tbl.sort === th.dataset.sort ? -tbl.dir : 1; tbl.sort = th.dataset.sort; renderDb(); });
    el.querySelectorAll('[data-row]').forEach(tr => { const go_ = () => spec.open(rows[+tr.dataset.row]); tr.onclick = go_; tr.onkeydown = e => e.key === 'Enter' && go_(); });
    const more = $('#tmore'); if (more) more.onclick = () => { tbl.limit += 1000; renderDb(); };
    const tog = $('#ttog'); if (tog) tog.onchange = () => { ui[spec.toggle[0]] = tog.checked; saveUi(); renderDb(); };
    const csv = () => G.toCSV([spec.cols.map(c => c.label), ...rows.map(r => spec.cols.map(c => cell(c, r)))]);
    $('#tcopy').onclick = () => navigator.clipboard.writeText(csv()).then(() => toast('Copied ' + num(rows.length) + ' rows.'), () => toast('This browser would not allow copying.'));
    $('#tdown').onclick = () => download(`silsila-${ui.db}.csv`, csv(), 'text/csv');
  }
  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- help view ---------- */
  // What sites such as dnagenics show that Silsila leaves out until there is data to do it properly.
  function notIncluded() {
    const n = NOTES.notIncluded;
    return n ? `<h2>Not included yet</h2>${n.map(([h, p, s]) => `<h3 class="sec" style="margin-top:12px">${esc(h)}</h3><p class="measure">${esc(p)}${s ? ` <span class="note">${srcs(s)}</span>` : ''}</p>`).join('')}` : '';
  }
  function renderHelp() {
    const terms = Object.entries(FACTS.glossary).sort((a, b) => a[1][0].localeCompare(b[1][0]));
    const guide = [
      ['Net', 'Your paternal line from the first modern humans to your branch, with your SNPs, ancient men, notable families, the 111 STR markers and your matches hanging off it. Click any sphere: the camera flies to it, its links light up and the panel explains it.'],
      ['Timeline', 'The same network laid along time. Each ancestor sits at the date of his common ancestor on a log scale, so the last thousand years get as much room as the ten thousand before them. The sand-coloured marks along the top are events in history; click one to see which of your ancestors lived then.'],
      ['Map', 'A globe with NASA\'s day or night Earth. Countries brighten with the share of their testers on a branch you pick. Points are ancient men on your line, taller and darker the older they are. The teal line is the route FamilyTreeDNA reconstructs for your line, with a dash running along it from the oldest ancestor to the youngest. The time bar, or Play, walks through it: legs and ancient men appear as their dates pass. Hover anything for its name and date.'],
      ['Genome', 'Your Y chromosome with every SNP and STR position and a few facts about it. With an autosomal file: all 22 autosomes and the X, heterozygosity, runs of homozygosity, trait SNPs, and a comparison with a relative\'s file that finds the segments you share and suggests how you may be related.'],
      ['Database', 'Every table behind the views, including the history list, filterable, sortable and downloadable as CSV.'],
      ['View and reset', 'Reset view, the R key or a double-click on empty space frames everything again. The View menu sets labels, node size, how far the network spreads, link particles, auto-rotate and, on the Timeline, a log or linear time scale; on the Map it switches layers and the Earth image. The theme switch at the top has Dark, Dim, Light and High contrast.'],
      ['3D or 2D', 'The 3D views need WebGL. 2D in the View menu draws flat versions, which also work from the keyboard: Tab to a node and press Enter.'],
    ];
    const sources = [
      ['FamilyTreeDNA public haplotree', 'https://www.familytreedna.com/public/y-dna-haplotree/', 'the Y tree, SNP names and positions, tester counts'],
      ['FamilyTreeDNA Discover', 'https://discover.familytreedna.com/', 'ages, ancient placements, notable lines, countries and the migration route, saved by tools/enrich.py'],
      ['YFull YTree', 'https://github.com/YFullTeam/YTree', 'ages for the whole tree (CC BY 4.0)'],
      ['Allen Ancient DNA Resource', 'https://doi.org/10.7910/DVN/FFIDCW', `ancient and present-day reference samples (${esc(REF.ancient.source)})`],
      ['Natural Earth', 'https://www.naturalearthdata.com/', 'country shapes (public domain)'],
      ['YHRD, Chandler 2006, Burgarella and Navascués 2011', 'https://yhrd.org/pages/resources/mutation_rates', 'STR mutation rates, cited per marker'],
      ['YBrowse', 'https://ybrowse.org/', 'STR positions'],
      ['Wikipedia and the papers cited beside each fact', 'https://en.wikipedia.org/', 'dates of historical events, Y chromosome facts and haplogroup notes'],
      ['dbSNP', 'https://www.ncbi.nlm.nih.gov/snp/', 'alleles and positions of the trait SNPs, each cited to its study'],
      ['UCSC liftOver chain, GRCh38 to GRCh37', 'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/liftOver/', 'GRCh37 positions for the Y SNPs, so files from 23andMe, AncestryDNA, MyHeritage and Living DNA place too'],
      ['HapMap Phase II genetic map, GRCh37, from the Beagle project', 'https://bochet.gcc.biostat.washington.edu/beagle/genetic_maps/', 'centimorgans for the comparison with a relative (International HapMap Consortium 2007, doi:10.1038/nature06258)'],
      ...(FACTS.scp ? [[FACTS.scp.src[0], FACTS.scp.src[1], `relationship ranges by shared cM (${FACTS.scp.licence})`]] : []),
      ['NASA Blue Marble Next Generation and Black Marble 2012', 'https://visibleearth.nasa.gov/', 'the day and night Earth on the globe (public domain; Blue Marble by Reto Stöckli, NASA Earth Observatory; Black Marble from Suomi NPP VIIRS, NASA Earth Observatory and NOAA NGDC)'],
    ];
    $('#v-help').innerHTML = `<div class="page">
      <h2>How to read Silsila</h2>
      <p>Silsila reads the raw data you download from FamilyTreeDNA, 23andMe, AncestryDNA, MyHeritage or Living DNA. A Y file places a paternal line on FamilyTreeDNA's Y tree and lays out what is known about every man on it; an autosomal file, which everyone has, fills the Genome view. Nothing in it assumes where your family comes from, and it runs entirely in this browser.</p>
      <p><button class="btn small" data-act="tour">Take the tour</button></p>
      <div class="guide">${guide.map(([h, p]) => `<div><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
      <h2>Colours</h2>
      <ul class="rows" style="max-width:640px">
        <li><span>SNPs take the colour of their new base, as in a sequencer trace</span><span class="meta">${Object.entries(BASE).map(([b, c]) => `<b style="color:${c}">${b}</b>`).join(' ')}</span></li>
        <li><span>The five STR panels take the five dye channels</span><span class="meta">${DYE.map((c, i) => `<b style="color:${c}">${i + 1}</b>`).join(' ')}</span></li>
        <li><span>Your line</span><span class="meta" style="color:${COL.hap}">teal</span></li>
        <li><span>Ancient men</span><span class="meta" style="color:${COL.anc}">tan</span></li>
        <li><span>Notable families</span><span class="meta" style="color:${COL.fame}">orange</span></li>
        <li><span>Family Finder matches</span><span class="meta" style="color:${COL.ff}">violet</span></li>
        <li><span>Shared segments with a relative: half identical, and fully identical inside them</span><span class="meta"><b style="color:${COL.hap}">teal</b> <b style="color:${COL.ned}">yellow</b></span></li>
      </ul>
      <h2>Glossary</h2>
      <dl class="gloss">${terms.map(([id, [t, d, s]]) => `<dt id="g-${id}" tabindex="-1">${esc(t)}</dt><dd>${esc(d)}${s ? ` <span class="note">${srcs(s)}</span>` : ''}</dd>`).join('')}</dl>
      <h2>Where the data comes from</h2>
      <ul class="rows stack" style="max-width:760px">${sources.map(([n, u, w]) => `<li>${link(u, n)}<span class="sub">${w}</span></li>`).join('')}</ul>
      <p class="note" style="margin-top:12px">Generation counts assume ${FACTS.yearsPerGen} years per generation (${srcs(FACTS.genSrc)}). Branch ages are estimates with wide ranges; FamilyTreeDNA and YFull often disagree by centuries.</p>
      <h2>Health reports</h2>
      <p>Silsila makes no health or disease-risk reports, because consumer chips often miscall the rare variants that matter medically (${link('https://doi.org/10.1136/bmj.n214', 'Weedon et al. 2021, BMJ')}) and such findings need a clinical test and a professional to explain them; for health questions, see a ${link('https://findageneticcounselor.nsgc.org/', 'genetic counsellor')}.</p>
      ${notIncluded()}
      <h2>Privacy</h2>
      <p>Files you add are read on this device and never uploaded. Silsila keeps derived results in this browser's storage: your Y calls, STR values, match lists and summaries of the autosomal file, never the autosomal genotypes themselves. A relative's file and the comparison stay in memory and are gone when you close the page. Clear my data, under Add files, removes the rest.</p>
      <h2>Software</h2>
      <p class="note">D3 (ISC), 3d-force-graph and globe.gl by Vasco Asturiano (MIT) and three.js (MIT), all included in the lib folder with their licences. IBM Plex Mono font (SIL Open Font License), in assets/fonts.</p>
    </div>`;
  }

  /* ---------- reading panel ---------- */
  let hist = [], cur = null;
  const go = (kind, key, text) => `<button class="go" data-open="${esc(kind)}" data-key="${esc(key)}">${esc(text ?? key)}</button>`;
  const goB = i => go('branch', i, T.names[i]);
  const goEv = e => `<button class="go" style="font-family:var(--body);font-size:13px" data-open="event" data-key="${EVENTS.indexOf(e)}">${esc(e[3])}</button>`;
  const evRow = e => `<li><span>${goEv(e)}<span class="sub">${esc(e[4])} · ${srcs([e[5]])}</span></span><span class="meta">${esc(e[1])}</span></li>`;
  const nm = t => `<span class="nm">${esc(t)}</span>`;
  const sec = (title, body, cls = '') => body ? `<section class="sec ${cls}"><h3>${title}</h3>${body}</section>` : '';
  const stats = list => `<div class="stats">${list.filter(Boolean).map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('')}</div>`;
  function act(what, key) {
    if (what === 'back') { const p = hist.pop(); if (p) open(p[0], p[1], true); }
    if (what === 'focus') { me.focus = T.names[+key]; save(); derive(); povSet = false; render(); open('branch', +key, true); }
    if (what === 'mine') { me.focus = null; save(); derive(); povSet = false; render(); open('you', '', true); }
    if (what === 'import') openImport();
    if (what === 'view') setView(key);
    if (what === 'tour') tour(0);
    if (what === 'reset') resetView();
    if (what === 'glossary') {
      closePop(false); setView('help');
      const t = document.getElementById('g-' + key);
      if (t) { t.scrollIntoView?.({ block: 'center' }); t.focus({ preventScroll: true }); t.style.color = COL.ned; setTimeout(() => { t.style.color = ''; }, 2400); }
    }
  }
  const PANELS = { you: youPanel, branch: branchPanel, snp: snpPanel, ancient: ancientPanel, famous: famousPanel, marker: markerPanel, panel: strPanel, match: matchPanel, chrom: chromPanel, country: countryPanel, event: eventPanel };
  function open(kind, key, noHist) {
    if (!PANELS[kind]) return;
    if (cur && !noHist) hist.push(cur);
    if (hist.length > 30) hist.shift();
    cur = [kind, key];
    const k = kind === 'branch' || kind === 'snp' || kind === 'ancient' || kind === 'famous' || kind === 'event' ? +key : key;
    closePop(false);
    $('#panel').innerHTML = (hist.length ? `<button class="go back" data-act="back">← Back</button>` : '') + PANELS[kind](k);
    $('#panel').scrollTop = 0;
    sel = ({ branch: 'b' + k, snp: 's' + k, ancient: 'a' + k, famous: 'f' + k, marker: 'k:' + k, panel: 'p' + k, match: 'm' + k })[kind] || null;
    highlight();
    if (!noHist) {
      focusNode(sel);
      $('#announce').textContent = 'Showing ' + ($('#panel h2')?.textContent || kind);
      if (GL && ui.view === 'map' && use3d()) {
        const a = kind === 'ancient' ? D.ancient[k] : null, r = kind === 'branch' && D.route?.nodes[T.names[k]];
        if (a?.lat != null) GL.pointOfView({ lat: a.lat, lng: a.lon, altitude: 1.3 }, reduced ? 0 : 900);
        else if (r) GL.pointOfView({ lat: r[1], lng: r[0], altitude: 1.5 }, reduced ? 0 : 900);
      }
    }
  }
  function openNode(d) {
    ({ you: () => open('you', ''), line: () => open('branch', d.i), child: () => open('branch', d.i), sister: () => open('branch', d.i), snp: () => open('snp', d.k), ancient: () => open('ancient', d.a.n),
      famous: () => open('famous', d.f.n), panel: () => open('panel', d.panel), marker: () => open('marker', d.mid), match: () => open('match', d.m.id), ffmatch: () => open('match', d.m.id) })[d.kind]();
  }
  const ageRows = i => ages(i).map(a => `<dt>Common ancestor${q('tmrca')}</dt><dd>${yr(a.tmrca)}${a.lo != null ? ` <span class="note">(${yr(a.lo)} to ${yr(a.hi)})</span>` : ''}<br><span class="note">${esc(a.src)}${a.id ? ' ' + esc(a.id) : ''} · ${ago(a.tmrca)}</span></dd>${a.formed != null ? `<dt>Formed${q('formed')}</dt><dd>${yr(a.formed)} <span class="note">${esc(a.src)}</span></dd>` : ''}`).join('');
  // published STR motifs for the haplogroups on the line being shown
  const motifsHere = () => SR.motifs.filter(m => !m.hap || D.pos.has(T.find(m.hap)));
  const noteFor = i => { const n = NOTES.branches[T.names[i]]; return n ? `<p>${esc(n.text)}</p><p class="note">${srcs(n.src)}</p>` : ''; };
  const bars = rows => `<div class="bars">${rows.map(([name, code, n, total]) => `<span class="${code && code === me.home ? 'me' : ''}">${esc(name)}</span><span class="b" style="width:${Math.max(2, 100 * n / total)}%"></span><span>${num(n)} of ${num(total)}</span>`).join('')}</div>`;
  const topShare = (rows, k = 8) => rows.filter(r => r[3] >= 150).sort((a, b) => b[2] / b[3] - a[2] / a[3]).slice(0, k);
  const kin = (a, whose) => { const g = gens(a.tmrca); return `roughly ${num(g.n)} generations${q('generation')} back, ${whose} ${g.who}`; };

  function youPanel() {
    if (!D.line.length) return intro();
    const p = D.place, t = D.focus, st = D.line[D.lineStart], a = age(t);
    const pos = p && D.mine ? D.line.reduce((s, i) => s + (p.der.get(i)?.length || 0), 0) : 0, neg = p && D.mine ? D.line.reduce((s, i) => s + (p.anc.get(i)?.length || 0), 0) : 0;
    const yt = p && D.mine ? D.line.flatMap(i => (p.der.get(i) || []).map(k => [T.chip[k][0], BASE[T.chip[k][2][1]]])) : [];
    const cty = D.enr?.countries?.[T.names[t]];
    const fam = D.famous.filter(f => f.meet === t), anc = D.ancient.filter(onLine);
    const nearest = anc.filter(x => !x.present).sort((x, y) => D.pos.get(y.meet) - D.pos.get(x.meet) || (x.year ?? 0) - (y.year ?? 0)).slice(0, 5);
    const strN = STR.count(me.str || {});
    let h = `<div class="eyebrow">${D.mine ? 'Your Y line' : 'Exploring a line'}<span>FamilyTreeDNA tree ${esc(T.version.ftdna || '')}</span></div><h2>${esc(T.names[t])}</h2>`;
    if (D.mine) h += `<p class="lead">Your Y SNPs${q('snp')} place you on the branch${q('branch')} ${nm(T.names[t])}, ${D.line.length - 1 - D.lineStart} steps below ${nm(T.names[st])}, the root of haplogroup${q('haplogroup')} ${esc(letterOf(st))}.${a ? ` Its founder lived around ${yr(a.tmrca)}, ${kin(a, 'your')}.` : ''}</p>`;
    else h += `<p class="lead">You are browsing the line of ${nm(T.names[t])}.${a ? ` Its founder lived around ${yr(a.tmrca)}.` : ''} ${p ? `<button class="link" data-act="mine">Back to your own line</button>` : ''}</p>`;
    h += stats([a && [rnd(yrsAgo(a.tmrca)), `years since the common ancestor${q('tmrca')}`], [num(T.subtreeKits(t)), `testers${q('testers')} descend from him`], p && D.mine && [`${pos} / ${neg}`, `your positive and negative SNPs${q('calls')} on the line`]]);
    h += noteFor(t);
    if (D.enrLoading && !D.enr) h += `<p class="note">Loading FamilyTreeDNA Discover data for ${esc(D.enrLoading)}…</p>`;
    h += sec('Dates', `<dl class="kv">${ageRows(t)}</dl>`);
    if (p && D.mine && p.read < me.y.calls.length * .3) h += `<p class="callout">Few of your Y calls matched the tree's positions in either genome build${q('build')}, so this placement rests on little.</p>`;
    if (p && D.mine && p.read < 5000) h += `<p class="callout">Your file${me.y.vendor && me.y.vendor !== 'unknown' ? ' from ' + esc(me.y.vendor) : ''} reads ${num(p.read)} of the Y SNPs on the tree, so the placement stops at a broad branch. A FamilyTreeDNA Family Finder file reads about 20,000, and a Big Y${q('bigy')} reads the whole Y.</p>`;
    h += ladder() + records() + clockChart();
    if (yt.length) h += sec(`Where your SNPs sit`, `${ymap(yt, 'Your positive SNPs on the Y chromosome')}<p class="note">Each tick is a letter where you carry the changed base, coloured by the new base: ${Object.entries(BASE).map(([b, c]) => `<b style="color:${c}">${b}</b>`).join(' ')}.</p>`);
    if (p && D.mine) {
      let b = `<ul class="rows">${p.children.slice().sort((x, y) => y.size - x.size).slice(0, 8).map(c => {
        const s = childState(c.node);
        return `<li>${goB(c.node)}<span class="meta">${s === 'negative' ? 'negative' : s === 'positive' ? 'positive below it' : `untested · ${c.negBranches} of ${num(c.size)} ruled out`}</span></li>`;
      }).join('')}</ul>`;
      const open_ = p.children.filter(c => childState(c.node) === 'untested');
      if (open_.length === 1) b += `<p style="margin-top:10px">So your line most likely runs through ${goB(open_[0].node)}, or through a branch not yet found. A Big Y${q('bigy')} reads the whole Y and would place you among ${num(T.end[t] - t - 1)} known sub-branches.</p>`;
      if (p.conflicts.length > 12) b += `<p class="callout">${p.conflicts.length} branches off your line also read positive. A few are expected from SNPs that arose more than once${q('recurrent')}; many suggest a noisy file.</p>`;
      h += sec(`Below your branch${q('calls')}`, b);
    }
    if (fam.length) h += sec('Notable lines from the same ancestor', `<ul class="rows">${fam.map(f => `<li>${go('famous', f.n, f.name)}<span class="meta">${esc(f.category || '')}</span></li>`).join('')}</ul>`);
    if (cty) { const home = me.home && cty.find(c => c[1] === me.home); h += sec(`Share of each country's testers on ${esc(T.names[t])}`, `${bars(topShare(cty))}${home ? `<p class="note" style="margin-top:8px">${num(home[2])} of the ${num(home[3])} FamilyTreeDNA testers with paternal roots in ${esc(home[0])} descend from this branch, ${pct(home[2] / home[3])}.</p>` : me.home ? '' : `<p class="note" style="margin-top:8px">Set your paternal country under <button class="link" data-act="import">Add files</button> to compare.</p>`}`); }
    if (nearest.length) h += sec(`Ancient men closest to your line${q('ancient')}`, `<ul class="rows">${nearest.map(x => `<li><span>${go('ancient', x.n, x.id)}<span class="sub">${esc(x.site || x.country)} · shares ${esc(T.names[x.meet])}</span></span><span class="meta">${yr(x.year)}</span></li>`).join('')}</ul><p class="note" style="margin-top:6px">${anc.length} ancient and present-day reference samples share your line; see Database, Ancient.</p>`);
    const motifs = motifsHere();
    if (strN) h += sec(`STR markers${q('str')}`, `<p>${strN} STR values loaded.${motifs.length ? ` How they compare with published motifs${q('motif')} described on this line:` : ''}</p><ul class="rows">${motifs.map(m => { const r = STR.motif(me.str, m); return `<li><span>${esc(m.name)}</span><span class="meta">${r.compared ? `${r.same} of ${r.compared} match, ${r.steps} step${r.steps === 1 ? '' : 's'} off` : 'not loaded'}</span></li>`; }).join('')}</ul>${motifs.length ? '<p class="note" style="margin-top:6px">Matching a motif is a statistical hint, not a test result; your SNPs already place you.</p>' : ''}<p class="note">Open a marker to see it drawn.</p>`);
    else h += sec(`STR markers${q('str')}`, `<p>The spheres on the five panel hubs are the 111 FamilyTreeDNA STR markers. <button class="link" data-act="import">Add your Y-STR results</button> to fill in the ones you tested.</p>`);
    if (me.auto) h += sec('Autosomes', `<p>${num(me.auto.rows)} SNPs from ${esc(me.auto.file)}. <button class="link" data-act="view" data-key="genome">Open the Genome view</button>.</p>`);
    h += `<details class="more sec"><summary>Keep in mind</summary><ul class="rows stack">${NOTES.caveats.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>`;
    h += `<p class="note" style="margin-top:16px">Tree: FamilyTreeDNA ${esc(T.version.ftdna)} · ages: ${D.enr ? 'FamilyTreeDNA Discover ' + esc(D.enr.version) + ' and ' : ''}YFull ${esc(T.version.yfull)} (CC BY 4.0) · ancient DNA: ${esc(REF.ancient.source)} · ${FACTS.yearsPerGen} years per generation (${srcs(FACTS.genSrc)})</p>`;
    return h;
  }
  // The line from the root of the haplogroup letter down to the branch being shown, with the deeper steps folded away.
  function ladder() {
    const row = i => { const a = age(i); return `<tr class="${i === D.focus ? 'me' : ''}"><td>${goB(i)}</td><td>${a ? yr(a.tmrca) : ''}</td><td>${a ? '~' + num(gens(a.tmrca).n) + ' gen' : ''}</td><td>${num(T.subtreeKits(i))}</td></tr>`; };
    const deep = D.line.slice(0, D.lineStart), top = D.line.slice(D.lineStart);
    return sec(`Your line, oldest first${q('generation')}`, `<table class="ladder"><tbody>${top.map(row).join('')}</tbody></table>
      ${deep.length ? `<details class="more"><summary>The ${deep.length} steps before haplogroup ${esc(letterOf(D.line[D.lineStart]))}, back to the first modern humans</summary><table class="ladder"><tbody>${deep.map(row).join('')}</tbody></table></details>` : ''}
      <p class="note">Columns: common ancestor, generations back at ${FACTS.yearsPerGen} years each, testers descended from him.</p>`);
  }
  function records() {
    const out = [], anc = D.ancient.filter(a => onLine(a) && !a.present && a.year != null);
    if (anc.length) {
      const old = anc.reduce((x, y) => y.year < x.year ? y : x), young = anc.reduce((x, y) => y.year > x.year ? y : x);
      out.push(['Oldest ancient man on your line', go('ancient', old.n, old.id), `${yr(old.year)}<br>${esc(old.site || old.country || '')}`]);
      out.push(['Most recent ancient man', go('ancient', young.n, young.id), `${yr(young.year)}<br>${esc(young.site || young.country || '')}`]);
    }
    if (D.home) { const nb = G.nearest(anc, D.home.lat, D.home.lon); if (nb) out.push([`Ancient man nearest ${esc(D.home.name)}`, go('ancient', nb.item.n, nb.item.id), `${num(Math.round(nb.km / 10) * 10)} km from its middle<br>${yr(nb.item.year)}`]); }
    const seg = D.line.slice(D.lineStart);
    if (seg.length) { const busy = seg.reduce((x, y) => T.children(y).length > T.children(x).length ? y : x); out.push(['Busiest ancestor: most known sons\' lines', goB(busy), `${num(T.children(busy).length)} branches<br>split off below him`]); }
    const strv = STR.ids.map(id => ({ id, v: STR.value(me.str || {}, id), r: SR.info[baseOf(id).n]?.r })).filter(x => x.v !== '' && x.r);
    if (strv.length > 1) {
      const fast = strv.reduce((x, y) => y.r > x.r ? y : x), slow = strv.reduce((x, y) => y.r < x.r ? y : x);
      out.push([`Your fastest STR marker${q('rate')}`, go('marker', fast.id), `${esc(fast.v)} repeats<br>changes about once in ${num(Math.round(1 / fast.r))} generations`]);
      out.push(['Your slowest STR marker', go('marker', slow.id), `${esc(slow.v)} repeats<br>about once in ${num(Math.round(1 / slow.r))} generations`]);
    }
    if (me.auto) {
      const R = G.autoRecords(me.auto);
      if (R.longest) out.push([`Longest run of homozygosity${q('roh')}`, go('chrom', R.longest.c, 'Chromosome ' + R.longest.c), `${((R.longest.end - R.longest.start) / 1e6).toFixed(1)} Mb`]);
      if (R.most) out.push([`Most and least heterozygous${q('het')}`, `${go('chrom', R.most.c, 'Chromosome ' + R.most.c)} and ${go('chrom', R.least.c, R.least.c)}`, `${pct(R.most.rate)} and ${pct(R.least.rate)}`]);
    }
    return out.length ? sec('Records', `<ul class="rows">${out.map(([k, v, m]) => `<li><span><span class="sub" style="margin:0 0 2px">${k}</span>${v}</span><span class="meta">${m}</span></li>`).join('')}</ul>`) : '';
  }
  // Your positive SNPs piling up along the line, against the age of each ancestor.
  function clockChart() {
    const p = D.place; if (!p || !D.mine) return '';
    let c = 0; const pts = [];
    for (const i of D.line) { c += p.der.get(i)?.length || 0; const ya = yrsAgo(ageOrUp(i)); if (ya > 0) pts.push({ i, ya, c }); }
    if (pts.length < 3 || !c) return '';
    const W = 380, H = 176, m = { l: 34, r: 12, t: 10, b: 28 };
    const x = d3.scaleLog().domain([d3.max(pts, d => d.ya), Math.max(50, d3.min(pts, d => d.ya))]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, c]).nice().range([H - m.b, m.t]);
    const line = d3.line().x(d => x(d.ya)).y(d => y(d.c)).curve(d3.curveStepAfter);
    const xt = [100000, 10000, 1000, 100].filter(v => v <= x.domain()[0] && v >= x.domain()[1]);
    return sec(`Your mutation clock${q('snp')}`, `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Your positive SNPs accumulating along your line, ${c} in all">
      <g class="axis">${y.ticks(4).map(v => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${COL.hair}"/><text x="${m.l - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('')}
      ${xt.map(v => `<text x="${x(v)}" y="${H - 9}" text-anchor="middle">${rnd(v)} years ago</text>`).join('')}</g>
      <path d="${line(pts)}" fill="none" stroke="${COL.hap}" stroke-width="1.5"/>
      ${pts.map(d => `<circle cx="${x(d.ya)}" cy="${y(d.c)}" r="2.6" fill="${COL.hap}"><title>${esc(T.names[d.i])}: ${d.c} of your SNPs by ${rnd(d.ya)} years ago</title></circle>`).join('')}</svg>
      <p class="note">Each dot is an ancestor on your line at his date, on a log scale${q('logscale')}; its height is how many of your positive SNPs had appeared by then. The chip${q('chip')} mostly reads SNPs of old branches, so the count climbs in deep time and flattens toward the present. A Big Y${q('bigy')} would keep it climbing.</p>`);
  }
  function intro() {
    const try_ = ['A-M13', 'B-M181', 'C-M217', 'D-M174', 'E-M2', 'E-M35', 'G-M201', 'H-M69', 'I-M253', 'J-M267', 'L-M20', 'N-M231', 'O-M175', 'Q-M3', 'R-M198', 'R-M269', 'T-M184'].map(n => T.find(n)).filter(i => i >= 0);
    return `<div class="eyebrow">Start here</div><h2>Your DNA, from the first humans to you</h2>
      <p class="lead">Silsila reads the raw DNA files testing companies let you download. A Y file places a paternal line on a tree of ${num(T.n)} branches${q('branch')} and links it to dates, ancient DNA, notable families, history, STR markers and matches. An autosomal file, which everyone has, fills the Genome view and lets you compare your DNA with a relative's. Everything runs in this browser.</p>
      <p><button class="btn primary" data-act="import">Add files</button> <button class="btn" data-act="tour">Take the tour</button></p>
      ${sec('Which files', `<ol class="rows stack" style="padding:0;list-style:none">
        <li>23andMe, AncestryDNA, MyHeritage or Living DNA: the raw data download, as the .zip it comes in.<span class="sub">Their chips read a few thousand Y SNPs or fewer, so a paternal line placed from them stops at a broad branch.</span></li>
        <li>FamilyTreeDNA: Family Finder, Download Raw Data (the Y file and the autosomal file); Y-DNA, Y-STR Results (CSV); Y-DNA and Family Finder Matches (Export CSV).</li>
        <li>Only men carry a Y chromosome. A father's, brother's or paternal uncle's file shows a woman's paternal line.</li></ol>`)}
      ${sec('Or explore a line without data', `<p>Search a branch at the top, or open one of these and choose "Show this line":</p><p class="path">${try_.map(goB).join(' · ')}</p>`)}`;
  }
  function branchPanel(i) {
    const onL = D.pos.has(i), under = D.focus >= 0 && T.under(i, D.focus) && i !== D.focus, p = D.place, a = age(i);
    const status = i === D.focus ? (D.mine ? 'Your branch' : 'Line being explored') : onL ? `On your line · ${D.line.length - 1 - D.pos.get(i)} steps above` : under ? `Below your branch · ${childState(i) === 'negative' ? 'ruled out' : childState(i) === 'untested' ? 'not tested' : 'possible'}` : D.focus >= 0 ? `Meets your line at ${T.names[T.meet(D.line, i)] || 'the root'}` : 'Branch';
    const chipRows = T.chip.map((r, k) => [r, k]).filter(([r]) => r[1] === i);
    const der = p?.der.get(i) || [], anc = p?.anc.get(i) || [];
    const kids = T.children(i).slice().sort(byKits);
    const cty = D.enr?.countries?.[T.names[i]];
    const anc_ = D.ancient.filter(x => x.meet === i && onL), fam = D.famous.filter(f => f.meet === i);
    const exact = D.ancient.filter(x => x.node === i), fnote = D.enr?.ages?.[T.names[i]]?.[3];
    let h = `<div class="eyebrow">${esc(status)}${q('branch')}</div><h2>${esc(T.names[i])}</h2>`;
    if (a) h += `<p class="lead">The man at the root of this branch lived around ${yr(a.tmrca)}, ${ago(a.tmrca)}${onL ? `: ${kin(a, D.mine ? 'your' : "this line's")}` : ''}.</p>`;
    if (fnote) h += `<p class="note">FamilyTreeDNA marks this point on the tree: ${esc(fnote)}.</p>`;
    h += stats([[num(T.subtreeKits(i)), `testers${q('testers')} descend from him, ${num(T.kits[i])} placed exactly here`], [num(T.end[i] - i - 1), 'known branches below'], p && (der.length || anc.length) && [`${der.length} / ${anc.length}`, `your positive and negative SNPs${q('calls')} here`]]);
    h += noteFor(i);
    if (a) h += sec('Dates', `<dl class="kv">${ageRows(i)}</dl>`) + whileHeLived(a);
    h += routeMini(i);
    if (der.length || anc.length) h += sec('Your calls here', `<p class="path">${der.map(k => go('snp', k, '+' + T.chip[k][3])).join(' · ')}${der.length && anc.length ? ' · ' : ''}${anc.map(k => go('snp', k, '−' + T.chip[k][3])).join(' · ')}</p>${anc.length && der.length > anc.length ? `<p class="note">On old branches a few SNPs sit in hard-to-read DNA or mutated back, so a handful of disagreements against more agreements is normal.</p>` : ''}`);
    h += chipRows.length ? sec(`SNPs that chips read${q('chip')}`, `<p class="path">${chipRows.slice(0, 30).map(([r, k]) => go('snp', k, r[3])).join(' · ')}${chipRows.length > 30 ? ` and ${chipRows.length - 30} more` : ''}</p>`)
      : `<p class="note" style="margin-top:16px">None of this branch's SNPs are on the chips Silsila indexes${q('chip')}, so a chip file cannot confirm it; a Big Y${q('bigy')} can.</p>`;
    if (T.parent[i] >= 0) h += sec('Parent', `<p>${goB(T.parent[i])}</p>`);
    if (kids.length) h += sec(`${kids.length} branches below`, `<p class="path">${kids.slice(0, 16).map(c => `${goB(c)} <small>(${num(T.subtreeKits(c))})</small>`).join(' · ')}${kids.length > 16 ? ` and ${kids.length - 16} more` : ''}</p><p class="note">Testers in each subtree in brackets.</p>`);
    if (cty) h += sec(`Share of each country's testers${q('testers')}`, bars(topShare(cty)));
    if (anc_.length) h += sec('Ancient men who meet your line here', `<ul class="rows">${anc_.slice(0, 20).map(x => `<li><span>${go('ancient', x.n, x.id)}<span class="sub">${esc(x.site || x.country)}</span></span><span class="meta">${x.present ? 'present-day' : yr(x.year)}</span></li>`).join('')}</ul>${anc_.length > 20 ? `<p class="note">and ${anc_.length - 20} more in Database, Ancient</p>` : ''}`);
    else if (exact.length) h += sec('Ancient men on this branch', `<ul class="rows">${exact.slice(0, 12).map(x => `<li><span>${go('ancient', x.n, x.id)}<span class="sub">${esc(x.site || x.country)}</span></span><span class="meta">${x.present ? 'present-day' : yr(x.year)}</span></li>`).join('')}</ul>`);
    if (fam.length) h += sec('Notable lines', `<ul class="rows">${fam.map(f => `<li>${go('famous', f.n, f.name)}<span class="meta">${esc(f.category || '')}</span></li>`).join('')}</ul>`);
    if (i !== D.focus) h += `<p style="margin-top:20px"><button class="btn small" data-act="focus" data-key="${i}">Show this line</button></p>`;
    const y = T.yfull(i);
    h += `<p class="note" style="margin-top:16px">${link(discover(T.names[i]), 'Discover')} · ${link('https://www.familytreedna.com/public/y-dna-haplotree/' + letterOf(i)[0], 'FamilyTreeDNA haplotree')}${y ? ' · ' + link('https://www.yfull.com/tree/' + encodeURIComponent(y[0]) + '/', 'YFull ' + y[0]) : ''}</p>`;
    return h;
  }
  function whileHeLived(a) {
    const lo = a.lo ?? a.tmrca, hi = a.hi ?? a.tmrca, r = G.eventsAround(EVENTS, a.tmrca, lo, hi);
    if (!r.list.length) return '';
    const range = lo === hi ? '' : `${yr(Math.min(lo, hi))} to ${yr(Math.max(lo, hi))}`;
    return sec(r.inside ? 'While he lived, give or take' : 'Nearest events in history',
      `<p class="note">${r.inside ? `Events inside his date range, ${range}, nearest his central date first.` : `No event on Silsila's list falls inside his date range${range ? ', ' + range : ''}; these are the closest on either side.`}</p><ul class="rows">${r.list.slice(0, 6).map(evRow).join('')}</ul>`);
  }
  function routeMini(i) {
    const R = D.route; if (!R) return '';
    const name = T.names[i], fam = T.find(R.family);
    const here = R.nodes[name] ? name : fam >= 0 && T.under(i, fam) ? R.family : null;
    if (!here) return '';
    const W = 380, H = 200, coords = R.paths.flatMap(x => x[4]);
    const proj = d3.geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: 'MultiPoint', coordinates: coords }), path = d3.geoPath(proj);
    const hp = proj(R.nodes[here]);
    return sec(`On the migration route${q('route')}`, `<svg class="mini" viewBox="0 0 ${W} ${H}" role="img" aria-label="Route of the line on a map, with ${esc(here)} marked">
      <rect width="${W}" height="${H}" rx="6" fill="${COL.bg}"/>
      <g>${REF.world.features.map(f => `<path d="${path(f)}" fill="${COL.raise}" stroke="${COL.surface}" stroke-width=".6"/>`).join('')}</g>
      ${R.paths.map(([, , , side, c]) => `<path class="route${side ? ' side' : ''}" d="${path({ type: 'LineString', coordinates: c })}"/>`).join('')}
      ${Object.entries(R.nodes).map(([n, c]) => { const [x, y] = proj(c); return `<circle cx="${x}" cy="${y}" r="${n === here ? 5 : 2.2}" fill="${n === here ? COL.ned : COL.hap}"><title>${esc(n)}</title></circle>`; }).join('')}
      <text x="${hp[0] > W - 90 ? hp[0] - 8 : hp[0] + 8}" y="${hp[1] - 7}" text-anchor="${hp[0] > W - 90 ? 'end' : 'start'}" fill="${COL.fg}" paint-order="stroke" stroke="${COL.bg}" stroke-width="3">${esc(here)}</text></svg>
      <p class="note">${here === name ? `Where FamilyTreeDNA places ${esc(name)} on its reconstructed route.` : `The route stops at ${esc(here)}, the family level FamilyTreeDNA maps; ${esc(name)} descends from it.`} ${link(discover(R.family), 'Discover')}</p>`);
  }
  // One base pair before and after the mutation: the plus strand (what the file reports) on top, its partner below.
  function strandSvg(a, d) {
    const pair = (x0, top, label) => {
      const bot = COMP[top] || '?', ct = BASE[top] || COL.muted, cb = BASE[bot] || COL.muted;
      return `<g transform="translate(${x0},0)">
        <line x1="0" y1="24" x2="150" y2="24" stroke="${COL.dim}" stroke-width="2"/><line x1="0" y1="88" x2="150" y2="88" stroke="${COL.dim}" stroke-width="2"/>
        ${[18, 42, 108, 132].map(x => `<line x1="${x}" y1="27" x2="${x}" y2="85" stroke="${COL.hair}" stroke-width="4" stroke-linecap="round"/>`).join('')}
        <rect x="61" y="28" width="28" height="24" rx="4" fill="${rgba(ct, .16)}" stroke="${ct}"/><rect x="61" y="60" width="28" height="24" rx="4" fill="${rgba(cb, .16)}" stroke="${cb}"/>
        <text x="75" y="46" text-anchor="middle" fill="${ct}">${top}</text><text x="75" y="78" text-anchor="middle" fill="${cb}">${bot}</text>
        <text class="lab" x="0" y="17">5′</text><text class="lab" x="150" y="17" text-anchor="end">3′</text><text class="lab" x="0" y="104">3′</text><text class="lab" x="150" y="104" text-anchor="end">5′</text>
        <text class="lab" x="75" y="122" text-anchor="middle">${label}</text></g>`;
    };
    return `<svg class="strand" viewBox="0 0 380 128" role="img" aria-label="Base pair ${a}-${COMP[a]} became ${d}-${COMP[d]}">${pair(0, a, 'ancestral, most men')}<text x="190" y="62" text-anchor="middle" fill="${COL.muted}" style="font-size:20px">→</text>${pair(230, d, 'derived, this branch')}</svg>`;
  }
  const baseB = b => `<b style="color:${BASE[b] || 'inherit'}">${b}</b>`;
  function snpPanel(k) {
    const [pos, node, ch, name, region] = T.chip[k], call = D.calls?.get(pos), a = age(node);
    const status = !call ? (D.calls ? 'not read in your file' : 'no file loaded') : call === ch[1] ? 'you carry the change' : call === ch[0] ? 'you read the old base' : 'you read a third base';
    const ancUnder = D.ancient.filter(x => !x.present && x.node >= 0 && T.under(x.node, node)), famUnder = D.famous.filter(f => f.node >= 0 && T.under(f.node, node));
    const same = T.chip.filter(x => x[0] === pos && x !== T.chip[k]);
    return `<div class="eyebrow">Y SNP${q('snp')}<span>${esc(status)}</span></div><h2>${esc(name)}</h2>
      ${strandSvg(ch[0], ch[1])}
      <p class="lead">At position ${num(pos)} on the Y, the letter ${baseB(ch[0])} became ${baseB(ch[1])} in one man${a ? ` who lived ${a.formed != null ? `between about ${yr(a.formed)} and ${yr(a.tmrca)}` : `before about ${yr(a.tmrca)}`}` : ''}. Every man on ${goB(node)} carries the new letter.${call ? ` Your file reads ${baseB(call)}.` : ''}</p>
      <p class="note">Top: the plus strand, which your file reports. Bottom: its partner on the other strand, which always pairs A with T and C with G. The neighbouring letters are not in the file, so they are left blank.</p>
      <dl class="kv"><dt>Change${q('derived')}</dt><dd>${ch[0]} to ${ch[1]}</dd><dt>Position${q('build')}</dt><dd>chrY:${num(pos)} (GRCh38)</dd><dt>Band${q('band')}</dt><dd>${esc(region || 'n/a')}</dd><dt>Defines</dt><dd>${goB(node)}</dd></dl>
      ${ymap([[pos, BASE[ch[1]]]], name + ' on the Y chromosome')}
      ${sec('Who else carries it', `<ul class="rows"><li><span>FamilyTreeDNA testers on ${esc(T.names[node])}${q('testers')}</span><span class="meta">${num(T.subtreeKits(node))}</span></li>
        <li><span>Ancient men on or below it${q('ancient')}</span><span class="meta">${ancUnder.length}</span></li>
        ${famUnder.length ? `<li><span>Notable lines below it</span><span class="meta">${famUnder.length}</span></li>` : ''}</ul>
        ${ancUnder.length ? `<p class="path" style="margin-top:6px">${ancUnder.sort((x, y) => (x.year ?? 0) - (y.year ?? 0)).slice(0, 12).map(x => go('ancient', x.n, x.id)).join(' · ')}${ancUnder.length > 12 ? ` and ${ancUnder.length - 12} more` : ''}</p>` : ''}
        ${famUnder.length ? `<p class="path">${famUnder.slice(0, 8).map(f => go('famous', f.n, f.name)).join(' · ')}</p>` : ''}`)}
      ${same.length ? `<p class="note">The same position changed on other branches too${q('recurrent')}: ${same.map(x => goB(x[1])).join(', ')}.</p>` : ''}`;
  }
  function ancientPanel(n) {
    const a = D.ancient[n]; if (!a) return '<p>Sample not found.</p>';
    const m = a.meet, near = D.home && a.lat != null ? G.distanceKm(D.home.lat, D.home.lon, a.lat, a.lon) : null;
    return `<div class="eyebrow">${a.present ? 'Present-day reference genome' : 'Ancient DNA'}${q('ancient')}${a.uncertain ? '<span>placement uncertain</span>' : ''}${a.coarse ? '<span>haplogroup only</span>' : ''}</div><h2>${esc(a.id)}</h2>
      ${!a.present && a.year != null ? `<p class="lead">He lived about ${yr(a.year)}, ${ago(a.year)}${a.site || a.country ? `, at ${esc(a.site || a.country)}` : ''}: some ${num(gens(a.year).n)} generations${q('generation')} before today.</p>` : ''}
      <dl class="kv"><dt>Lived</dt><dd>${a.present ? 'present day' : 'about ' + yr(a.year)}${a.date && !a.present ? `<br><span class="note">${esc(a.date)}</span>` : ''}</dd>${a.site ? `<dt>Site</dt><dd>${esc(a.site)}</dd>` : ''}<dt>Country</dt><dd>${esc(a.country)}</dd>
      ${a.culture ? `<dt>Group</dt><dd>${esc(a.culture)}</dd>` : ''}${a.period ? `<dt>Period</dt><dd>${esc(a.period)}</dd>` : ''}<dt>His branch</dt><dd>${goB(a.node)} <span class="note">${esc(a.call)}</span></dd>
      ${a.lat != null ? `<dt>Coordinates</dt><dd>${a.lat}, ${a.lon}</dd>` : ''}${near != null ? `<dt>From ${esc(D.home.name)}</dt><dd>${num(Math.round(near / 10) * 10)} km from its middle</dd>` : ''}</dl>
      ${m >= 0 ? `<p style="margin-top:12px">He and ${D.mine ? 'you' : 'this line'} both descend from the man at the root of ${goB(m)}${age(m) ? `, who lived around ${yr(age(m).tmrca)}` : ''}.${a.uncertain || a.coarse ? ' Ancient DNA is often patchy, so his exact branch may sit higher or lower than shown.' : ''}</p>` : ''}
      <p class="note">${esc(a.pub)} · ${esc(a.src)}</p>`;
  }
  function famousPanel(n) {
    const f = D.famous.find(x => x.n === n); if (!f) return '<p>Not found.</p>';
    const m = f.meet, a = age(m);
    return `<div class="eyebrow">Notable line${f.category ? '<span>' + esc(f.category) + '</span>' : ''}</div><h2>${esc(f.name)}</h2>
      <dl class="kv"><dt>Their branch</dt><dd>${f.node >= 0 ? goB(f.node) : esc(f.y)}</dd>${f.country ? `<dt>Country</dt><dd>${esc(f.country)}</dd>` : ''}<dt>Shared with you</dt><dd>${goB(m)}</dd>${a ? `<dt>That ancestor lived</dt><dd>${yr(a.tmrca)}</dd>` : ''}</dl>
      <p style="margin-top:12px">Your lines meet at the man at the root of ${esc(T.names[m])}${a ? `, ${ago(a.tmrca)}, ${kin(a, D.mine ? 'your' : "this line's")}` : ''}. A shared branch that old says nothing about recent family; ${num(T.subtreeKits(m))} testers descend from him too.</p>
      <p class="note">${link(discover(f.y), 'Their branch on Discover')}</p>`;
  }
  function strPanel(p) {
    p = +p;
    const ids = STR.ids.filter(id => baseOf(id).panel === p);
    return `<div class="eyebrow">STR panel ${p}${q('panel')}</div><h2>Markers ${PANEL_RANGE[p - 1]}</h2><p>${esc(SR.panels[p - 1])}</p>
      ${sec(`${ids.length} markers`, `<p class="path">${ids.map(id => go('marker', id) + '&nbsp;' + esc(STR.value(me.str || {}, id) || '–')).join(' · ')}</p>`)}`;
  }
  function markerPanel(id) {
    const b = baseOf(id); if (!b) return '<p>Marker not found.</p>';
    const i = SR.info[b.n] || {}, k = STR.ids.indexOf(id) + 1;
    const val = STR.value(me.str || {}, id), v = parseFloat(val), c = val === '' ? COL.dim : ui.strColor === 'speed' && i.r ? speedScale(i.r) : DYE[b.panel - 1];
    const unit = i.m ? (i.m.match(/[ACGT]{2,6}/) || i.m.match(/[ACGTRYSWKMN]{2,6}/) || [null])[0] : null;
    const speed = !i.r ? '' : i.r >= 0.005 ? 'fast' : i.r >= 0.001 ? 'medium' : 'slow';
    const copy = b.copies > 1 ? 'abcd'.indexOf(id.slice(-1)) : 0, pos = i.p?.[copy] ?? i.p?.[0];
    const motifs = motifsHere().filter(m => id in m.v), reps = !isNaN(v) && v < 80 ? Math.floor(v) : 0;
    const cells = [...(unit || '·'.repeat(i.unit || 4))].map(x => `<i style="--c:${BASE[x] || COL.dim}">${x}</i>`).join('');
    return `<div class="eyebrow">STR marker${q('str')}<span>${k} of 111 · panel ${b.panel}</span>${i.fast ? '<span>FamilyTreeDNA lists it as fast</span>' : ''}</div><h2>${esc(id)}</h2>
      <div class="big" style="color:${c}">${esc(val || '–')}</div>
      ${reps ? `<div class="rep" role="img" aria-label="${reps} copies of ${esc(unit || 'the repeat')} in a row">${Array.from({ length: reps }, () => `<span>${cells}</span>`).join('')}</div>
        <p class="note">Drawn as a strand: ${reps} copies of ${unit ? `<b>${esc(unit)}</b>` : `a ${i.unit || 4}-letter unit`} back to back, each letter in its base colour.${unit && i.m !== unit ? ` The full pattern is ${esc(i.m)}.` : ''}</p>`
        : unit || i.unit ? `<div class="rep" role="img" aria-label="One copy of the repeat unit"><span>${cells}</span></div><p class="note">The repeat unit${unit ? ', ' + esc(unit) : ''}. With your results loaded it is drawn as many times as you carry it.</p>` : ''}
      <p>${val ? `${esc(val)} copies of the repeat in a row at this spot.` : 'Not loaded, or not in the test you took.'} An STR is a short stretch of DNA letters repeated back to back, and the test counts the repeats. A son nearly always inherits his father's count.</p>
      ${pos ? ymap([[pos, c]], id + ' on the Y chromosome') : ''}
      <dl class="kv">${i.r ? `<dt>Mutation rate${q('rate')}</dt><dd>${i.r} per generation<br><span class="note">${srcs([SR.sources[i.rs]])}</span></dd><dt>Speed</dt><dd><span class="tag" style="color:${speedScale(i.r)}">${speed}</span> about once in ${num(Math.round(1 / i.r))} father-to-son steps</dd>` : ''}
      ${i.m ? `<dt>Repeat</dt><dd>${esc(i.m)}</dd>` : i.unit ? `<dt>Repeat unit</dt><dd>${i.unit} letters</dd>` : ''}${pos ? `<dt>Position${q('build')}</dt><dd>chrY:${num(pos)} (${esc(i.arm || '')}, GRCh38)</dd>` : ''}</dl>
      ${speed ? `<p style="margin-top:12px">${speed === 'fast' ? 'A fast marker. It separates close relatives: two men who differ here may still share an ancestor a few centuries back.' : speed === 'slow' ? 'A slow marker. It holds steady for thousands of years, so a difference here weighs more than one on a fast marker.' : 'A medium-rate marker, useful over roughly a thousand years.'}</p>` : ''}
      ${i.note ? `<p>${esc(i.note)}</p>` : ''}
      ${b.copies > 1 ? sec('Copies', `<p>${esc(b.n)} sits in ${b.copies} places on the Y, so the test reports ${b.copies} counts: ${STR.ids.filter(x => x.slice(0, -1) === b.n).map(x => go('marker', x) + ' ' + esc(STR.value(me.str || {}, x) || '–')).join(', ')}.</p>`) : ''}
      ${motifs.length ? sec(`In published motifs${q('motif')}`, `<ul class="rows stack">${motifs.map(m => `<li><b>${esc(m.name)}</b>: ${m.v[id]}<span class="sub">${esc(m.text)} ${srcs(m.src)}</span></li>`).join('')}</ul>`) : ''}
      <p class="note" style="margin-top:12px">Positions: ${srcs([SR.sources.YBrowse])}</p>`;
  }
  function matchPanel(id) {
    const m = D.matches.find(x => String(x.id) === String(id)); if (!m) return '<p>Match not found.</p>';
    let h = `<div class="eyebrow">${m.kind === 'y' ? 'Y-DNA match' : 'Family Finder match'}</div><h2>${esc(m.name)}</h2>`;
    if (m.kind === 'y') {
      const t = SR.gd111[m.gd];
      h += `<div class="big" style="color:${gdScale(m.gd)}">${m.gd}</div><p class="note">genetic distance${q('gd')}: repeat steps between your two STR results, at the level of the export</p>
        ${t ? `<p style="margin-top:10px">FamilyTreeDNA's older Y-111 table calls a distance of ${m.gd} "${esc(t[0])}": a 50% chance the common ancestor lived within ${t[1]} generations and 90% within ${t[2]}. At 37 markers the same distance means much less; FamilyTreeDNA shows matches up to 4 at Y-37.</p>` : ''}
        <p class="note">${srcs(SR.gdSrc)}</p>`;
    } else h += `<div class="big" style="color:${COL.ff}">${num(m.shared)} cM</div><p class="note">shared autosomal DNA in centimorgans${q('cm')}${m.longest ? `, longest block ${m.longest} cM` : ''}</p>`;
    h += `<dl class="kv">${m.range ? `<dt>Relationship</dt><dd>${esc(m.range)}</dd>` : ''}${m.hap ? `<dt>Y haplogroup${q('haplogroup')}</dt><dd>${m.node >= 0 ? goB(m.node) : esc(m.hap)}</dd>` : ''}${m.meet >= 0 ? `<dt>Y lines meet</dt><dd>${goB(m.meet)}${age(m.meet) ? ` · ${yr(age(m.meet).tmrca)}` : ''}</dd>` : ''}
      ${m.eka ? `<dt>Earliest ancestor</dt><dd>${esc(m.eka)}</dd>` : ''}${m.surnames ? `<dt>Surnames</dt><dd>${esc(m.surnames)}</dd>` : ''}${m.mt ? `<dt>mtDNA</dt><dd>${esc(m.mt)}</dd>` : ''}${m.country ? `<dt>Country</dt><dd>${esc(m.country)}</dd>` : ''}${m.date ? `<dt>Matched</dt><dd>${esc(m.date)}</dd>` : ''}</dl>`;
    if (m.kind === 'ff' && m.meet >= 0) h += `<p style="margin-top:12px">${m.meet === D.focus || T.under(m.node, D.focus) ? 'Your Y lines meet on your own branch, so a shared paternal line is possible.' : 'Your Y lines split long ago, so any shared ancestor is not on your direct paternal line.'}</p>`;
    return h;
  }
  function chromPanel(c) {
    const s = me.auto?.stats[c], r = me.auto?.roh[c] || [];
    if (!s) return `<div class="empty"><b>No autosomal file loaded</b>Add an autosomal raw file to read chromosome ${esc(c)}.</div>`;
    return `<div class="eyebrow">Chromosome ${esc(c)} · GRCh37${q('build')}</div><h2>Chromosome ${esc(c)}</h2>
      ${stats([[(G.LEN37[c] / 1e6).toFixed(1) + ' Mb', `long${q('mb')}`], [num(s.snps), `SNPs read, ${num(s.nocall)} no-calls`], [pct(s.hetRate), `heterozygous${q('het')}`]])}
      ${c !== 'X' ? `<p>${r.length} runs of homozygosity${q('roh')} of 1 Mb or more, ${(r.reduce((t, g) => t + g.end - g.start, 0) / 1e6).toFixed(1)} Mb in all.</p>` : ''}
      ${r.length ? sec('Runs of homozygosity', `<ul class="rows">${r.map(g => `<li><span>${num(g.start)} to ${num(g.end)}</span><span class="meta">${((g.end - g.start) / 1e6).toFixed(2)} Mb · ${num(g.snps)} SNPs</span></li>`).join('')}</ul>`) : ''}
      ${c === 'X' ? (s.hetRate < .01 ? `<p style="margin-top:12px">Almost every X call is homozygous: one X, from the mother, as in most men. The few heterozygous calls are read errors or sit in the regions the X shares with the Y.</p>` : `<p style="margin-top:12px">Two X chromosomes, one from each parent, as in most women, so the X is heterozygous like the autosomes.</p>`) : ''}`;
  }
  function countryPanel(code) {
    const rows = D.enr?.countries?.[ui.mapNode] || [], r = rows.find(x => x[1] === code);
    if (!r) return '<p>No data.</p>';
    const line = D.line.filter(i => D.enr.countries[T.names[i]]?.some(x => x[1] === code)).map(i => [i, D.enr.countries[T.names[i]].find(x => x[1] === code)]);
    return `<div class="eyebrow">Testers by country${q('testers')}${code === me.home ? '<span>your paternal country</span>' : ''}</div><h2>${esc(r[0])}</h2>
      ${stats([[pct(r[2] / r[3]), `of its testers descend from ${esc(ui.mapNode)}`], [num(r[2]), `of ${num(r[3])} testers`]])}
      <p>${num(r[2])} of the ${num(r[3])} FamilyTreeDNA testers with paternal roots in ${esc(r[0])} descend from ${goB(T.find(ui.mapNode))}.</p>
      ${sec('Down your line', bars(line.map(([i, x]) => [T.names[i], '', x[2], x[3]])))}
      <p class="note" style="margin-top:8px">Testers, not population samples.</p>`;
  }
  function eventPanel(n) {
    const e = EVENTS[n]; if (!e) return '<p>Not found.</p>';
    const g = gens(e[0]), L = D.line.length ? lineAt(e[0]) : null, whose = D.mine ? 'your' : "this line's";
    let h = `<div class="eyebrow">History<span>${esc(e[4])}</span></div><h2>${esc(e[3])}</h2>
      ${stats([[esc(e[1]), 'as dated by the source'], [`~${num(g.n)}`, `generations${q('generation')} ago`]])}`;
    if (L && L.older >= 0) h += `<p class="lead">${L.younger >= 0
      ? `At that time ${whose} paternal ancestor was a man between ${goB(L.older)}, whose founder lived around ${yr(ageOrUp(L.older))}, and ${goB(L.younger)}, around ${yr(ageOrUp(L.younger))}.`
      : `This is after the founder of ${goB(L.older)}, around ${yr(ageOrUp(L.older))}, so ${whose} paternal ancestor then was one of his descendants.`}</p>`;
    else if (D.line.length) h += `<p class="lead">This is older than the deepest dated ancestor on the line.</p>`;
    h += `<p class="note">Source: ${srcs([e[5]])}. Ancestor dates are estimates with wide ranges, so the match-up is approximate.</p>`;
    h += sec('Before and after', `<ul class="rows">${[EVENTS[n - 1], EVENTS[n + 1]].filter(Boolean).map(evRow).join('')}</ul>`);
    return h;
  }

  /* ---------- "?" popovers ---------- */
  let popBtn = null;
  function openPop(btn) {
    const id = btn.dataset.term, g = FACTS.glossary[id]; if (!g) return;
    closePop(false);
    const pop = $('#pop');
    pop.innerHTML = `<h4 id="popTitle">${esc(g[0])}</h4><p>${esc(g[1])}</p><div class="foot"><span>${g[2] ? srcs(g[2]) : ''}</span><button type="button" class="link" data-act="glossary" data-key="${id}">All terms</button></div>`;
    pop.hidden = false; popBtn = btn;
    btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-controls', 'pop');
    const r = btn.getBoundingClientRect(), pw = pop.offsetWidth || 320, ph = pop.offsetHeight || 140;
    let top = r.bottom + 8;
    if (top + ph > innerHeight - 8 && r.top - ph - 8 > 8) top = r.top - ph - 8;
    pop.style.left = clamp(r.left - 14, 8, innerWidth - pw - 8) + 'px';
    pop.style.top = clamp(top, 8, Math.max(8, innerHeight - ph - 8)) + 'px';
    pop.focus({ preventScroll: true });
  }
  function closePop(refocus) {
    const pop = $('#pop'); if (pop.hidden) return;
    pop.hidden = true;
    if (popBtn) { popBtn.setAttribute('aria-expanded', 'false'); if (refocus && popBtn.isConnected) popBtn.focus(); }
    popBtn = null;
  }
  $('#pop').addEventListener('focusout', e => { if (!e.relatedTarget || !$('#pop').contains(e.relatedTarget)) setTimeout(() => { if (!$('#pop').contains(document.activeElement) && document.activeElement !== popBtn) closePop(false); }, 0); });
  document.addEventListener('click', e => {
    const b = e.target.closest?.('.q');
    if (b) { e.preventDefault(); e.stopPropagation(); popBtn === b ? closePop(true) : openPop(b); return; }
    if (!e.target.closest?.('#pop')) closePop(false);
    const o = e.target.closest?.('[data-open]'); if (o) { open(o.dataset.open, o.dataset.key); return; }
    const a = e.target.closest?.('[data-act]'); if (a) act(a.dataset.act, a.dataset.key);
    if (menuOpen && !e.target.closest?.('#viewMenu')) { const vm = $('#viewMenu'); if (vm) vm.open = false; menuOpen = false; }
  }, true);
  document.addEventListener('keydown', e => {
    // R resets the 3D or 2D view, unless the key is typed into a field
    if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest?.('input, textarea, select, [contenteditable]') && ['net', 'time', 'map'].includes(ui.view) && $('#importer').hidden) { e.preventDefault(); resetView(); return; }
    if (e.key !== 'Escape') return;
    if (tourAt >= 0) tour(-1);
    else if (!$('#pop').hidden) closePop(true);
    else if (menuOpen) { const vm = $('#viewMenu'); vm.open = false; menuOpen = false; vm.querySelector('summary').focus(); }
    else if (!$('#importer').hidden) closeImport();
  });

  /* ---------- first-run tour ---------- */
  const TOUR = [
    ['#stage', 'Your line in 3D', 'Every sphere is something on your paternal line: a branch, one of your SNPs, an ancient man, an STR marker. Drag to turn it, scroll to zoom, and click a sphere to read about it.'],
    ['#panel', 'The reading panel', 'Whatever you click opens here: dates, how many generations back, what was happening in the world then, and the sources.'],
    ['nav.views', 'Other ways in', 'Timeline lays the line along time with history marked, Map puts it on a globe with the route your ancestors probably took, Genome draws your chromosomes, and Database holds every table.'],
    ['#panel .q, #bar .q', 'Terms explained', 'A small ? next to a word opens a plain explanation. Help has all of them in one list.'],
    ['#openImport', 'Your own files', 'Add the raw data you download from FamilyTreeDNA, 23andMe, AncestryDNA, MyHeritage or Living DNA. Files are read in this browser and never uploaded.'],
  ];
  let tourAt = -1;
  function tour(k) {
    const box = $('#tour'), ring = $('#tourRing');
    if (k < 0 || k >= TOUR.length) { box.hidden = ring.hidden = true; if (tourAt >= 0) local.set(TOURKEY, 'done'); tourAt = -1; return; }
    if (tourAt < 0 && k === 0 && !(ui.view === 'net' || ui.view === 'time')) setView('net');
    tourAt = k;
    const [sel_, title, text] = TOUR[k], el = document.querySelector(sel_) || $('#stage');
    el.scrollIntoView?.({ block: 'nearest' });
    const r = el.getBoundingClientRect(), pad = 6;
    Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + 2 * pad + 'px', height: r.height + 2 * pad + 'px' });
    box.innerHTML = `<h4 id="tourTitle">${esc(title)}</h4><p>${esc(text)}</p><div class="row"><span class="step">${k + 1} of ${TOUR.length}</span><button type="button" class="btn small" data-tour="skip">Skip</button>${k ? '<button type="button" class="btn small" data-tour="back">Back</button>' : ''}<button type="button" class="btn small primary" data-tour="next">${k === TOUR.length - 1 ? 'Done' : 'Next'}</button></div>`;
    box.hidden = ring.hidden = false;
    const bw = box.offsetWidth || 340, bh = box.offsetHeight || 180;
    let left, top;
    if (r.height > innerHeight * .45 || r.width > innerWidth * .6) { left = r.left + (r.width - bw) / 2; top = r.top + Math.min(r.height * .25, 90); }
    else { left = r.left; top = r.bottom + 14; if (top + bh > innerHeight - 8) top = r.top - bh - 14; }
    box.style.left = clamp(left, 8, innerWidth - bw - 8) + 'px'; box.style.top = clamp(top, 8, Math.max(8, innerHeight - bh - 8)) + 'px';
    box.querySelector('[data-tour=next]').focus({ preventScroll: true });
  }
  $('#tour').addEventListener('click', e => { const b = e.target.closest('[data-tour]'); if (b) tour(b.dataset.tour === 'next' ? tourAt + 1 : b.dataset.tour === 'back' ? tourAt - 1 : -1); });

  /* ---------- views ---------- */
  function setView(v) {
    if (!['net', 'time', 'map', 'genome', 'db', 'help'].includes(v)) v = 'net';
    ui.view = v; saveUi();
    $$('[data-view]').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v));
    $('#v-net').hidden = !(v === 'net' || v === 'time'); $('#v-map').hidden = v !== 'map'; $('#v-genome').hidden = v !== 'genome'; $('#v-db').hidden = v !== 'db'; $('#v-help').hidden = v !== 'help';
    render();
  }
  function render() {
    renderBar();
    $('#sub').textContent = D.focus >= 0 ? T.names[D.focus] : 'Y-DNA explorer';
    if (ui.view === 'net' || ui.view === 'time') renderNet(); else { FG3?.stop(); sim?.stop(); }
    if (ui.view === 'map') renderMap(); else GL?.pauseAnimation();
    if (ui.view === 'genome') renderGenome();
    if (ui.view === 'db') renderDb();
    if (ui.view === 'help') renderHelp();
    $('#names').innerHTML = [...D.line.map(i => T.names[i]), ...STR.ids].map(n => `<option value="${esc(n)}">`).join('');
  }
  $$('[data-view]').forEach(b => b.onclick = () => setView(b.dataset.view));

  $('#find').addEventListener('change', e => {
    const s = e.target.value.trim(); if (!s) return;
    let i = T.find(s); if (i < 0) i = T.find(letterOf(D.focus >= 0 ? D.focus : 0) + '-' + s);
    if (i >= 0) return open('branch', i);
    const k = T.chipByName.get(s.toUpperCase()); if (k != null) return open('snp', k);
    const h = STR.lookup(s);
    if (h) { const b = STR.bases.find(x => x.n === h.base); return open('marker', b.copies > 1 ? b.n + 'abcd'[h.copy ?? 0] : b.n); }
    const a = D.ancient.find(x => baseId(x.id).toUpperCase() === baseId(s).toUpperCase()); if (a) return open('ancient', a.n);
    ui.db = 'branches'; tbl.q = s; setView('db');
  });

  /* ---------- import ---------- */
  function toast(text) { const t = $('#toast'); t.textContent = text; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 5000); }
  const log = text => { const l = $('#importLog'); l.innerHTML += esc(text) + '<br>'; l.scrollTop = l.scrollHeight; };
  function openImport() { $('#importer').hidden = false; $('#importLog').innerHTML = summary(); $('#homeCountry').value = me.home || ''; $('#fileInput').focus(); }
  function closeImport() { $('#importer').hidden = true; $('#openImport').focus(); }
  // Countries from the map data, for the optional paternal country.
  $('#homeCountry').insertAdjacentHTML('beforeend', REF.world.features.map(f => [f.properties.n, f.properties.c]).filter(([, c]) => /^[A-Z]{2}$/.test(c)).sort().map(([n, c]) => `<option value="${esc(c)}">${esc(n)}</option>`).join(''));
  $('#homeCountry').onchange = e => { me.home = e.target.value || null; save(); derive(); render(); open('you', '', true); };
  const summary = () => [me.y && `Y: ${me.y.file}, ${num(me.y.calls.length)} calls`, me.auto && `Autosomal: ${me.auto.file}, ${num(me.auto.rows)} SNPs`,
    STR.count(me.str || {}) && `STR: ${STR.count(me.str)} values`, me.matches.length && `Matches: ${num(me.matches.length)}`].filter(Boolean).map(esc).join('<br>') || 'Nothing loaded yet.';
  async function readText(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) return G.gunzip(bytes);
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return G.unzip(bytes);
    return new TextDecoder().decode(bytes);
  }
  // trait SNPs are looked up by rsid and by GRCh37 position, since companies name some SNPs their own way
  const TRAITKEYS = new Map(NOTES.traits.flatMap(t => [[t.id.toLowerCase(), t.id], ...(t.pos37 ? [[t.chr + ':' + t.pos37, t.id]] : [])]));
  const autosOf = g => Object.keys(g.chroms).filter(c => G.LEN37[c] && c !== 'X');
  async function importFiles(files) {
    for (const f of files) {
      log(`Reading ${f.name}…`);
      try {
        const text = await readText(f), kind = G.sniff(text);
        if (kind === 'genotypes') {
          const vend = G.vendor(text, f.name), g = G.parseGenotypes(text, TRAITKEYS), autos = autosOf(g), xh = g.chroms.X ? G.xHet(g.chroms.X) : null;
          log(`  ${vend.name === 'unknown' ? 'Raw genotype file' : vend.name + ' raw data'}, ${num(g.rows)} SNPs.`);
          if (vend.build !== 37) log(`  Its header says GRCh${vend.build}. Silsila reads autosomal positions as GRCh37, so runs of homozygosity and comparisons may be off; traits are read by SNP name.`);
          if (g.y.size && xh != null && xh > .02) log(`  Two X chromosomes, so the file's ${num(g.y.size)} Y calls are chip noise and are not used.`);
          else if (g.y.size) {
            const y = G.yTo38(g.y, T);
            if (y.hits < 20) log(`  ${num(g.y.size)} Y calls, but only ${y.hits} are SNPs on the tree, too few to place.`);
            else {
              me.y = { file: f.name, calls: [...y.calls], nocall: g.yNoCall, build: y.build, vendor: vend.name, raw: g.y.size }; me.focus = null;
              log(`  ${num(g.y.size)} Y calls; ${num(y.hits)} are SNPs on the tree (GRCh${y.build} positions).`);
            }
          }
          if (autos.length >= 10) {
            const st = {}, roh = {};
            for (const c of Object.keys(G.LEN37)) if (g.chroms[c]) { st[c] = G.chromStats(g.chroms[c]); if (c !== 'X') roh[c] = G.roh(g.chroms[c]); }
            me.auto = { file: f.name, vendor: vend.name, rows: g.rows - g.y.size - g.yNoCall, nocall: g.nocall - g.yNoCall, stats: st, roh, rs: g.rs };
            GENO = { file: f.name, vendor: vend.name, chroms: g.chroms };
            log(`  ${num(me.auto.rows)} autosomal and X SNPs; kept the summaries, not the genotypes.`);
          }
          if (!g.y.size && autos.length >= 10) log('  No Y calls in this file (FamilyTreeDNA sends the Y as a separate file, and women have no Y), so it feeds the Genome view.');
          if (!g.y.size && autos.length < 10) log('  No Y calls and too few autosomes to use.');
        } else if (kind === 'ymatches' || kind === 'ffmatches') {
          const ms = G.parseMatches(text), k = kind === 'ymatches' ? 'y' : 'ff';
          me.matches = me.matches.filter(m => m.kind !== k).concat(ms.map((m, n) => ({ ...m, id: k + n })));
          log(`  ${num(ms.length)} ${k === 'y' ? 'Y-DNA' : 'Family Finder'} matches.`);
        } else if (kind === 'str') {
          me.str = STR.parse(text); log(`  ${STR.count(me.str)} STR values.`);
        } else log(`  Not a file Silsila recognises.`);
      } catch (err) { log(`  Could not read it: ${err.message}`); }
    }
    save(); derive(); hist = []; povSet = false; render(); open('you', '', true);
  }
  $('#openImport').onclick = openImport;
  $('#closeImport').onclick = closeImport;
  $('#fileInput').onchange = e => importFiles([...e.target.files]);
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => importFiles([...e.dataTransfer.files]));
  $('#pasteStr').onclick = () => {
    const v = STR.parse($('#strText').value);
    if (!STR.count(v)) { log('No STR values found. Paste the tables with the marker names (DYS393, DYS390, ...) and the numbers under them.'); return; }
    me.str = v; save(); derive(); render(); log(`${STR.count(v)} STR values loaded.`); open('you', '', true);
  };
  $('#clearData').onclick = () => {
    if ($('#clearData').dataset.armed !== '1') { $('#clearData').dataset.armed = '1'; $('#clearData').textContent = 'Press again to clear'; return; }
    me = blank(); local.set(KEY, null); $('#clearData').dataset.armed = ''; $('#clearData').textContent = 'Clear my data';
    derive(); hist = []; render(); open('you', '', true); log('Cleared.');
  };
  $('#exportData').onclick = () => download('silsila-data.json', JSON.stringify(me), 'application/json');

  window.addEventListener('resize', () => {
    sizeAll();
    if (ui.view === 'map' && !use3d()) renderMap2D(); else if ((ui.view === 'net' || ui.view === 'time') && !use3d()) fit();
    if (tourAt >= 0) tour(tourAt);
    closePop(false);
  });
  if (window.matchMedia?.('(max-width: 860px)').matches) $$('details.legend').forEach(d => { d.open = false; });   // keep the small stage clear
  $('#theme').value = document.documentElement.dataset.theme || 'dark';
  $('#theme').onchange = e => setTheme(e.target.value);
  $('meta[name=theme-color]')?.setAttribute('content', COL.surface);
  derive();
  setView(ui.view);
  open('you', '', true);
  if (!local.get(TOURKEY)) setTimeout(() => { if (tourAt < 0 && $('#importer').hidden) tour(0); }, 900);
})();
