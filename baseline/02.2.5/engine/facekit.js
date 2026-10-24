/* Adventure Studio — face kit: five face anchors per frame.
   Anchors (named as they appear on the picture, like the face rig's "on_image_left"):
     browL, browR, eyeL, eyeR, mouth (the mouth's centre).
   Two sources:
     1. face-api (vladmandic, MIT, vendor/face-api.js) — finds 68 face points in a crop around the head.
     2. Our own tracker — keeps a small snapshot ("template") of each anchor and finds it again in the next frame,
        then checks the five points together against her face shape (move / grow / tilt as a whole, small give per
        point), so one bad match is outvoted instead of dragging a point away.
   Each frame gets anchors, a confidence, head size and tilt, a rough left/right turn and an expression guess. */
(function (root) {
  'use strict';
  const NAMES = ['browL', 'browR', 'eyeL', 'eyeR', 'mouth'];
  const LABEL = { browL: 'Brow (left on picture)', browR: 'Brow (right on picture)', eyeL: 'Eye (left on picture)', eyeR: 'Eye (right on picture)', mouth: 'Mouth (centre)' };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const eyeDist = A => (A && A.eyeL && A.eyeR ? Math.hypot(A.eyeR[0] - A.eyeL[0], A.eyeR[1] - A.eyeL[1]) : 0);

  /* ---------- face-api, loaded from the models built into this file (no downloads) ---------- */
  let loading = null;
  function ready() {
    if (loading) return loading;
    loading = (async () => {
      const fa = root.faceapi, M = root.FA_MODELS; if (!fa || !M) return false;
      try {
        const tf = fa.tf;
        for (const [name, net] of [['tiny_face_detector_model', fa.nets.tinyFaceDetector], ['face_landmark_68_model', fa.nets.faceLandmark68Net], ['face_expression_model', fa.nets.faceExpressionNet]]) {
          const m = M[name], bin = atob(m.bin), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          await net.loadFromWeightMap(tf.io.decodeWeights(u8.buffer, m.manifest[0].weights));
        }
        return true;
      } catch (e) { console.warn('face finder could not start', e); return false; }
    })();
    return loading;
  }
  // find the face in `region` of a canvas (or the whole canvas). Returns anchors in canvas coordinates, or null.
  async function detect(canvas, region) {
    if (!(await ready())) return null;
    const R = region ? { x: Math.max(0, Math.round(region.x)), y: Math.max(0, Math.round(region.y)), w: 0, h: 0 } : { x: 0, y: 0, w: canvas.width, h: canvas.height };
    if (region) { R.w = Math.round(Math.min(canvas.width - R.x, region.w)); R.h = Math.round(Math.min(canvas.height - R.y, region.h)); }
    if (R.w < 24 || R.h < 24) return null;
    // the face finder likes faces of a reasonable size: scale the crop so its longer side is about 320 px
    const k = Math.min(3, 320 / Math.max(R.w, R.h)), c = document.createElement('canvas');
    c.width = Math.round(R.w * k); c.height = Math.round(R.h * k);
    const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, c.width, c.height); g.drawImage(canvas, R.x, R.y, R.w, R.h, 0, 0, c.width, c.height);
    const fa = root.faceapi;
    let d = null;
    try { d = await fa.detectSingleFace(c, new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 })).withFaceLandmarks().withFaceExpressions(); } catch (e) { d = null; }
    if (!d) return null;
    const P = d.landmarks.positions.map(p => [R.x + p.x / k, R.y + p.y / k]);
    const avg = (a, b) => { let x = 0, y = 0; for (let i = a; i <= b; i++) { x += P[i][0]; y += P[i][1]; } return [x / (b - a + 1), y / (b - a + 1)]; };
    const A = { browL: avg(17, 21), browR: avg(22, 26), eyeL: avg(36, 41), eyeR: avg(42, 47), mouth: avg(48, 59) };
    const ed = eyeDist(A), mid = [(A.eyeL[0] + A.eyeR[0]) / 2, (A.eyeL[1] + A.eyeR[1]) / 2];
    const ex = Object.entries(d.expressions).sort((a, b) => b[1] - a[1])[0];
    const B = d.detection.box;
    return { anchors: A, landmarks: P, nose: P[30], score: d.detection.score, box: { x: R.x + B.x / k, y: R.y + B.y / k, w: B.width / k, h: B.height / k },
      yaw: ed ? (P[30][0] - mid[0]) / ed : 0, pitch: pitchOf(A, P[30]), roll: Math.atan2(A.eyeR[1] - A.eyeL[1], A.eyeR[0] - A.eyeL[0]), expression: { name: ex[0], p: +ex[1].toFixed(2) }, eyeDist: ed };
  }

  // how far down the face the nose tip sits, between the eye line (0) and the mouth (1): small = chin up, big = chin down
  function pitchOf(A, nose) {
    const mid = [(A.eyeL[0] + A.eyeR[0]) / 2, (A.eyeL[1] + A.eyeR[1]) / 2], dx = A.mouth[0] - mid[0], dy = A.mouth[1] - mid[1], L = Math.hypot(dx, dy) || 1;
    return ((nose[0] - mid[0]) * dx + (nose[1] - mid[1]) * dy) / (L * L);
  }

  /* ---------- grey copies of frames for the template tracker ---------- */
  function grey(data, w, h) { const g = new Float32Array(w * h); for (let i = 0; i < w * h; i++) g[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114; return g; }
  function patch(G, w, h, cx, cy, half) {
    const n = 2 * half + 1, p = new Float32Array(n * n); let s = 0;
    for (let y = -half; y <= half; y++) for (let x = -half; x <= half; x++) {
      const X = clamp(Math.round(cx + x), 0, w - 1), Y = clamp(Math.round(cy + y), 0, h - 1), v = G[Y * w + X];
      p[(y + half) * n + x + half] = v; s += v;
    }
    const m = s / p.length; let q = 0, q2 = 0;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; p[i] -= m; q += p[i] * p[i]; if (!(x & 1) && !(y & 1)) q2 += p[i] * p[i]; }
    return { p, half, norm: Math.sqrt(q) || 1, norm2: Math.sqrt(q2) || 1 };
  }
  // how alike a template is to the picture at (cx, cy): 1 = identical pattern, 0 = unrelated (normalised correlation)
  function ncc(G, w, h, cx, cy, T, step = 1) {
    const half = T.half, n = 2 * half + 1; let s = 0, cnt = 0;
    for (let y = -half; y <= half; y += step) for (let x = -half; x <= half; x += step) { const X = clamp(cx + x, 0, w - 1), Y = clamp(cy + y, 0, h - 1); s += G[Y * w + X]; cnt++; }
    const m = s / cnt; let num = 0, den = 0;
    for (let y = -half; y <= half; y += step) for (let x = -half; x <= half; x += step) {
      const X = clamp(cx + x, 0, w - 1), Y = clamp(cy + y, 0, h - 1), v = G[Y * w + X] - m, t = T.p[(y + half) * n + x + half];
      num += v * t; den += v * v;
    }
    return den > 1 ? num / (Math.sqrt(den) * (step === 1 ? T.norm : T.norm2)) : 0;
  }
  // best match of a template within `rad` px of (px, py): coarse 2-px search then 1-px refine
  function search(G, w, h, px, py, rad, T) {
    let best = { x: Math.round(px), y: Math.round(py), s: -1 };
    for (let y = Math.round(py - rad); y <= py + rad; y += 2) for (let x = Math.round(px - rad); x <= px + rad; x += 2) {
      const s = ncc(G, w, h, x, y, T, 2); if (s > best.s) best = { x, y, s };
    }
    const c = best; best = { x: c.x, y: c.y, s: -1 };
    for (let y = c.y - 2; y <= c.y + 2; y++) for (let x = c.x - 2; x <= c.x + 2; x++) { const s = ncc(G, w, h, x, y, T, 1); if (s > best.s) best = { x, y, s }; }
    return best;
  }
  // similarity fit (move + grow + tilt) of reference points onto matched points, with weights
  function fitSim(src, dst, wts) {
    let W = 0, sx = 0, sy = 0, dx = 0, dy = 0;
    src.forEach((p, i) => { const k = wts[i]; W += k; sx += p[0] * k; sy += p[1] * k; dx += dst[i][0] * k; dy += dst[i][1] * k; });
    if (W <= 0) return null; sx /= W; sy /= W; dx /= W; dy /= W;
    let a = 0, b = 0, n = 0;
    src.forEach((p, i) => { const k = wts[i], X = p[0] - sx, Y = p[1] - sy, U = dst[i][0] - dx, V = dst[i][1] - dy; a += k * (X * U + Y * V); b += k * (X * V - Y * U); n += k * (X * X + Y * Y); });
    if (n <= 0) return null; a /= n; b /= n;
    return { a, b, tx: dx - (a * sx - b * sy), ty: dy - (b * sx + a * sy), scale: Math.hypot(a, b), roll: Math.atan2(b, a) };
  }
  const apply = (T, p) => [T.a * p[0] - T.b * p[1] + T.tx, T.b * p[0] + T.a * p[1] + T.ty];

  /* ---------- key poses: what her face looks like at the extremes you mark (tags are as seen on the picture:
     "left" = toward the picture's left). hide = anchors that usually can't be seen in that pose. ---------- */
  const TAGS = [
    ['straight', 'Straight on', []], ['3q-left', 'Three-quarter turn left', []], ['3q-right', 'Three-quarter turn right', []],
    ['side-left', 'Sideways left (profile)', ['eyeL', 'browL']], ['side-right', 'Sideways right (profile)', ['eyeR', 'browR']],
    ['shoulder-left', 'Looking back over the shoulder, left', ['eyeL', 'browL']], ['shoulder-right', 'Looking back over the shoulder, right', ['eyeR', 'browR']],
    ['back', 'Reared back (chin up)', []], ['forward', 'Lolled forward (chin down)', []], ['thrown-back', 'Head thrown back (big laugh, gasp)', []],
    ['up', 'Looking up', []], ['down', 'Looking down', []], ['up-left', 'Looking up and left', []], ['up-right', 'Looking up and right', []],
    ['down-left', 'Looking down and left', []], ['down-right', 'Looking down and right', []],
    ['tilt-left', 'Tilted left (ear toward shoulder)', []], ['tilt-right', 'Tilted right (ear toward shoulder)', []],
    ['lean-in', 'Leaning in (face bigger)', []], ['lean-away', 'Leaning away (face smaller)', []], ['ducked', 'Ducked / hunched down', []],
    ['hair-over', 'Hair over the face', []], ['hand-over', 'Hand or arm over the face', []],
    ['away', 'Turned away (back of the head)', ['browL', 'browR', 'eyeL', 'eyeR', 'mouth']], ['custom', 'Other (name it)', []],
  ];
  const EXPR = [['', '— no expression tag —'], ['neutral', 'Neutral'], ['talking', 'Talking'], ['mouth-open', 'Mouth open'], ['shouting', 'Shouting / singing'],
    ['laughing', 'Laughing'], ['smiling', 'Smiling'], ['grinning', 'Grinning (teeth)'], ['smirk', 'Smirking'], ['frowning', 'Frowning'], ['pouting', 'Pouting'],
    ['kissing', 'Kiss / pursed lips'], ['surprised', 'Surprised'], ['scared', 'Scared'], ['angry', 'Angry'], ['sad', 'Sad / crying'], ['disgusted', 'Disgusted'],
    ['eyes-closed', 'Eyes closed'], ['blinking', 'Blinking'], ['squinting', 'Squinting'], ['wink-left', 'Winking (left on picture)'], ['wink-right', 'Winking (right on picture)'],
    ['tongue-out', 'Tongue out'], ['yawning', 'Yawning'], ['puffed', 'Cheeks puffed'], ['biting-lip', 'Biting lip']];
  const tagLabel = t => (TAGS.find(x => x[0] === t) || [t, t])[1];

  // her still sets the "face space": centred on the five anchors, one unit = their average distance from the centre,
  // turned so the eye line is level. Every pose is compared in this space, so size, place and tilt don't matter.
  function canonFrame(A) {
    const ks = NAMES.filter(k => A[k]); let ox = 0, oy = 0; ks.forEach(k => { ox += A[k][0]; oy += A[k][1]; }); ox /= ks.length; oy /= ks.length;
    let u = 0; ks.forEach(k => { u += (A[k][0] - ox) ** 2 + (A[k][1] - oy) ** 2; }); u = Math.sqrt(u / ks.length) || 1;
    const th = A.eyeL && A.eyeR ? Math.atan2(A.eyeR[1] - A.eyeL[1], A.eyeR[0] - A.eyeL[0]) : 0, c = Math.cos(-th), s = Math.sin(-th);
    return { unit: u, to: p => { const x = (p[0] - ox) / u, y = (p[1] - oy) / u; return [x * c - y * s, x * s + y * c]; } };
  }
  const angDiff = (from, to) => { let d = to - from; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };   // to − from, in −π..π
  const inv = (T, p) => { const dx = p[0] - T.tx, dy = p[1] - T.ty, d = T.a * T.a + T.b * T.b || 1; return [(T.a * dx + T.b * dy) / d, (-T.b * dx + T.a * dy) / d]; };
  // the rubber bands: pairs of anchors whose distance must stay within what her key poses showed
  const PAIRS = [['eyeL', 'eyeR'], ['browL', 'browR'], ['browL', 'eyeL'], ['browR', 'eyeR'], ['eyeL', 'mouth'], ['eyeR', 'mouth'], ['browL', 'mouth'], ['browR', 'mouth'], ['browL', 'eyeR'], ['browR', 'eyeL']];
  function solve(M, b) {                                 // small linear system (Gaussian elimination)
    const n = b.length, A = M.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-9) continue; [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
    }
    return A.map((r, i) => (Math.abs(r[i]) < 1e-9 ? 0 : r[n] / r[i]));
  }

  class PoseModel {
    // still: { anchors, hidden }, poses: [{ anchors, hidden, tag, label }] or learned [{ shape, hidden, tag, label }]
    constructor(still, poses = []) {
      this.names = NAMES.filter(k => still.anchors[k]); this.still = still;
      const C = canonFrame(still.anchors); this.C = C; this.unit = C.unit;
      const S0 = this.names.map(k => C.to(still.anchors[k])), hid0 = Object.assign({}, still.hidden);
      this.shapes = [{ tag: 'still', label: still.label || 'like her still', pts: S0, hidden: hid0 }];
      for (const p of poses) {
        let pts; const hid = Object.assign({}, p.hidden);
        if (p.shape) pts = this.names.map((k, i) => (p.shape[k] ? [S0[i][0] + p.shape[k][0], S0[i][1] + p.shape[k][1]] : null));   // learned: a change from her still
        else {
          const ks = this.names.filter(k => p.anchors && p.anchors[k] && !hid[k] && !hid0[k]);
          if (ks.length < 2) continue;                       // fewer than two anchors seen: it can't be lined up (e.g. turned away)
          const T = fitSim(ks.map(k => p.anchors[k]), ks.map(k => still.anchors[k]), ks.map(() => 1)); if (!T) continue;
          pts = this.names.map(k => (p.anchors[k] ? C.to(apply(T, p.anchors[k])) : null));
        }
        pts = pts.map((q, i) => q || S0[i].slice());
        pts = this.pure(S0, pts);                            // keep only the change of shape (not a move, grow or tilt)
        this.shapes.push({ tag: p.tag, label: p.label || tagLabel(p.tag), pts, hidden: hid, learned: !!p.shape, id: p.id });
      }
      this.bands = [];
      for (const [a, b] of PAIRS) {
        const i = this.names.indexOf(a), j = this.names.indexOf(b); if (i < 0 || j < 0) continue;
        const L = this.shapes.map(s => Math.hypot(s.pts[i][0] - s.pts[j][0], s.pts[i][1] - s.pts[j][1])), lo = Math.min(...L), hi = Math.max(...L);
        const pad = this.shapes.length > 1 ? Math.max(0.08 * hi, (hi - lo) * 0.12) : 0.16 * hi;     // no key poses yet: looser bands (we don't know her range)
        this.bands.push({ a, b, i, j, lo: Math.max(0.05, lo - pad), hi: hi + pad });
      }
    }
    get n() { return this.shapes.length - 1; }
    // remove from a pose whatever a move, grow or tilt of the still could explain, so the mix measures only the change of shape
    pure(S0, pts) {
      const f = a => a.flatMap(p => p), d = f(pts).map((v, i) => v - f(S0)[i]), B = [];
      for (const v of [f(S0), S0.flatMap(p => [-p[1], p[0]]), S0.flatMap(() => [1, 0]), S0.flatMap(() => [0, 1])]) {
        const u = v.slice(); for (const b of B) { const k = u.reduce((t, x, i) => t + x * b[i], 0); for (let i = 0; i < u.length; i++) u[i] -= k * b[i]; }
        const L = Math.hypot(...u); if (L > 1e-9) B.push(u.map(x => x / L));
      }
      for (const b of B) { const k = d.reduce((t, x, i) => t + x * b[i], 0); for (let i = 0; i < d.length; i++) d[i] -= k * b[i]; }
      return S0.map((p, i) => [p[0] + d[2 * i], p[1] + d[2 * i + 1]]);
    }
    // the face shape for a mix c (how far toward each key pose, 0..1 each)
    shapeAt(c) {
      const S0 = this.shapes[0].pts;
      return S0.map((p, k) => { let x = p[0], y = p[1]; for (let i = 0; i < c.length; i++) if (c[i]) { const s = this.shapes[i + 1].pts[k]; x += c[i] * (s[0] - p[0]); y += c[i] * (s[1] - p[1]); } return [x, y]; });
    }
    // how visible each anchor should be for a mix (a pose where it's hidden pulls it toward "hidden")
    visibility(c) {
      const sum = c.reduce((s, v) => s + v, 0), w0 = Math.max(0, 1 - sum), tot = w0 + sum || 1;
      return this.names.map(k => { let v = w0 * (this.shapes[0].hidden[k] ? 0 : 1); c.forEach((ci, i) => { v += ci * (this.shapes[i + 1].hidden[k] ? 0 : 1); }); return v / tot; });
    }
    // fit to matched points m[i] = { x, y, w } (or null). cPrev: last frame's mix (keeps the pose from jumping).
    // Returns where the face shape says each anchor is, the mix, and the move/size/tilt (T, face space → picture).
    fit(m, cPrev, opt = {}) {
      const n = this.n, lam = opt.lambda ?? 0.02, mu = opt.smooth ?? 0.08;
      let c = cPrev && cPrev.length === n ? cPrev.slice() : new Array(n).fill(0), T = null, out = new Set(), vis = this.visibility(c);
      for (let round = 0; round < 3; round++) {
        // fit move/size/tilt and the pose mix together (Gauss-Newton: small repeated corrections that each reduce the error)
        const idx = this.names.map((k, i) => i).filter(i => m[i] && m[i].w > 0 && !out.has(i));
        if (idx.length < 2) return null;
        { const sh = this.shapeAt(c); T = fitSim(idx.map(i => sh[i]), idx.map(i => [m[i].x, m[i].y]), idx.map(i => m[i].w * Math.max(0.05, vis[i]))); }
        if (!T || !(T.scale > 0)) return null;
        if (opt.roll0 != null) { const d = angDiff(opt.roll0, T.roll), lim = clamp(d, -0.45, 0.45); if (d !== lim) { const sh = this.shapeAt(c), rr = d - lim, cs = Math.cos(-rr), sn = Math.sin(-rr); let cx = 0, cy = 0, W = 0; idx.forEach(i => { const p = apply(T, sh[i]), w = m[i].w; cx += p[0] * w; cy += p[1] * w; W += w; }); cx /= W; cy /= W; const a2 = T.a * cs - T.b * sn, b2 = T.a * sn + T.b * cs, t = apply({ a: cs, b: sn, tx: 0, ty: 0 }, [T.tx - cx, T.ty - cy]); T = { a: a2, b: b2, tx: cx + t[0], ty: cy + t[1], scale: Math.hypot(a2, b2), roll: Math.atan2(b2, a2) }; } }
        if (opt.scale0 > 0) { const r = T.scale / opt.scale0, lim = clamp(r, 0.92, 1.09); if (r !== lim) { const sh = this.shapeAt(c), k = lim / r; let cx = 0, cy = 0, W = 0; idx.forEach(i => { const p = apply(T, sh[i]), w = m[i].w; cx += p[0] * w; cy += p[1] * w; W += w; }); cx /= W; cy /= W; T = { a: T.a * k, b: T.b * k, tx: cx + (T.tx - cx) * k, ty: cy + (T.ty - cy) * k, scale: T.scale * k, roll: T.roll }; } }
        const S0 = this.shapes[0].pts, D = this.shapes.slice(1).map(s => s.pts.map((p, k) => [p[0] - S0[k][0], p[1] - S0[k][1]]));
        const useMix = n && idx.length >= 3, np = 4 + (useMix ? n : 0);
        for (let it = 0; it < 25; it++) {
          const sh = this.shapeAt(c), H = Array.from({ length: np }, () => new Array(np).fill(0)), g = new Array(np).fill(0); let wsum = 0;
          for (const i of idx) {
            const w = m[i].w * Math.max(0.05, vis[i]), X = sh[i][0], Y = sh[i][1]; wsum += w;
            const px = T.a * X - T.b * Y + T.tx, py = T.b * X + T.a * Y + T.ty, rx = m[i].x - px, ry = m[i].y - py;
            const Jx = [X, -Y, 1, 0], Jy = [Y, X, 0, 1];
            if (useMix) for (let q = 0; q < n; q++) { const d = D[q][i]; Jx.push(T.a * d[0] - T.b * d[1]); Jy.push(T.b * d[0] + T.a * d[1]); }
            for (let r = 0; r < np; r++) { g[r] += w * (Jx[r] * rx + Jy[r] * ry); for (let q = 0; q < np; q++) H[r][q] += w * (Jx[r] * Jx[q] + Jy[r] * Jy[q]); }
          }
          const s2 = T.scale * T.scale;                       // keep the mix terms in picture units
          if (useMix) for (let q = 0; q < n; q++) { const r = 4 + q, e = s2 * idx.reduce((t, i) => t + m[i].w * Math.max(0.05, vis[i]) * (D[q][i][0] ** 2 + D[q][i][1] ** 2), 0) + 1e-6; H[r][r] += (lam + mu) * e; g[r] -= e * (lam * c[q] + mu * (c[q] - ((cPrev && cPrev[q]) || 0))); }
          // size brake: a head can't grow or shrink much between two frames, so pull the size toward last frame's
          // (keeps the current tilt). Without it, points that are off can be 'explained' by a much bigger face.
          if (opt.scale0 > 0) { const K = (opt.scaleK ?? 2) * wsum, rc = Math.atan2(T.b, T.a), r0 = opt.roll0 == null ? rc : rc + angDiff(rc, opt.roll0) * 0.5, a0 = opt.scale0 * Math.cos(r0), b0 = opt.scale0 * Math.sin(r0); H[0][0] += K; H[1][1] += K; g[0] -= K * (T.a - a0); g[1] -= K * (T.b - b0); }
          for (let r = 0; r < np; r++) H[r][r] += 1e-6 + H[r][r] * 0.01;
          const dlt = solve(H, g);
          const a2 = T.a + dlt[0], b2 = T.b + dlt[1]; T = { a: a2, b: b2, tx: T.tx + dlt[2], ty: T.ty + dlt[3], scale: Math.hypot(a2, b2), roll: Math.atan2(b2, a2) };
          if (useMix) { c = c.map((v, q) => clamp(v + dlt[4 + q], 0, 1.25)); const s = c.reduce((t, v) => t + v, 0); if (s > 1.35) c = c.map(v => v * 1.35 / s); vis = this.visibility(c); }
          if (Math.abs(dlt[2]) + Math.abs(dlt[3]) < 0.01 && (!useMix || dlt.slice(4).every(v => Math.abs(v) < 0.002))) break;
        }
        // drop the point that disagrees most with the face shape (a bad match), then fit again
        const sh = this.shapeAt(c); let worst = -1, wd = 0; const left = this.names.map((k, i) => i).filter(i => m[i] && m[i].w > 0 && !out.has(i));
        for (const i of left) { const p = apply(T, sh[i]), d = Math.hypot(p[0] - m[i].x, p[1] - m[i].y) / T.scale; if (d > wd) { wd = d; worst = i; } }
        if (wd > (opt.outlier ?? 0.32) && left.length > 3) out.add(worst); else break;
      }
      const sh = this.shapeAt(c), resid = this.names.map((k, i) => (m[i] ? Math.hypot(apply(T, sh[i])[0] - m[i].x, apply(T, sh[i])[1] - m[i].y) / T.scale : null));
      return { T, c, vis, sh, model: sh.map(p => apply(T, p)), out, resid };
    }
    // pull anchors back inside the bands (soft: a point a band says is too far keeps 30% of its overshoot).
    // pts: picture points; conf: 0..1 per anchor (sure points hold their ground). Returns the corrected points and band states.
    band(pts, T, conf) {
      const q = pts.map(p => inv(T, p)), state = [];
      for (let pass = 0; pass < 3; pass++) for (const B of this.bands) {
        const A = q[B.i], C2 = q[B.j], dx = C2[0] - A[0], dy = C2[1] - A[1], d = Math.hypot(dx, dy) || 1e-6;
        let ex = 0; if (d > B.hi) ex = d - B.hi; else if (d < B.lo) ex = d - B.lo; if (!ex) continue;
        const mv = ex * 0.7, wa = 1 - (conf[B.i] ?? 0.5) * 0.9, wb = 1 - (conf[B.j] ?? 0.5) * 0.9, s = wa + wb || 1, ux = dx / d, uy = dy / d;
        A[0] += ux * mv * wa / s; A[1] += uy * mv * wa / s; C2[0] -= ux * mv * wb / s; C2[1] -= uy * mv * wb / s;
      }
      for (const B of this.bands) { const d = Math.hypot(q[B.j][0] - q[B.i][0], q[B.j][1] - q[B.i][1]); state.push({ a: B.a, b: B.b, ok: d <= B.hi * 1.001 && d >= B.lo * 0.999, d, lo: B.lo, hi: B.hi }); }
      return { pts: q.map(p => apply(T, p)), state };
    }
    // the band states of a set of anchors as they are (for drawing)
    check(A) {
      const ks = this.names.filter(k => A[k]); if (ks.length < 2) return [];
      const T = fitSim(this.names.filter(k => A[k]).map(k => this.shapes[0].pts[this.names.indexOf(k)]), ks.map(k => A[k]), ks.map(() => 1)); if (!T) return [];
      return this.bands.filter(B => A[B.a] && A[B.b]).map(B => { const d = Math.hypot(A[B.b][0] - A[B.a][0], A[B.b][1] - A[B.a][1]) / T.scale; return { a: B.a, b: B.b, ok: d <= B.hi && d >= B.lo, d, lo: B.lo, hi: B.hi }; });
    }
    // words for a mix: the strongest key pose and how far toward it
    describe(c) {
      let bi = -1, bv = 0; c.forEach((v, i) => { if (v > bv) { bv = v; bi = i; } });
      const mix = {}; c.forEach((v, i) => { if (v >= 0.05) { const t = this.shapes[i + 1].tag; mix[t] = Math.max(mix[t] || 0, Math.round(v * 100)); } });
      if (bi < 0 || bv < 0.3) return { tag: 'still', label: 'like her still', amt: Math.round((1 - bv) * 100), mix };
      const S = this.shapes[bi + 1]; return { tag: S.tag, label: S.label, amt: Math.round(Math.min(1, bv) * 100), mix };
    }
    // the move/size/tilt from her still's picture to this frame (for the face circle and garment boxes)
    rigid(T) { const ks = this.names; return fitSim(ks.map(k => this.still.anchors[k]), this.shapes[0].pts.map(p => apply(T, p)), ks.map(() => 1)); }
    // her face shapes in face space, to remember on the character for her next video
    export() { const S0 = this.shapes[0].pts; return this.shapes.slice(1).filter(s => !s.learned).map(s => ({ tag: s.tag, label: s.label, hidden: s.hidden, shape: Object.fromEntries(this.names.map((k, i) => [k, [+(s.pts[i][0] - S0[i][0]).toFixed(4), +(s.pts[i][1] - S0[i][1]).toFixed(4)]])) })); }
  }

  /* ---------- the tracker: follows the five anchors from frame to frame ----------
     Each anchor keeps several snapshots: from her still, from each key pose, and from frames you fixed by hand.
     The matches are fitted to her face shape (a mix of her key poses), the rubber bands keep the anchors' spacing
     believable, and the lead anchor (the most distinctive, usually the mouth) counts extra when it's sure. */
  class Tracker {
    // ref: anchors on the still; G: grey still; vis: anchors seen on the still; opt: { poses: [{anchors, hidden, tag, label, G, w, h}], learned, lead, stiff }
    constructor(G, w, h, ref, vis, opt = {}) {
      this.ref = JSON.parse(JSON.stringify(ref)); this.vis = Object.assign({}, vis); this.opt = opt;
      this.ed0 = eyeDist(ref) || 30; this.half = clamp(Math.round(this.ed0 * 0.22), 4, 22);
      const hidden = Object.fromEntries(NAMES.map(k => [k, this.vis[k] === false]));
      const poses = (opt.poses || []).concat((opt.learned || []).filter(L => !(opt.poses || []).some(p => p.tag === L.tag)));
      this.model = new PoseModel({ anchors: this.ref, hidden }, poses);
      this.T0 = {}; this.T1 = {}; this.bank = {};
      for (const k of NAMES) { this.bank[k] = []; if (ref[k] && this.vis[k] !== false) { this.T0[k] = patch(G, w, h, ref[k][0], ref[k][1], this.half); this.T1[k] = this.T0[k]; this.bank[k].push({ T: this.T0[k], src: 'still' }); } }
      // snapshots from the key poses (sized to the face in that pose)
      this.model.shapes.forEach((S, si) => {
        if (!si || S.learned) return; const p = (opt.poses || []).find(q => q.id === S.id); if (!p || !p.G) return;
        const ks = NAMES.filter(k => p.anchors[k] && !(p.hidden || {})[k] && ref[k]); const T = ks.length >= 2 ? fitSim(ks.map(k => p.anchors[k]), ks.map(k => ref[k]), ks.map(() => 1)) : null;
        const half = clamp(Math.round(this.half / (T ? T.scale : 1)), 4, 28);
        for (const k of ks) { const t = patch(p.G, p.w, p.h, p.anchors[k][0], p.anchors[k][1], half); this.bank[k].push({ T: t, src: 'pose', si }); if (!this.T1[k]) this.T1[k] = t; }
      });
      this.scale = this.model.unit; this.roll = null; { const T = this.simOf(this.ref); if (T) this.roll = T.roll; } this.mix = new Array(this.model.n).fill(0); this.prev = null; this.prev2 = null;
      this.lead = this.pickLead(G, w, h, opt.lead || 'auto');
      this.stiff = { loose: 0.95, normal: this.model.n ? 0.75 : 0.9, firm: 0.45 }[opt.stiff || 'normal'] ?? 0.75;   // no key poses: her still's shape is only a rough guide, so trust the matches more
    }
    // how distinctive each anchor is on the still: strong contrast, and nothing nearby that looks the same
    distinct(G, w, h) {
      const out = {};
      for (const k of NAMES) {
        const T = this.T0[k]; if (!T) continue; const n = 2 * T.half + 1, std = T.norm / n; let worst = -1;
        for (const r of [T.half * 0.8, T.half * 1.4, T.half * 2]) for (let a = 0; a < 16; a++) { const x = Math.round(this.ref[k][0] + Math.cos(a / 16 * Math.PI * 2) * r), y = Math.round(this.ref[k][1] + Math.sin(a / 16 * Math.PI * 2) * r); worst = Math.max(worst, ncc(G, w, h, x, y, T, 1)); }
        out[k] = +((1 - Math.max(0, worst)) * Math.min(1, std / 18)).toFixed(3);
      }
      return out;
    }
    pickLead(G, w, h, want) {
      this.distinctness = this.distinct(G, w, h);
      if (want === 'mouth') return ['mouth']; if (want === 'eyes') return ['eyeL', 'eyeR']; if (want === 'brows') return ['browL', 'browR']; if (want === 'none') return [];
      // automatic: the mouth (measured best on her test clips), unless it can't be seen on the still; then the eyes
      const best = this.T0.mouth ? 'mouth' : this.T0.eyeL && this.T0.eyeR ? 'eyes' : 'brows'; this.autoLead = best;
      return best === 'mouth' ? ['mouth'] : best === 'eyes' ? ['eyeL', 'eyeR'] : ['browL', 'browR'];
    }
    // re-learn what an anchor looks like (after a confident frame); fix = a frame you placed by hand: kept as an extra snapshot
    relearn(G, w, h, A, which = NAMES, fix = false) {
      const half = clamp(Math.round(this.half * (this.scale / this.model.unit || 1)), 4, 28);
      for (const k of which) if (A[k] && this.bank[k]) {
        const t = patch(G, w, h, A[k][0], A[k][1], half); this.T1[k] = t;
        if (fix) {                                       // fix: a name for the frame, so re-cutting it replaces its snapshot
          const same = this.bank[k].findIndex(b => b.src === 'fix' && b.key === fix); if (same >= 0) this.bank[k].splice(same, 1);
          const fx = this.bank[k].filter(b => b.src === 'fix'); if (fx.length >= 4) this.bank[k].splice(this.bank[k].indexOf(fx[0]), 1);
          this.bank[k].push({ T: t, src: 'fix', key: fix });
        }
      }
    }
    // which snapshots to try for anchor k this frame: recent, still, the key poses she's closest to, your fixes
    choices(k) {
      const top = this.mix.map((v, i) => [v, i + 1]).filter(x => x[0] > 0.12).sort((a, b) => b[0] - a[0]).slice(0, 2).map(x => x[1]);
      return this.bank[k].filter(b => b.src === 'still' || b.src === 'fix' || (b.src === 'pose' && (top.includes(b.si) || this.model.n <= 2)));
    }
    // place anchors A (from the face finder or your hand) in her face space: gives the pose mix, size and tilt
    describe(A) {
      const M = this.model, m = M.names.map(k => (A[k] ? { x: A[k][0], y: A[k][1], w: 1 } : null)), f = M.fit(m, this.mix, { outlier: 9 });
      if (!f) return null; return { mix: f.c, pose: M.describe(f.c), rigid: M.rigid(f.T), scale: f.T.scale, roll: f.T.roll, bands: M.check(A) };
    }
    // track into a new frame
    track(G, w, h) {
      const P = this.prev, P2 = this.prev2, M = this.model, names = M.names; if (!P) return null;
      const sc = this.scale || M.unit; let rad = clamp(sc * 0.8, 6, 60);
      const vel = {}; let vmax = 0;
      for (const k of names) if (P[k]) { const v = P2 && P2[k] ? [P[k][0] - P2[k][0], P[k][1] - P2[k][1]] : [0, 0]; vel[k] = v; vmax = Math.max(vmax, Math.hypot(v[0], v[1])); }
      // moving fast: look further. Heads bounce (a dance beat reverses the motion in one frame), so the search is
      // centred only a little way along the motion and is wide enough to catch a reversal too.
      rad = clamp(rad + vmax * 1.0, 6, 80);
      // find one anchor near a guess: the recent snapshot over the full radius, the others a little closer in
      const find = (k, g, r) => {
        let best = search(G, w, h, g[0], g[1], r, this.T1[k]), from = 'recent';
        const r1 = best;
        for (const bk of this.choices(k)) {
          // her still's snapshot only refines the recent match (alone it can latch onto look-alikes when she turns);
          // key-pose and fix snapshots also search on their own, since they show her as she looks in that pose
          const q = bk.src === 'still' ? search(G, w, h, r1.x, r1.y, 3, bk.T) : search(G, w, h, g[0], g[1], r * 0.7, bk.T);
          if (q.s > best.s) { best = q; from = bk.src; }
        }
        return { x: best.x, y: best.y, s: best.s, from };
      };
      // A) every anchor searched two ways: close in, along the motion (best when she moves smoothly), and wide,
      //    only a little along the motion (catches a bounce). The one that fits her face shape better wins, so the
      //    wide search can't pull a steady face onto a look-alike nearby.
      const radN = clamp(sc * 0.62 + vmax * 0.5, 6, 80);
      const mN = names.map(k => (P[k] && this.bank[k].length ? find(k, [P[k][0] + vel[k][0] * 0.7, P[k][1] + vel[k][1] * 0.7], radN) : null));
      const mW = names.map(k => (P[k] && this.bank[k].length ? find(k, [P[k][0] + vel[k][0] * 0.35, P[k][1] + vel[k][1] * 0.35], rad) : null));
      const quality = mm => {
        const bb = mm.map(r => (r ? { x: r.x, y: r.y, w: Math.max(0.03, r.s) ** 2 } : null)), ff = M.fit(bb, this.mix, { scale0: sc, roll0: this.roll }); if (!ff) return -1;
        let q = 0, n = 0; mm.forEach((r, i) => { if (!r) return; n++; if (ff.out.has(i) || ff.resid[i] == null) return; q += Math.max(0, r.s) * Math.exp(-((ff.resid[i] / 0.15) ** 2)); });
        return n ? q / n : -1;
      };
      const same = mN.every((r, i) => !r || !mW[i] || (r.x === mW[i].x && r.y === mW[i].y));
      const mA = same ? mN : quality(mW) > quality(mN) + 0.03 ? mW : mN;
      this.lastSearch = same ? 'same' : mA === mW ? 'wide' : 'close';
      // B) the lead anchor searched wide (heads bounce and reverse), then the others near where it says the face went.
      //    B is used only when the whole face matches better that way, so one look-alike can't drag the face off.
      let m = mA;
      const li = this.lead.map(k => names.indexOf(k)).filter(i => i >= 0 && mA[i]);
      if (li.length) {
        const wide = li.map(i => { const k = names[i], b = find(k, P[k], Math.min(90, Math.max(rad, sc * 1.6))); /* no further than about one face-width: past that it's more likely someone else's face */ return b.s > 0.6 && Math.hypot(b.x - mA[i].x, b.y - mA[i].y) > 3 ? [i, b] : null; }).filter(Boolean);
        if (wide.length) {
          const shift = [wide.reduce((t, [i, b]) => t + b.x - P[names[i]][0], 0) / wide.length, wide.reduce((t, [i, b]) => t + b.y - P[names[i]][1], 0) / wide.length];
          const mB = names.map((k, i) => { const wb = wide.find(x => x[0] === i); if (wb) return wb[1]; return P[k] && this.bank[k].length ? find(k, [P[k][0] + shift[0], P[k][1] + shift[1]], rad) : null; });
          const score = mm => { const v = mm.filter(Boolean).map(r => Math.max(0, r.s)); return v.length ? v.reduce((t, x) => t + x, 0) / v.length : 0; };
          if (score(mA) < 0.75 && score(mB) > score(mA) + 0.06) m = mB;          // only when the usual way is clearly struggling
        }
      }
      const lead = this.lead, vis0 = M.visibility(this.mix);
      // first fit with every anchor counted by how well it matched; then the lead anchor counts extra, but only
      // if it agrees with the rest of the face (a lead that changed its look, like a mouth closing, mustn't drag the face)
      const base = m.map((r, i) => (r ? { x: r.x, y: r.y, w: Math.max(0.03, r.s) ** 2 * (vis0[i] < 0.4 ? 0.1 : 1) } : null));
      const so = { scale0: sc, roll0: this.roll };
      const f0 = M.fit(base, this.mix, so); if (!f0) return null;
      let leadSure = false;
      const mm = base.map((r, i) => {
        if (!r || !lead.includes(names[i])) return r;
        const ok = m[i].s > 0.55 && !f0.out.has(i) && f0.resid[i] != null && f0.resid[i] < 0.16;
        if (ok) leadSure = true; return Object.assign({}, r, { w: r.w * (ok ? 2.5 : 0.6) });
      });
      const f = M.fit(mm, this.mix, so); if (!f) return null;
      // each anchor: the face shape's spot, pulled toward its own match by how sure the match is
      const A0 = [], conf = {}, aconf = [];
      names.forEach((k, i) => {
        const p = f.model[i], r = m[i], v = f.vis[i];
        if (!r || f.out.has(i)) { A0.push(p); aconf.push(0); conf[k] = r ? Math.max(0, r.s) * 0.4 : 0; return; }
        const a = this.stiff * clamp((r.s - 0.2) / 0.3, 0, 1) * clamp((v - 0.3) / 0.5, 0, 1);
        A0.push([p[0] + a * (r.x - p[0]), p[1] + a * (r.y - p[1])]); aconf.push(a); conf[k] = v < 0.4 ? 0 : r.s;
      });
      const bd = M.band(A0, f.T, aconf), A = {};
      names.forEach((k, i) => { A[k] = bd.pts[i]; });
      const seen = names.filter((k, i) => m[i] && f.vis[i] >= 0.4);
      let c = seen.length ? seen.reduce((s, k) => s + conf[k], 0) / seen.length : 0;
      // does it still look like HER features (her still, her poses or your fixes)? guards against drifting onto something else
      let id = 0, nid = 0; for (const k of seen) { let b = -1; for (const t of this.choices(k)) b = Math.max(b, ncc(G, w, h, Math.round(A[k][0]), Math.round(A[k][1]), t.T, 1)); id += Math.max(0, b); nid++; } id = nid ? id / nid : 0;
      if (id < 0.25) c *= 0.6;
      let shape = null; if (!M.n) { const s2 = shapeOK(A); if (!s2.ok) { c *= 0.3; shape = s2.why; } }
      const hidden = names.filter((k, i) => f.vis[i] < 0.4);
      const stretched = bd.state.filter(s => !s.ok).map(s => s.a + '–' + s.b);
      return { anchors: A, conf, confidence: c, identity: id, outliers: [...f.out].map(i => names[i]), scale: f.T.scale, roll: f.T.roll, shape,
        mix: f.c, pose: M.describe(f.c), rigid: M.rigid(f.T), hidden, stretched, lead: leadSure ? lead : [], from: Object.fromEntries(names.map((k, i) => [k, m[i] ? m[i].from : null])) };
    }
    // the frame's final face: it becomes "last frame" for the next one
    accept(A, info) { this.prev2 = this.prev; this.prev = JSON.parse(JSON.stringify(A)); if (info && info.mix) this.mix = info.mix.slice(); if (info && info.scale) this.scale = info.scale; if (info && info.roll != null) this.roll = info.roll; else if (!info) { const T = this.simOf(A); if (T) { this.roll = T.roll; this.scale = T.scale; } } }
    // tilt of a face (face space → picture) from anchors alone, e.g. ones you placed by hand
    simOf(A) { const ks = this.model.names.filter(k => A[k]); if (ks.length < 2) return null; return fitSim(ks.map(k => this.model.shapes[0].pts[this.model.names.indexOf(k)]), ks.map(k => A[k]), ks.map(() => 1)); }
  }

  /* ---------- does it still look like a face? mouth below the eyes, brows above them, sensible distances ---------- */
  function shapeOK(A) {
    if (!A.eyeL || !A.eyeR) return { ok: true };
    const ed = eyeDist(A); if (ed < 3) return { ok: false, why: 'eyes on top of each other' };
    const ux = (A.eyeR[0] - A.eyeL[0]) / ed, uy = (A.eyeR[1] - A.eyeL[1]) / ed, mid = [(A.eyeL[0] + A.eyeR[0]) / 2, (A.eyeL[1] + A.eyeR[1]) / 2];
    const down = p => (-uy * (p[0] - mid[0]) + ux * (p[1] - mid[1])) / ed;      // distance below the eye line, in eye-widths
    if (A.mouth) { const d = down(A.mouth); if (d < 0.55 || d > 2.4) return { ok: false, why: 'mouth not below the eyes' }; }
    for (const k of ['browL', 'browR']) if (A[k]) { const d = down(A[k]); if (d > 0.05 || d < -1.1) return { ok: false, why: 'brow not above the eyes' }; }
    return { ok: true };
  }
  /* ---------- the face area for the cut-out: an oval from the anchors (never keyed away) ---------- */
  function faceOval(A) {
    const ed = eyeDist(A); if (!ed) return null;
    const eyes = [(A.eyeL[0] + A.eyeR[0]) / 2, (A.eyeL[1] + A.eyeR[1]) / 2], mo = A.mouth || [eyes[0], eyes[1] + ed];
    const cx = (eyes[0] + mo[0]) / 2, cy = (eyes[1] + mo[1]) / 2, roll = Math.atan2(A.eyeR[1] - A.eyeL[1], A.eyeR[0] - A.eyeL[0]);
    const down = Math.hypot(mo[0] - eyes[0], mo[1] - eyes[1]) || ed;
    return { cx, cy, rx: ed * 0.95, ry: Math.max(down * 1.05, ed * 0.9), roll };
  }
  const inOval = (O, x, y) => { const c = Math.cos(-O.roll), s = Math.sin(-O.roll), dx = x - O.cx, dy = y - O.cy, X = dx * c - dy * s, Y = dx * s + dy * c; return (X / O.rx) ** 2 + (Y / O.ry) ** 2 <= 1; };

  root.FaceKit = { NAMES, LABEL, TAGS, EXPR, tagLabel, ready, detect, grey, Tracker, PoseModel, eyeDist, faceOval, inOval, fitSim, apply, inv, shapeOK };
})(window);
