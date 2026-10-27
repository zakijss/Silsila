// Silsila 3D: loads the vendored 3d-force-graph and globe.gl builds on first use and wraps the force graph
// with HTML labels and a canvas overlay that follow the camera. Page logic stays in app.js.
(function () {
  'use strict';
  const S = {};
  S.webgl = (() => {
    try {
      if (!window.WebGLRenderingContext) return false;   // jsdom and very old browsers stop here
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
  })();
  S.reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const loads = {};
  S.load = src => loads[src] || (loads[src] = new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = () => { delete loads[src]; s.remove(); fail(new Error('Could not load ' + src)); };
    document.head.appendChild(s);
  }));

  // host: the element the canvas goes in; labels: a positioned layer for HTML labels; overlay: a canvas drawn every frame.
  S.graph = function (host, labels, overlay, handlers) {
    const fg = new window.ForceGraph3D(host, { controlType: 'orbit' })
      .backgroundColor('rgba(0,0,0,0)').showNavInfo(false)
      .nodeRelSize(1).nodeResolution(12).nodeOpacity(0.95).linkOpacity(1).linkResolution(4)
      .cooldownTime(5000).warmupTicks(20)
      .onNodeClick(handlers.click).onBackgroundClick(handlers.background);
    let raf = 0, items = [], draw = null, moved = false, hover = null;
    fg.controls().addEventListener('start', () => { moved = true; });
    // a double-click on empty space resets the view
    fg.onNodeHover(n => { hover = n; host.style.cursor = n ? 'pointer' : ''; });
    host.addEventListener('dblclick', () => { if (!hover && handlers.reset) handlers.reset(); });
    const ctx = overlay.getContext && overlay.getContext('2d');

    function frame() {
      raf = requestAnimationFrame(frame);
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      const cam = fg.camera().position, t = fg.controls().target;
      const fx = t.x - cam.x, fy = t.y - cam.y, fz = t.z - cam.z;
      // screen position of a point, or null when it is behind the camera
      const proj = (x, y, z) => (x - cam.x) * fx + (y - cam.y) * fy + (z - cam.z) * fz > 0 ? fg.graph2ScreenCoords(x, y, z) : null;
      const boxes = [];
      for (const it of items) {
        const n = it.node, p = n.x == null ? null : proj(n.x, n.y || 0, n.z || 0);
        let show = !!p && p.x > -60 && p.x < w + 60 && p.y > -30 && p.y < h + 30;
        if (show) {
          // labels come in order of importance; one that would overlap an earlier one stays hidden this frame
          if (!it.w) { it.el.style.visibility = 'hidden'; it.el.style.display = ''; it.w = it.el.offsetWidth || it.text.length * 7; it.h = it.el.offsetHeight || 14; it.el.style.visibility = ''; it.shown = true; }
          const b = [p.x - it.w / 2 - 2, p.y - it.dy - it.h - 1, p.x + it.w / 2 + 2, p.y - it.dy + 1];
          if (boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) show = false; else boxes.push(b);
        }
        if (!show) { if (it.shown) { it.el.style.display = 'none'; it.shown = false; } continue; }
        if (!it.shown) { it.el.style.display = ''; it.shown = true; }
        it.el.style.transform = `translate(${Math.round(p.x)}px,${Math.round(p.y - it.dy)}px) translate(-50%,-100%)`;
      }
      if (ctx) {
        const r = window.devicePixelRatio || 1;
        if (overlay.width !== Math.round(w * r) || overlay.height !== Math.round(h * r)) { overlay.width = Math.round(w * r); overlay.height = Math.round(h * r); }
        ctx.setTransform(r, 0, 0, r, 0, 0);
        ctx.clearRect(0, 0, w, h);
        if (draw) draw(ctx, proj, w, h);
      }
    }
    return {
      fg,
      get moved() { return moved; },
      resetMoved() { moved = false; },
      start() { fg.resumeAnimation(); if (!raf) frame(); },
      stop() { cancelAnimationFrame(raf); raf = 0; fg.pauseAnimation(); },
      size(w, h) { if (w && h) fg.width(w).height(h); },
      // [{ node: {x, y, z}, text, cls, dy, click, title }], most important first
      labels(list) {
        labels.textContent = '';
        items = list.map(it => {
          const el = document.createElement(it.click ? 'button' : 'span');
          el.textContent = it.text;
          if (it.cls) el.className = it.cls;
          if (it.click) { el.type = 'button'; el.onclick = it.click; if (it.title) el.title = it.title; }
          el.style.display = 'none';
          labels.appendChild(el);
          return { ...it, el, dy: it.dy ?? 8, w: 0, shown: false };
        });
      },
      overlay(fn) { draw = fn; },
      // Frame the whole graph from the front, the way it first opens.
      reset(ms) {
        const b = fg.getGraphBbox(); if (!b) return;
        moved = true;
        const c = { x: (b.x[0] + b.x[1]) / 2, y: (b.y[0] + b.y[1]) / 2, z: (b.z[0] + b.z[1]) / 2 };
        const cam = fg.camera(), t = Math.tan(cam.fov * Math.PI / 360);
        const d = 1.1 * Math.max((b.y[1] - b.y[0]) / 2 / t, (b.x[1] - b.x[0]) / 2 / t / (cam.aspect || 1)) + (b.z[1] - b.z[0]) / 2;
        fg.cameraPosition({ x: c.x, y: c.y, z: c.z + Math.max(d, 50) }, c, ms);
      },
      // keep the current viewing angle and move in on a node
      fly(n, ms, dist = 300) {
        if (n?.x == null) return;
        moved = true;   // a deliberate move: no automatic refit afterwards
        const c = fg.camera().position, t = fg.controls().target;
        const dx = c.x - t.x, dy = c.y - t.y, dz = c.z - t.z, k = dist / (Math.hypot(dx, dy, dz) || 1);
        fg.cameraPosition({ x: n.x + dx * k, y: n.y + dy * k, z: n.z + dz * k }, { x: n.x, y: n.y, z: n.z }, ms);
      },
    };
  };

  window.Scene3D = S;
})();
