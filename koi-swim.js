// The koi swim from Lauren's main site, shared by the contact card and the paint-a-koi pond preview.
// Same model as index.html and works/: the body follows the path its head has swum (follow-the-leader),
// a gentle carp wave that grows toward the tail, beat-and-glide (2.6 s of beats, 1.6 s of coasting),
// pectoral fins that fold while beating and spread in the glide, whiskers that drift around the mouth,
// and the pair kept half a loop apart so they never swim on top of each other.
window.KoiSwim = (() => {
  const N = 56, M = 17;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mul = (a, s) => [a[0] * s, a[1] * s], len = a => Math.hypot(a[0], a[1]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
  const smooth = x => x * x * (3 - 2 * x);
  const IDX = []; for (let i = 0; i < N - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = a + 1, c = a + M, d = c + 1; IDX.push(a, c, b, b, c, d); }

  function resample(pts, n, extHead, extTail) {
    const p = pts.map(q => q.slice());
    const h = norm(sub(p[0], p[1])), t = norm(sub(p[p.length - 1], p[p.length - 2]));
    p.unshift(add(p[0], mul(h, extHead))); p.push(add(p[p.length - 1], mul(t, extTail)));
    const dense = [];
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
      for (let k = 0; k < 20; k++) { const s = k / 20, s2 = s * s, s3 = s2 * s;
        dense.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * s + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * s2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * s3))); }
    }
    dense.push(p[p.length - 1]);
    const acc = [0]; for (let i = 1; i < dense.length; i++) acc.push(acc[i - 1] + len(sub(dense[i], dense[i - 1])));
    const L = acc[acc.length - 1], out = [];
    for (let i = 0, j = 0; i < n; i++) {
      const target = L * i / (n - 1);
      while (j < dense.length - 2 && acc[j + 1] < target) j++;
      const f = (target - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j]);
      out.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f]);
    }
    return { pts: out, L, offset: extHead };
  }
  function normals(pts, win) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - win)], b = pts[Math.min(n - 1, i + win)]; const t = norm(sub(b, a)); out.push([-t[1], t[0]]); }
    return out;
  }

  // o: { spine (head to tail, texture px), body, half, bodyHalf, phase0, freq, texW, texH, unit, ext? }
  // unit = texture px per site px (1 for the site's koi textures, 1/0.3 for the full-size paint layers)
  function rig(o) {
    const u = o.unit || 1, k = Object.assign({}, o, { unit: u });
    const ext = o.ext || [120, 240, 80];      // the mesh runs well past snout, tail and fins so the soft halo is never clipped
    const r = resample(o.spine, N, ext[0] * u, ext[1] * u);
    k.half = o.half + ext[2] * u;
    k.rest = r.pts; k.s = r.pts.map((_, i) => r.L * i / (N - 1) - r.offset);   // s = 0 at the snout
    const nr = normals(k.rest, 4);
    k.cols = Array.from({ length: M }, (_, j) => -k.half + 2 * k.half * j / (M - 1));
    k.uv = new Float32Array(N * M * 2);
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const q = add(k.rest[i], mul(nr[i], k.cols[j])); k.uv[(i * M + j) * 2] = q[0] / o.texW; k.uv[(i * M + j) * 2 + 1] = q[1] / o.texH; }
    k.pos = new Float32Array(N * M * 2);
    return k;
  }

  // a closed rounded loop (e = 1 is an oval, e < 1 squares it off like her About loop), with an arc-length table
  function superLoop(cx, cy, rx, ry, e) { const n = 2048, p = [], d = [0];
    for (let i = 0; i <= n; i++) { const f = 2 * Math.PI * i / n, c = Math.cos(f), sn = Math.sin(f);
      p.push([cx + rx * Math.sign(c) * Math.abs(c) ** e, cy - ry * Math.sign(sn) * Math.abs(sn) ** e]); if (i) d.push(d[i - 1] + len(sub(p[i], p[i - 1]))); }
    return { p, d, P: d[n], n }; }
  function loopAt(L, dist) {
    let x = ((dist % L.P) + L.P) % L.P, lo = 0, hi = L.n;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.d[m] <= x) lo = m; else hi = m; }
    const f = (x - L.d[lo]) / Math.max(1e-6, L.d[hi] - L.d[lo]);
    return { p: add(L.p[lo], mul(sub(L.p[hi], L.p[lo]), f)), tan: norm(sub(L.p[hi], L.p[lo])) };
  }
  function trackPush(k, q) {
    const n = k.tp.length;
    if (n) { const l = len(sub(q, k.tp[n - 1])); if (l < 0.5) return; k.td.push(k.td[n - 1] + l); } else k.td.push(0);
    k.tp.push(q);
  }
  function trackAt(k, D) {
    const n = k.tp.length; D = Math.max(k.td[0], Math.min(k.td[n - 1], D));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (k.td[m] <= D) lo = m; else hi = m; }
    const f = (D - k.td[lo]) / Math.max(1e-6, k.td[hi] - k.td[lo]);
    return { p: add(k.tp[lo], mul(sub(k.tp[hi], k.tp[lo]), f)), tan: norm(sub(k.tp[hi], k.tp[lo])) };
  }
  function feed(k) {                         // keep plenty of planned path ahead of the head; round and round, never off the pond
    const L = k.plan.loop, step = L.P / 600;
    while (k.td[k.td.length - 1] - k.dist < L.P * 0.6) { for (let i = 1; i <= 100; i++) trackPush(k, loopAt(L, k.plan.u + i * step).p); k.plan.u += 100 * step; }
    if (k.tp.length > 3000) { k.tp.splice(0, 1000); k.td.splice(0, 1000); }
  }
  // lay a fresh track with history behind the head at loop distance u; sc = screen px per site px
  function startTrack(k, L, u, sc) {
    k.tp = []; k.td = []; const step = L.P / 600;
    for (let i = 0; i <= 600; i++) trackPush(k, loopAt(L, u - L.P + i * step).p);
    k.dist = k.td[k.td.length - 1]; k.plan = { loop: L, u }; k.sc = sc; feed(k);
  }

  function beatEnvelope(t, k) {
    const cycle = 4.2, tt = (t + k.phase0 * 1.3) % cycle;       // 2.6 s beating, 1.6 s gliding
    if (tt < 0.35) return smooth(tt / 0.35);
    if (tt < 2.6) return 1;
    if (tt < 3.2) return 1 - smooth((tt - 2.6) / 0.6) * 0.78;
    if (tt < 3.85) return 0.22;
    return 0.22 + smooth((tt - 3.85) / 0.35) * 0.78;
  }
  // move koi k on by dt seconds and fill k.pos with the mesh in screen px. other: the second koi, kept half a loop away
  function pose(k, t, dt, other) {
    k.envS = k.envS === undefined ? beatEnvelope(t, k) : k.envS + (beatEnvelope(t, k) - k.envS) * Math.min(1, dt * 1.6);
    const env = k.envS, u0 = k.unit, sc = k.sc / u0;            // sc: screen px per texture px
    k.speed = k.speed === undefined ? 120 : k.speed + ((70 + 95 * env) - k.speed) * Math.min(1, dt * 1.2);
    let space = 1;
    if (other && other.plan && other.plan.loop === k.plan.loop && other.td) {
      const L = k.plan.loop, uk = k.plan.u - (k.td[k.td.length - 1] - k.dist), uo = other.plan.u - (other.td[other.td.length - 1] - other.dist);
      const lead = (((uk - uo) % L.P) + L.P) % L.P;
      space = 1 - 0.6 * Math.tanh((lead - L.P / 2) / (L.P * 0.08));
    }
    k.space = k.space === undefined ? space : k.space + (space - k.space) * Math.min(1, dt * 1.2);
    k.dist += k.speed * k.sc * k.space * dt; feed(k);
    const headD = k.dist, hp = trackAt(k, headD);
    const Lb = k.body, lam = 1.35 * Lb, w = 2 * Math.PI * k.freq * (0.75 + 0.25 * env);
    k.wphase = (k.wphase || 0) + w * dt;
    const P = [];
    for (let i = 0; i < N; i++) {
      const s = k.s[i], pa = trackAt(k, headD - Math.max(s, 0) * sc);
      let base = pa.p; const tan = s < 0 ? hp.tan : pa.tan;
      if (s < 0) base = add(hp.p, mul(tan, -s * sc));
      const nrm = [-tan[1], tan[0]], u = Math.max(0, s) / Lb;
      let A = 0.012 - 0.04 * u + 0.085 * u * u; if (u > 1) A = 0.057 + 0.045 * (u - 1); A = Math.max(A, 0.008);
      let lat = Lb * A * Math.sin(2 * Math.PI * s / lam - k.wphase) * (0.35 + 0.65 * env);
      if (u > 1) lat += 2.5 * u0 * (u - 1) * Math.sin(4 * Math.PI * s / lam - 1.3 * k.wphase);
      if (u > 0.85) lat += -Lb * 0.05 * (1 - env) * (u - 0.85);
      P.push(add(base, mul(nrm, lat * sc)));
    }
    const nn = normals(P, 8);
    let iM = 0; k.s.forEach((s, i) => { if (Math.abs(s - 0.04 * Lb) < Math.abs(k.s[iM] - 0.04 * Lb)) iM = i; });
    const mouth = P[iM], wt = k.wt = (k.wt || 0) + dt;
    for (let i = 0; i < N; i++) {
      const u = Math.max(0, k.s[i]) / Lb, tan = [nn[i][1], -nn[i][0]];
      for (let j = 0; j < M; j++) {
        const v = k.cols[j] * sc; let q = add(P[i], mul(nn[i], v));
        const out = Math.abs(v) - k.bodyHalf * sc;
        if (out > 0 && u > 0.12 && u < 0.6) {          // pectoral fins fold back while beating, spread in the glide
          const zone = Math.sin(Math.PI * (u - 0.12) / 0.48), fold = (0.15 + 0.4 * env) * zone;
          q = add(q, mul(tan, -out * fold * 0.55)); q = add(q, mul(nn[i], -Math.sign(v) * out * fold * 0.25));
        }
        if (k.s[i] < 0.1 * Lb) {                        // whiskers drift around the mouth, each side on its own rhythm
          const r = len(sub(q, mouth)), ww = smooth(Math.max(0, Math.min(1, (r - 38 * u0 * sc) / (70 * u0 * sc)))) * (k.s[i] < 0.06 * Lb ? 1 : (0.1 * Lb - k.s[i]) / (0.04 * Lb));
          if (ww > 0) {
            const side = Math.sign(v) || 1;
            const a = ww * (0.16 * Math.sin(wt * 1.5 + side * 1.2 + k.phase0) + 0.06 * Math.sin(wt * 2.9 + side * 0.4 + k.phase0 * 2));
            const d = sub(q, mouth), c = Math.cos(a), sn = Math.sin(a);
            q = add(mouth, [d[0] * c - d[1] * sn, d[0] * sn + d[1] * c]);
          }
        }
        k.pos[(i * M + j) * 2] = q[0]; k.pos[(i * M + j) * 2 + 1] = q[1];
      }
    }
  }

  // her two koi, as on the main site. A visitor who painted a koi at /koi/ sees theirs in place of the orange one.
  function siteKoi(base) {
    const K = [
      { src: base + 'koi-orange-pad.webp?v=3', spine: [[712,112],[705,200],[678,285],[625,358],[552,410],[478,442],[405,462],[310,500],[210,540],[110,570]],
        body: 513, half: 235, bodyHalf: 78, phase0: 0.0, freq: 0.68, lap0: 0 },
      { src: base + 'koi-painted-pad.webp?v=3', spine: [[172,505],[200,440],[250,375],[325,300],[412,244],[500,206],[560,186],[660,160],[780,138],[900,125]],
        body: 521, half: 285, bodyHalf: 85, phase0: 1.7, freq: 0.62, lap0: 0.5 }
    ];
    try { const tex = localStorage.getItem('koi-paint-tex-v2');
      if (tex && tex.startsWith('data:image/')) Object.assign(K[0], { src: tex, body: 525, half: 228, bodyHalf: 80,
        spine: [[2350,170],[2340,300],[2330,450],[2280,650],[2160,850],[2000,1000],[1800,1120],[1550,1210],[1250,1290],[950,1340],[600,1400],[250,1460],[20,1500]].map(([x, y]) => [x * 0.3, y * 0.3]) });
    } catch (e) {}
    K.forEach(k => { k.spine = k.spine.map(q => [q[0] + 100, q[1] + 100]); });   // the textures carry a 100px margin
    return K;
  }

  return { N, M, IDX, rig, superLoop, startTrack, pose, siteKoi };
})();
