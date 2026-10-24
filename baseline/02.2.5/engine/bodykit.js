/* Adventure Studio — body kit: a simple skeleton per frame.
   The body-pose finder is MoveNet SinglePose Lightning (Google, Apache-2.0; converted by Vladimir Mandic, MIT),
   embedded in vendor/movenet-model.js and run on face-api's built-in AI runtime, so it works offline.
   It marks 17 points; left / right are HER left and right (not the picture's), as is usual for skeletons.
   On top of the finder: bone-length rubber bands (a forearm can't suddenly double), a guess from the last frame
   for points it isn't sure about, and your hand fixes. */
(function (root) {
  'use strict';
  const NAMES = ['nose', 'eyeL', 'eyeR', 'earL', 'earR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];
  const LABEL = { nose: 'Nose', eyeL: 'Her left eye', eyeR: 'Her right eye', earL: 'Her left ear', earR: 'Her right ear', shoulderL: 'Her left shoulder', shoulderR: 'Her right shoulder', elbowL: 'Her left elbow', elbowR: 'Her right elbow', wristL: 'Her left wrist', wristR: 'Her right wrist', hipL: 'Her left hip', hipR: 'Her right hip', kneeL: 'Her left knee', kneeR: 'Her right knee', ankleL: 'Her left ankle', ankleR: 'Her right ankle' };
  // the joints shown and edited (the eyes and ears are the face tracker's job; the nose stands for the head)
  const JOINTS = ['nose', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];
  // bones: [from, to]; limb bones get length bands
  const BONES = [['shoulderL', 'shoulderR'], ['hipL', 'hipR'], ['shoulderL', 'hipL'], ['shoulderR', 'hipR'], ['shoulderL', 'elbowL'], ['elbowL', 'wristL'], ['shoulderR', 'elbowR'], ['elbowR', 'wristR'], ['hipL', 'kneeL'], ['kneeL', 'ankleL'], ['hipR', 'kneeR'], ['kneeR', 'ankleR'], ['nose', 'shoulderL'], ['nose', 'shoulderR']];
  const LIMBS = BONES.slice(4, 12);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  let loading = null, model = null;
  function ready() {
    if (loading) return loading;
    loading = (async () => {
      const fa = root.faceapi, M = root.MOVENET_MODEL; if (!fa || !M) return false;
      try {
        // The original module relies on the browser's preferred TFJS backend. In sandboxed/headless
        // and file:// contexts the preferred WASM runtime can fail to load its .wasm URL.
        // Explicitly choose WebGL where available, with bundled CPU fallback (no network asset).
        const tf = fa.tf;
        let gpu = false; try { gpu = !!(await tf.setBackend('webgl')); } catch (_) {}
        if (!gpu) await tf.setBackend('cpu');
        const bin = atob(M.bin), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        model = await tf.loadGraphModel(tf.io.fromMemory({ modelTopology: M.topology, weightSpecs: M.specs, weightData: u8.buffer, format: M.format }));
        return true;
      } catch (e) { console.warn('body-pose finder could not start', e); return false; }
    })();
    return loading;
  }
  // run the finder on a square crop {x, y, s} of a canvas; points in canvas coordinates
  async function runCrop(canvas, C) {
    const tf = root.faceapi.tf, N = 192, c = document.createElement('canvas'); c.width = N; c.height = N;
    const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, N, N); g.drawImage(canvas, C.x, C.y, C.s, C.s, 0, 0, N, N);
    const out = tf.tidy(() => model.execute(tf.cast(tf.expandDims(tf.browser.fromPixels(c), 0), 'int32')));
    const v = await out.data(); out.dispose();
    const P = {}; NAMES.forEach((k, i) => { P[k] = { x: C.x + v[i * 3 + 1] * C.s, y: C.y + v[i * 3] * C.s, s: v[i * 3 + 2] }; });
    return P;
  }
  // Unified Prep v0.1: single-pass inference for longer mannequin sequences. This leaves
  // checkpoint 31's multi-pass detect() untouched and exposes an explicit fast mode.
  async function detectFast(canvas, box) {
    if (!(await ready())) return null;
    const B = box || {x:0,y:0,w:canvas.width,h:canvas.height};
    const P = await runCrop(canvas, square(B.x,B.y,B.x+B.w,B.y+B.h,1.12));
    const joints = {}, score = {};
    for (const k of NAMES) { joints[k]=[P[k].x,P[k].y];score[k]=+P[k].s.toFixed(3); }
    return {joints,score,agree:0,conf:JOINTS.reduce((sum,k)=>sum+score[k],0)/JOINTS.length,fast:true};
  }
  const square = (x0, y0, x1, y1, pad) => { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = Math.max(x1 - x0, y1 - y0) * pad; return { x: cx - s / 2, y: cy - s / 2, s }; };
  // find her skeleton inside `box` (her outline's box). Two passes: the whole figure, then a tighter crop around
  // the points found (the finder is more exact when she fills its view).
  async function detect(canvas, box) {
    if (!(await ready())) return null;
    const B = box || { x: 0, y: 0, w: canvas.width, h: canvas.height };
    let P = await runCrop(canvas, square(B.x, B.y, B.x + B.w, B.y + B.h, 1.12));
    const sure = NAMES.filter(k => P[k].s > 0.3);
    if (sure.length >= 6) {
      const xs = sure.map(k => P[k].x), ys = sure.map(k => P[k].y);
      const P2 = await runCrop(canvas, square(Math.min(...xs, B.x), Math.min(...ys), Math.max(...xs, B.x + B.w), Math.max(...ys, B.y + B.h), 1.18));
      for (const k of NAMES) if (P2[k].s >= P[k].s * 0.9) P[k] = P2[k];
    }
    // a second look at the frame mirrored (left and right swapped back): where the two looks agree the point is surer,
    // where they disagree (often a left / right mix-up, or a limb the finder can't see) it is doubted
    let agree = 0;
    if (sure.length >= 6) {
      const W = canvas.width, m = document.createElement('canvas'); m.width = W; m.height = canvas.height; const mg = m.getContext('2d'); mg.translate(W, 0); mg.scale(-1, 1); mg.drawImage(canvas, 0, 0);
      const xs = NAMES.map(k => P[k].x), ys = NAMES.map(k => P[k].y), C = square(Math.min(...xs, B.x), Math.min(...ys), Math.max(...xs, B.x + B.w), Math.max(...ys, B.y + B.h), 1.18);
      const Q = await runCrop(m, { x: W - C.x - C.s, y: C.y, s: C.s }), flip = k => (k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k);
      const mid = (a, b) => [(P[a].x + P[b].x) / 2, (P[a].y + P[b].y) / 2], tor = Math.hypot(...[0, 1].map(i => mid('shoulderL', 'shoulderR')[i] - mid('hipL', 'hipR')[i])) || C.s * 0.3;
      for (const k of JOINTS) {
        const q = Q[flip(k)], X = W - q.x, dd = Math.hypot(X - P[k].x, q.y - P[k].y);
        if (dd < tor * 0.12) { P[k] = { x: (P[k].x + X) / 2, y: (P[k].y + q.y) / 2, s: Math.max(P[k].s, q.s) }; agree++; }
        else if (q.s > 0.3) P[k] = Object.assign({}, P[k], { s: P[k].s * 0.6 });
      }
    }
    const joints = {}, score = {}; for (const k of NAMES) { joints[k] = [P[k].x, P[k].y]; score[k] = +P[k].s.toFixed(3); }
    const js = JOINTS.map(k => score[k]); return { joints, score, agree, conf: js.reduce((a, b) => a + b, 0) / js.length };
  }

  /* ---------- following her through the video ----------
     ref: the still's joints (as approved by you). Bone lengths on the still set each limb's band; a limb can look
     shorter (pointing toward or away from the camera) but not much longer. */
  class Follower {
    constructor(ref) {
      this.ref = JSON.parse(JSON.stringify(ref)); this.prev = null; this.prev2 = null;
      this.len = {}; for (const [a, b] of BONES) if (ref[a] && ref[b]) this.len[a + '-' + b] = dist(ref[a], ref[b]);
      this.size = this.torso(ref) || 100;
    }
    torso(J) { const s = J.shoulderL && J.shoulderR ? [(J.shoulderL[0] + J.shoulderR[0]) / 2, (J.shoulderL[1] + J.shoulderR[1]) / 2] : null, h = J.hipL && J.hipR ? [(J.hipL[0] + J.hipR[0]) / 2, (J.hipL[1] + J.hipR[1]) / 2] : null; return s && h ? dist(s, h) : 0; }
    // d = the finder's result for this frame (or null). Returns { joints, conf (per joint 0..1), fixed: [joints the bands or the guess moved] }
    step(d) {
      const P = this.prev, P2 = this.prev2, J = {}, conf = {}, fixed = [];
      // how big she is now compared with her still (torso length), so the bands scale with her
      const t = d ? this.torso(Object.fromEntries(['shoulderL', 'shoulderR', 'hipL', 'hipR'].map(k => [k, d.score[k] > 0.25 ? d.joints[k] : null]))) : 0;
      const k = clamp(t ? t / this.size : this.k || 1, 0.5, 2); this.k = this.k ? this.k * 0.7 + k * 0.3 : k;
      for (const n of JOINTS) {
        const s = d ? d.score[n] : 0, guess = P && P[n] ? (P2 && P2[n] ? [P[n][0] + (P[n][0] - P2[n][0]) * 0.5, P[n][1] + (P[n][1] - P2[n][1]) * 0.5] : P[n]) : null;
        if (d && s >= 0.3) {
          // a sure point is used as found, but a big jump from the last frame with only middling sureness is doubted
          const jump = guess ? dist(d.joints[n], guess) / (this.size * this.k) : 0;
          if (guess && s < 0.5 && jump > 0.45) { J[n] = guess; conf[n] = 0.2; fixed.push(n); }
          else { J[n] = d.joints[n].slice(); conf[n] = s; }
        } else if (guess) { J[n] = guess; conf[n] = 0.15; fixed.push(n); }
        else if (d) { J[n] = d.joints[n].slice(); conf[n] = s; }
      }
      // left / right mix-ups: when the two arms (or legs) match the last frame much better swapped, swap them back
      if (P) for (const [l, r, what] of [[['elbowL', 'wristL'], ['elbowR', 'wristR'], 'arms'], [['kneeL', 'ankleL'], ['kneeR', 'ankleR'], 'legs']]) {
        const ok = [...l, ...r].every(n => J[n] && P[n]); if (!ok) continue;
        const now = l.reduce((s, n, i) => s + dist(J[n], P[n]) + dist(J[r[i]], P[r[i]]), 0), sw = l.reduce((s, n, i) => s + dist(J[r[i]], P[n]) + dist(J[n], P[r[i]]), 0);
        if (sw < now * 0.55 && now > this.size * this.k * 0.3) { l.forEach((n, i) => { const t = J[n]; J[n] = J[r[i]]; J[r[i]] = t; const c = conf[n]; conf[n] = conf[r[i]]; conf[r[i]] = c; }); fixed.push(...l, ...r); (this.notes = this.notes || []).push(`skeleton: left and right ${what} were mixed up — swapped back`); }
      }
      // limb bands: no longer than 125% of the still's length (scaled to her size now); pull the less sure end in
      for (let pass = 0; pass < 2; pass++) for (const [a, b] of LIMBS) {
        const L0 = this.len[a + '-' + b]; if (!L0 || !J[a] || !J[b]) continue;
        const L = dist(J[a], J[b]), hi = L0 * this.k * 1.25; if (L <= hi) continue;
        const wa = 1 - (conf[a] ?? 0.5), wb = 1 - (conf[b] ?? 0.5), s = wa + wb || 1, ex = L - hi, ux = (J[b][0] - J[a][0]) / L, uy = (J[b][1] - J[a][1]) / L;
        J[a] = [J[a][0] + ux * ex * wa / s, J[a][1] + uy * ex * wa / s]; J[b] = [J[b][0] - ux * ex * wb / s, J[b][1] - uy * ex * wb / s];
        if (!fixed.includes(wa > wb ? a : b)) fixed.push(wa > wb ? a : b);
      }
      const vals = JOINTS.map(n => conf[n] ?? 0), notes = this.notes || []; this.notes = [];
      return { joints: J, conf, fixed, notes, sure: +(vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(2) };
    }
    /* common-sense checks against the cut-out (ctx = { w, h, alpha, kind: 1 skin, 2 hair, 3 clothing, 0 none }):
       - a bone must lie on her, and on the same stuff as usual (a bare forearm runs over skin, not over the skirt):
         when it doesn't, its far joint is looked for nearby where a bone of the right length does;
       - knees bend one way: a knee bent backwards (for the way she faces) is flipped across the hip–ankle line */
    refine(res, ctx) {
      if (!res || !ctx) return res; const J = res.joints, conf = res.conf, fixed = res.fixed.slice(), notes = (res.notes || []).slice();
      this.mat = this.mat || {}; const k = this.k || 1;
      // what each limb usually runs over, learned from frames where both its ends are sure and it lies on her
      for (const [a, b] of LIMBS) {
        if (!J[a] || !J[b] || (conf[a] ?? 0) < 0.55 || (conf[b] ?? 0) < 0.55) continue;
        const s = sampleBone(ctx, J[a], J[b]); if (s.inside < 0.85 || s.stuff < 4) continue;
        const m = this.mat[a + '-' + b] || (this.mat[a + '-' + b] = { skin: s.skin, n: 0 }); m.skin = m.n ? m.skin * 0.8 + s.skin * 0.2 : s.skin; m.n++;
      }
      const boneScore = (a, b, A, B) => {
        const s = sampleBone(ctx, A, B), m = this.mat[a + '-' + b], L0 = (this.len[a + '-' + b] || dist(A, B)) * k, L = dist(A, B);
        const stuff = m && m.n >= 3 && s.stuff >= 3 ? 1 - Math.abs(s.skin - m.skin) : 0.7;
        return s.inside + stuff * 0.6 - Math.max(0, L / L0 - 1.1) * 1.5 - Math.max(0, 0.6 - L / L0) * 3;          // a bone can look shorter (pointing at you), but not shrink to nothing
      };
      // the whole skeleton sitting beside her (the finder sometimes lands shifted): slide it to where its bones lie on her
      {
        const all = BONES.filter(([a, b]) => J[a] && J[b]), on = (dx, dy) => all.reduce((s, [a, b]) => s + sampleBone(ctx, [J[a][0] + dx, J[a][1] + dy], [J[b][0] + dx, J[b][1] + dy]).inside, 0) / (all.length || 1);
        const base = on(0, 0), Rg = this.size * k * 0.35, st = Math.max(2, Rg / 8);
        if (all.length >= 6 && base < 0.8) {
          let best = { v: base, dx: 0, dy: 0 };
          for (let dy = -Rg; dy <= Rg; dy += st) for (let dx = -Rg; dx <= Rg; dx += st) { const v = on(dx, dy) - Math.hypot(dx, dy) / Rg * 0.05; if (v > best.v) best = { v, dx, dy }; }
          if (best.v > base + 0.12) { for (const n of Object.keys(J)) if (J[n]) J[n] = [J[n][0] + best.dx, J[n][1] + best.dy]; notes.push(`skeleton: was beside her (${Math.round(Math.hypot(best.dx, best.dy))} px) — slid onto her`); }
        }
      }
      // each chain from its root: shoulder → elbow → wrist, hip → knee → ankle; the far joint of a bad bone is searched for
      for (const side of ['L', 'R']) for (const chain of [['shoulder', 'elbow', 'wrist'], ['hip', 'knee', 'ankle']]) {
        for (let q = 1; q < 3; q++) {
          const a = chain[q - 1] + side, m = chain[q] + side, c = q < 2 ? chain[2] + side : null; if (!J[a] || !J[m]) continue;
          const score = P => boneScore(a, m, J[a], P) + (c && J[c] ? boneScore(m, c, P, J[c]) * 0.5 : 0);
          const now = score(J[m]), mm = this.mat[a + '-' + m], badBone = (x, y) => { const s = sampleBone(ctx, J[x], J[y]), q2 = this.mat[x + '-' + y]; return { s, bad: s.inside < 0.6 || (q2 && q2.n >= 3 && s.stuff >= 3 && Math.abs(s.skin - q2.skin) > 0.5) }; };
          // the middle joint (elbow / knee) moves when either of its two bones is off; the end joint when its bone is
          const b1 = badBone(a, m), b2 = c && J[c] ? badBone(m, c) : { bad: false }, s0 = b1.bad ? b1.s : b2.bad ? b2.s : b1.s, bad = b1.bad || (q === 1 && b2.bad);
          void mm;
          if (!bad) continue;
          const R0 = (this.len[a + '-' + m] || dist(J[a], J[m])) * k * 0.7, st = Math.max(2, R0 / 7); let best = null;
          for (let dy = -R0; dy <= R0; dy += st) for (let dx = -R0; dx <= R0; dx += st) {
            if (dx * dx + dy * dy > R0 * R0) continue; const P = [J[m][0] + dx, J[m][1] + dy], v = score(P) - Math.hypot(dx, dy) / R0 * 0.15;
            if (!best || v > best.v) best = { v, P };
          }
          if (best && best.v > now + 0.25) {
            const d = [best.P[0] - J[m][0], best.P[1] - J[m][1]]; J[m] = best.P; conf[m] = Math.min(conf[m] ?? 0.4, 0.45); if (!fixed.includes(m)) fixed.push(m);
            if (c && J[c] && (conf[c] ?? 0) < 0.5) { J[c] = [J[c][0] + d[0] * 0.5, J[c][1] + d[1] * 0.5]; }
            notes.push(s0.inside < 0.6 ? `skeleton: ${LABEL[m].toLowerCase()} was off her body — moved onto it` : `skeleton: ${LABEL[m].toLowerCase()} lay on ${s0.skin > 0.5 ? 'skin' : 'clothing'} where that limb is usually ${s0.skin > 0.5 ? 'clothed' : 'bare'} — moved to where it is`);
          }
        }
      }
      // knees bend one way. Which way that looks on the picture depends on where she faces, which the nose tells us
      const facing = J2 => { if (!J2.nose || !J2.shoulderL || !J2.shoulderR) return 0; const mx = (J2.shoulderL[0] + J2.shoulderR[0]) / 2, d = J2.nose[0] - mx, w = Math.abs(J2.shoulderL[0] - J2.shoulderR[0]); return Math.abs(d) > Math.max(4, w * 0.25) ? Math.sign(d) : 0; };
      const bendOf = (J2, s) => { const H = J2['hip' + s], K = J2['knee' + s], A = J2['ankle' + s]; if (!H || !K || !A) return null; const u = [K[0] - H[0], K[1] - H[1]], v = [A[0] - K[0], A[1] - K[1]], cr = u[0] * v[1] - u[1] * v[0], ang = Math.asin(clamp(cr / (Math.hypot(...u) * Math.hypot(...v) || 1), -1, 1)); return { sign: Math.sign(cr), ang: Math.abs(ang) * 180 / Math.PI }; };
      const f = facing(J);
      this.bend = this.bend || {};
      for (const s of ['L', 'R']) {
        const b = bendOf(J, s); if (!b || !f) continue; const key = 'knee' + s, want = this.bend[s];
        if ((conf[key] ?? 0) >= 0.6 && b.ang > 25) { const v = b.sign * f; this.bend[s] = { v: want ? (want.v * want.n + v) / (want.n + 1) : v, n: (want ? want.n : 0) + 1 }; continue; }
        if (!want || want.n < 3 || Math.abs(want.v) < 0.6 || b.ang < 30 || (conf[key] ?? 0) >= 0.6) continue;
        if (Math.sign(want.v) !== b.sign * f) {
          const H = J['hip' + s], A = J['ankle' + s], K = J[key], ux = A[0] - H[0], uy = A[1] - H[1], l2 = ux * ux + uy * uy || 1, t = ((K[0] - H[0]) * ux + (K[1] - H[1]) * uy) / l2, px = H[0] + ux * t, py = H[1] + uy * t;
          J[key] = [2 * px - K[0], 2 * py - K[1]]; conf[key] = 0.35; if (!fixed.includes(key)) fixed.push(key); notes.push(`skeleton: ${LABEL[key].toLowerCase()} was bent backwards — flipped`);
        }
      }
      return Object.assign({}, res, { joints: J, conf, fixed, notes });
    }
    accept(J) { this.prev2 = this.prev; this.prev = JSON.parse(JSON.stringify(J)); }

    /* ---------- arms (and fixes that stick) ----------
       Sleeves the colour of her dress make an arm lying on her body nearly invisible to the finder. Three things help:
       1. fixes stick: a joint you placed is followed by the little picture around it (its "patch"), frame to frame;
       2. hands first: her hands are skin against clothing, so a small patch of skin away from her face, chest and legs
          is a hand, and where it meets the sleeve is the wrist;
       3. her arms don't change length: the elbow sits one upper-arm from the shoulder and one forearm from the wrist,
          which leaves only two spots; the one that fits the last frame (and the other clues) wins. */
    armLen(s) {
      const k = this.k || 1, u0 = this.len['shoulder' + s + '-elbow' + s], f0 = this.len['elbow' + s + '-wrist' + s], A = (this.alen = this.alen || {})[s] || {};
      return { u: (A.u || u0 || this.size * 0.55) * k, f: (A.f || f0 || this.size * 0.5) * k };
    }
    // learn arm lengths: the longest seen (an arm only looks shorter, when it points toward or away from you), within reason
    learnLen(J, sure) {
      const k = this.k || 1; this.alen = this.alen || {};
      for (const s of ['L', 'R']) {
        const S = J['shoulder' + s], E = J['elbow' + s], W = J['wrist' + s]; if (!S || !E || !W) continue;
        const u = dist(S, E) / k, f = dist(E, W) / k, u0 = this.len['shoulder' + s + '-elbow' + s] || u, f0 = this.len['elbow' + s + '-wrist' + s] || f, A = this.alen[s] || (this.alen[s] = { u: u0, f: f0 });
        if (sure) { A.u = clamp(u, A.u * 0.85, u0 * 1.3); A.f = clamp(f, A.f * 0.85, f0 * 1.3); }      // your fix says how long it is
        else { A.u = Math.min(Math.max(A.u, u), u0 * 1.3); A.f = Math.min(Math.max(A.f, f), f0 * 1.3); }
      }
    }
    // your fix on this frame: every limb joint is pinned to the picture around it, and followed from here on
    pin(J, ctx, hidden) {
      if (!ctx || !ctx.grey) return; this.tpl = {}; const r = patchR(this.size * (this.k || 1));
      for (const n of FOLLOW) if (J[n] && !(hidden && hidden[n])) { const p = patchAt(ctx, J[n], r); if (p) this.tpl[n] = { fix: p, last: p, r, pin: true, miss: 0, at: J[n].slice() }; }
      this.learnLen(J, true);
    }
    // after a frame is settled: each joint's patch is refreshed where it now is (pinned ones only while they still match)
    learnPatches(J, ctx) {
      if (!ctx || !ctx.grey) return; this.tpl = this.tpl || {}; const T = this.size * (this.k || 1), r = patchR(T), fol = this.fol || {};
      for (const n of FOLLOW) {
        if (!J[n]) continue; const t = this.tpl[n], p = patchAt(ctx, J[n], r); if (!p) continue;
        if (t && t.pin) {
          if (!fol[n]) continue;                                                    // lost this frame: keep the old look, try again next frame
          if (dist(fol[n].p, J[n]) < T * 0.12) this.tpl[n] = Object.assign({}, t, { last: p, at: J[n].slice() });
          else this.tpl[n] = { fix: null, last: p, r, pin: false, miss: 0, at: J[n].slice() };     // something better won: no longer pinned
        } else this.tpl[n] = { fix: null, last: p, r, pin: false, miss: 0, at: J[n].slice() };
      }
    }
    // the frame's own record of the patches, so tracking can start again from it (turning back, or after a fix)
    /* legs: a knee and an ankle must belong to the same leg; thigh and shin keep their lengths (legs foreshorten
       much less than arms); a shin can't collapse to nothing; two knees can't share a spot while the feet are apart;
       knees bend the way she faces (learned in refine). Candidates: each side's finder point, the other side's (a
       mix-up), the followed / kept patch, the two spots one thigh from the hip and one shin from the ankle, last frame. */
    legLen(s) { const k = this.k || 1, t0 = this.len['hip' + s + '-knee' + s], s0 = this.len['knee' + s + '-ankle' + s]; return { t: (t0 || this.size * 0.85) * k, s: (s0 || this.size * 0.85) * k }; }
    legs(res, ctx) {
      if (!res || !ctx) return res;
      const J = Object.assign({}, res.joints), conf = Object.assign({}, res.conf), T = this.size * (this.k || 1), P = this.prev, tp = this.tpl || {}, fol = this.fol || {};
      const used = Object.assign({}, res.used || {}), info = (res.arms || []).slice(), resolved = new Set(), F0 = Object.assign({}, res.joints), letGo = new Set();
      const inside = p => { const x = Math.round(p[0]), y = Math.round(p[1]); return x >= 0 && y >= 0 && x < ctx.w && y < ctx.h && ctx.alpha[y * ctx.w + x] >= 128; };
      const other = s => (s === 'L' ? 'R' : 'L');
      // ankles, as a pair
      const cands = s => {
        const n = 'ankle' + s, H = J['hip' + s], L = this.legLen(s), prv = P && P[n], out = [];
        const add = (p, ev, how) => { if (!p) return; let v = ev; if (prv) v -= Math.min(1.5, dist(p, prv) / T) * 0.5; if (how !== 'kept') { if (H && dist(p, H) > (L.t + L.s) * 1.12) v -= 2; if (!inside(p)) v -= 0.6; } else if (H && dist(p, H) > (L.t + L.s) * 1.3) { v -= 3; letGo.add(n); } out.push({ p, v, how }); };
        add(F0[n], (conf[n] ?? 0) * 0.6, 'finder');
        add(F0['ankle' + other(s)], (conf['ankle' + other(s)] ?? 0) * 0.6 - 0.15, 'other leg');
        if (fol[n] && tp[n]) add(fol[n].p, tp[n].pin ? 0.9 + fol[n].ncc * 0.6 : 0.05 + fol[n].ncc * 0.3, tp[n].pin ? 'kept' : 'followed');
        if (prv) add(prv, 0.05, 'last frame');
        return out;
      };
      const aL = cands('L'), aR = cands('R'); let best = null;
      for (const a of aL) for (const b of aR) { let v = a.v + b.v; if (dist(a.p, b.p) < T * 0.06) v -= 2; if (a.how === 'other leg' && b.how === 'other leg') v += 0.15; if (!best || v > best.v) best = { v, a, b }; }
      if (best) for (const [s, c] of [['L', best.a], ['R', best.b]]) { const n = 'ankle' + s; if (c.how !== 'finder') { used[n] = c.how; if (c.how === 'kept') resolved.add(n); else conf[n] = Math.min(conf[n] ?? 0.3, c.how === 'other leg' ? conf['ankle' + other(s)] ?? 0.3 : 0.35); } J[n] = c.p; }
      if (best && best.a.how === 'other leg' && best.b.how === 'other leg') info.push('ankles were on the wrong legs — swapped');
      // knees
      const facing = (() => { if (!J.nose || !J.shoulderL || !J.shoulderR) return 0; const mx = (J.shoulderL[0] + J.shoulderR[0]) / 2, d = J.nose[0] - mx, w = Math.abs(J.shoulderL[0] - J.shoulderR[0]); return Math.abs(d) > Math.max(4, w * 0.25) ? Math.sign(d) : 0; })();
      const pick = {};
      for (const s of ['L', 'R']) {
        const n = 'knee' + s, H = J['hip' + s], A = J['ankle' + s]; if (!H || !A) continue;
        const L = this.legLen(s), prv = P && P[n], out = [], want = this.bend && this.bend[s];
        const add = (p, ev, how) => {
          if (!p) return; let v = ev;
          if (how === 'kept' && (dist(H, p) / L.t > 1.35 || dist(p, A) / L.s > 1.35)) { v -= 3; letGo.add(n); }
          if (how !== 'kept') {
            const rt = dist(H, p) / L.t, rs = dist(p, A) / L.s, on = (sampleBone(ctx, H, p).inside + sampleBone(ctx, p, A).inside) / 2;
            v += on * 0.5 - (inside(p) ? 0 : 0.8) - Math.max(0, rt - 1.15) * 3 - Math.max(0, rs - 1.15) * 3 - Math.max(0, 0.7 - rt) * 3 - Math.max(0, 0.6 - rs) * 3;
            if (want && want.n >= 3 && Math.abs(want.v) >= 0.6 && facing) { const u = [p[0] - H[0], p[1] - H[1]], w2 = [A[0] - p[0], A[1] - p[1]], cr = u[0] * w2[1] - u[1] * w2[0], ang = Math.abs(Math.asin(clamp(cr / (Math.hypot(...u) * Math.hypot(...w2) || 1), -1, 1))) * 180 / Math.PI; if (ang > 20 && Math.sign(cr) * facing !== Math.sign(want.v)) v -= 0.5; }
          }
          if (prv) v -= Math.min(1.5, dist(p, prv) / T) * 0.5; out.push({ p, v, how });
        };
        add(F0[n], (conf[n] ?? 0) * 0.5, 'finder');
        add(F0['knee' + other(s)], (conf['knee' + other(s)] ?? 0) * 0.5 - 0.15, 'other leg');
        if (fol[n] && tp[n]) add(fol[n].p, tp[n].pin ? 0.9 + fol[n].ncc * 0.6 : 0.05 + fol[n].ncc * 0.3, tp[n].pin ? 'kept' : 'followed');
        for (const sc of [1, 0.9]) for (const p of elbowSpots(H, A, L.t * sc, L.s * sc)) add(p, 0.2 - (1 - sc), 'lengths');
        if (prv) add(prv, 0.05, 'last frame');
        out.sort((a, b) => b.v - a.v); pick[s] = out;
      }
      // two knees on one spot while the feet are apart: the one with the closer runner-up moves to it
      if (pick.L && pick.R && pick.L[0] && pick.R[0] && dist(pick.L[0].p, pick.R[0].p) < T * 0.08 && J.ankleL && J.ankleR && dist(J.ankleL, J.ankleR) > T * 0.3) {
        const alt = s => pick[s].find(c => dist(c.p, pick[other(s)][0].p) >= T * 0.08), gL = alt('L'), gR = alt('R');
        const lossL = gL ? pick.L[0].v - gL.v : 9, lossR = gR ? pick.R[0].v - gR.v : 9;
        if (lossL <= lossR && gL) pick.L = [gL]; else if (gR) pick.R = [gR];
      }
      for (const s of ['L', 'R']) { const c = pick[s] && pick[s][0], n = 'knee' + s; if (!c) continue; const was = J[n]; J[n] = c.p;
        if (c.how !== 'finder') { used[n] = c.how; if (c.how === 'kept' || c.how === 'lengths') resolved.add(n); conf[n] = c.how === 'kept' ? 0.6 : c.how === 'lengths' ? 0.5 : Math.min(conf[n] ?? 0.3, 0.4); }
        if (was && dist(was, c.p) > T * 0.15 && c.how !== 'followed' && c.how !== 'last frame') info.push(`${LABEL[n].toLowerCase()} ${c.how === 'other leg' ? 'was on her other leg — swapped' : c.how === 'kept' ? 'kept where you placed it' : 'set from her leg lengths'}`);
      }
      for (const n of letGo) if (used[n] !== 'kept' && tp[n] && tp[n].pin) { tp[n].pin = false; info.push(`your fix on ${LABEL[n].toLowerCase()} stopped fitting her leg's length — let go`); }
      const fixed = res.fixed.filter(n => !resolved.has(n)), notes = (res.notes || []).filter(s2 => ![...resolved].some(n => s2.includes(LABEL[n].toLowerCase())));
      const vals = JOINTS.map(n => conf[n] ?? 0);
      return Object.assign({}, res, { joints: J, conf, fixed, notes, used, arms: info, sure: +(vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(2) });
    }
    patches() { return this.tpl ? Object.fromEntries(Object.entries(this.tpl).map(([n, t]) => [n, Object.assign({}, t)])) : null; }
    usePatches(T) { this.tpl = T ? Object.fromEntries(Object.entries(T).map(([n, t]) => [n, Object.assign({}, t)])) : {}; }

    arms(res, ctx) {
      if (!res || !ctx || !ctx.grey) return res;
      const J = Object.assign({}, res.joints), conf = Object.assign({}, res.conf), T = this.size * (this.k || 1), P = this.prev, tp = this.tpl || {};
      const used = {}, info = [], resolved = new Set(), letGo = new Set();
      // 1. follow each joint's patch from the last frame
      const fol = {};
      for (const n of FOLLOW) {
        const t = tp[n]; if (!t || !P || !P[n]) continue;
        const m = matchPatch(ctx, t, P[n], Math.max(T * 0.3, 12)); if (!m) continue;
        if (t.pin) { if (m.ncc >= 0.5) { fol[n] = m; t.miss = 0; } else if (++t.miss >= 2) t.pin = false; }
        else if (m.ncc >= 0.6) fol[n] = m;
      }
      this.fol = fol;
      // 2. hands: small patches of skin that aren't her face, chest or legs
      const hands = handBlobs(ctx, J, T);
      // 3. wrists: both at once (they can't both be the same hand)
      const neck = J.shoulderL && J.shoulderR ? [(J.shoulderL[0] + J.shoulderR[0]) / 2, (J.shoulderL[1] + J.shoulderR[1]) / 2] : null;
      const pelvis = J.hipL && J.hipR ? [(J.hipL[0] + J.hipR[0]) / 2, (J.hipL[1] + J.hipR[1]) / 2] : null;
      // how far across her body a point is, toward side s: 0 at her middle, 1 at that shoulder, negative past the middle
      const across = (p, s) => { const S = J['shoulder' + s]; if (!neck || !S) return 0; const ax = S[0] - neck[0], ay = S[1] - neck[1], l2 = ax * ax + ay * ay || 1; return ((p[0] - neck[0]) * ax + (p[1] - neck[1]) * ay) / l2; };
      const fromMid = p => { if (!neck || !pelvis) return 0; const ax = pelvis[0] - neck[0], ay = pelvis[1] - neck[1], l = Math.hypot(ax, ay) || 1; return Math.abs((p[0] - neck[0]) * ay - (p[1] - neck[1]) * ax) / l; };
      const cands = s => {
        const n = 'wrist' + s, o = 'wrist' + (s === 'L' ? 'R' : 'L'), S = J['shoulder' + s], L = this.armLen(s), reach = (L.u + L.f) * 1.12, prv = P && P[n], out = [];
        const add = (p, ev, how, extra) => { if (!p) return; let v = ev; if (prv) v -= Math.min(1.5, dist(p, prv) / T) * 0.55; if (S && dist(p, S) > reach) v -= 2; const a = across(p, s); if (a < -1.1) v -= Math.min(1, (-1.1 - a) * 0.8); out.push(Object.assign({ p, v, how }, extra)); };
        add(J[n], (conf[n] ?? 0) * 0.6, 'finder');
        if (fol[n]) add(fol[n].p, tp[n].pin ? 0.9 + fol[n].ncc * 0.6 : 0.05 + fol[n].ncc * 0.3, tp[n].pin ? 'kept' : 'followed');
        // a hand the finder (fairly sure) calls this side's is likely this side's; one it calls the other side's, likely not
        // a hand is at least ~40 % of the arm's length from its own shoulder (bits of bare shoulder skin, cut off by hair, are not hands)
        hands.forEach((h, i) => add(h.wrist, 0.85 - (S && dist(h.wrist, S) < (L.u + L.f) * 0.4 ? 0.9 : 0) + (J[n] && dist(J[n], h.wrist) < T * 0.25 ? 0.25 : 0) - (J[o] && (conf[o] ?? 0) >= 0.45 && dist(J[o], h.wrist) < T * 0.25 ? 0.45 : 0) + (fol[n] && dist(fol[n].p, h.wrist) < T * 0.15 ? 0.2 : 0) - (fol[n] && tp[n].pin && dist(fol[n].p, h.wrist) > T * 0.15 ? 1 : 0), 'hand', { hand: i }));
        if (prv) add(prv, 0.05, 'last frame');
        return out;
      };
      const cL = cands('L'), cR = cands('R'); let best = null;
      for (const a of cL) for (const b of cR) {
        if (a.hand != null && a.hand === b.hand) continue;
        let v = a.v + b.v; if (dist(a.p, b.p) < T * 0.1 && !(a.how === 'finder' && b.how === 'finder')) v -= 0.8;
        if (!best || v > best.v) best = { v, a, b };
      }
      if (best) for (const [s, c] of [['L', best.a], ['R', best.b]]) {
        const n = 'wrist' + s, was = J[n];
        J[n] = c.p; used[n] = c.how;
        if (c.how === 'hand' || c.how === 'kept') { conf[n] = Math.max(conf[n] && was && dist(was, c.p) < T * 0.15 ? conf[n] : 0, c.how === 'hand' ? 0.7 : 0.6); resolved.add(n); }
        else if (c.how === 'followed' || c.how === 'last frame') conf[n] = Math.min(conf[n] ?? 0.3, 0.35);
        if (was && dist(was, c.p) > T * 0.15 && (c.how === 'hand' || c.how === 'kept')) info.push(`${LABEL[n].toLowerCase()} ${c.how === 'hand' ? 'put on her hand' : 'kept where you placed it'}`);
      }
      // 4. elbows from her arm lengths
      for (const s of ['L', 'R']) {
        const n = 'elbow' + s, S = J['shoulder' + s], W = J['wrist' + s]; if (!S || !W) continue;
        const L = this.armLen(s), prv = P && P[n], out = [], wristSure = resolved.has('wrist' + s);
        // an elbow is on her (it's a visible part of the arm); the upper arm keeps its length when it hangs or swings, the
        // forearm can look much shorter (a hand held out toward you); elbows sit out toward her sides, not mid-body
        const inside = p => { const x = Math.round(p[0]), y = Math.round(p[1]); return x >= 0 && y >= 0 && x < ctx.w && y < ctx.h && ctx.alpha[y * ctx.w + x] >= 128; };

        const add = (p, ev, how) => {
          if (!p) return;
          if (how === 'kept') {                                       // your placement isn't second-guessed — unless the arm stops being an arm
            let v = ev; if (prv) v -= Math.min(1.5, dist(p, prv) / T) * 0.3;
            if (dist(S, p) / L.u > 1.4 || dist(p, W) / L.f > 1.45) { v -= 3; letGo.add(n); }
            out.push({ p, v, how }); return;
          }
          const ru = dist(S, p) / L.u, rf = dist(p, W) / L.f, on = (sampleBone(ctx, S, p).inside + sampleBone(ctx, p, W).inside) / 2;
          let v = ev + on * 0.4 - (inside(p) ? 0 : 1) - Math.max(0, ru - 1.12) * 3 - Math.max(0, rf - 1.15) * 3 - Math.max(0, 0.7 - ru) * 2 - Math.max(0, 0.2 - rf) * 2;
          v += clamp(across(p, s), -1.5, 1.2) * 0.3;                                          // out on her own side
          if (prv) v -= Math.min(1.5, dist(p, prv) / T) * 0.5; out.push({ p, v, how });
        };
        add(J[n], (conf[n] ?? 0) * 0.5, 'finder');
        if (fol[n]) add(fol[n].p, tp[n].pin ? 0.9 + fol[n].ncc * 0.6 : 0.05 + fol[n].ncc * 0.3, tp[n].pin ? 'kept' : 'followed');
        for (const sc of [1, 0.85, 0.7]) for (const p of elbowSpots(S, W, L.u * sc, L.f * sc)) add(p, (wristSure ? 0.35 : 0.15) - (1 - sc) * 0.3, 'lengths');
        // the forearm pointing at you: anywhere one upper arm from the shoulder, with the forearm looking short
        for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; for (const sc of [1, 0.85]) add([S[0] + Math.cos(t) * L.u * sc, S[1] + Math.sin(t) * L.u * sc], wristSure ? 0.2 : 0.05, 'lengths'); }
        if (prv) add(prv, 0.05, 'last frame');
        out.sort((a, b) => b.v - a.v); const c = out[0]; if (!c) continue; const was = J[n];
        J[n] = c.p; used[n] = c.how;
        if (c.how === 'kept' || (c.how === 'lengths' && wristSure)) { conf[n] = Math.max(was && dist(was, c.p) < T * 0.15 ? conf[n] ?? 0 : 0, 0.55); resolved.add(n); }
        else if (c.how !== 'finder') conf[n] = Math.min(conf[n] ?? 0.3, 0.35);
        if (was && dist(was, c.p) > T * 0.15 && resolved.has(n)) info.push(`${LABEL[n].toLowerCase()} ${c.how === 'kept' ? 'kept where you placed it' : 'set from her arm length'}`);
      }
      for (const n of letGo) if (used[n] !== 'kept' && tp[n] && tp[n].pin) { tp[n].pin = false; info.push(`your fix on ${LABEL[n].toLowerCase()} stopped fitting her arm's length — let go`); }
      // what is now settled isn't "guessed" any more, and earlier worries about it are answered
      const fixed = res.fixed.filter(n => !resolved.has(n)), notes = (res.notes || []).filter(s => ![...resolved].some(n => s.includes(LABEL[n].toLowerCase())));
      for (const s of ['L', 'R']) if (resolved.has('wrist' + s) && resolved.has('elbow' + s)) { const S = J['shoulder' + s], E = J['elbow' + s], W = J['wrist' + s]; if (S && E && W && dist(S, E) > this.armLen(s).u * 0.9 && dist(E, W) > this.armLen(s).f * 0.9 && used['wrist' + s] !== 'finder') this.learnLen(J, false); }
      const vals = JOINTS.map(n => conf[n] ?? 0);
      const dbg = { fol: Object.fromEntries(Object.entries(fol).map(([k, v]) => [k, v.ncc])), pins: Object.keys(tp).filter(k => tp[k].pin) };
      return Object.assign({}, res, { dbg, joints: J, conf, fixed, notes, used, arms: info, sure: +(vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(2) });
    }
  }
  /* a skeleton you placed that looks off: an arm on her other side (often left / right swapped — teal is HER left),
     two elbows / wrists / knees on one spot (one is probably hidden). hidden = joints you marked hidden. */
  function fixWarnings(J, hidden) {
    const out = [], H = hidden || {}, T = J.shoulderL && J.shoulderR && J.hipL && J.hipR ? dist([(J.shoulderL[0] + J.shoulderR[0]) / 2, (J.shoulderL[1] + J.shoulderR[1]) / 2], [(J.hipL[0] + J.hipR[0]) / 2, (J.hipL[1] + J.hipR[1]) / 2]) : 0;
    if (!T) return out;
    const neck = [(J.shoulderL[0] + J.shoulderR[0]) / 2, (J.shoulderL[1] + J.shoulderR[1]) / 2];
    const across = (p, s) => { const S = J['shoulder' + s], ax = S[0] - neck[0], ay = S[1] - neck[1], l2 = ax * ax + ay * ay || 1; return ((p[0] - neck[0]) * ax + (p[1] - neck[1]) * ay) / l2; };
    const leftOnPic = J.shoulderL[0] > J.shoulderR[0] ? 'right' : 'left';
    const off = s => ['elbow' + s].filter(n => J[n] && !H[n] && across(J[n], s) < -0.6);
    const oL = off('L'), oR = off('R');
    if (oL.length && oR.length) out.push({ kind: 'swapArms', text: `Her arms look swapped: teal is HER left arm, and her left shoulder is the one on the picture's ${leftOnPic}.` });
    else for (const n of [...oL, ...oR]) out.push({ kind: 'swapArms', text: `${LABEL[n]} is on her other side. Teal is HER left (her left shoulder is on the picture's ${leftOnPic}) — swapped?` });
    for (const [a, b, what] of [['elbowL', 'elbowR', 'elbows'], ['wristL', 'wristR', 'wrists'], ['kneeL', 'kneeR', 'knees']]) {
      if (!J[a] || !J[b] || H[a] || H[b]) continue;
      if (dist(J[a], J[b]) < T * 0.1 && !(what === 'knees' && J.ankleL && J.ankleR && dist(J.ankleL, J.ankleR) < T * 0.3)) out.push({ kind: 'same', text: `Both ${what} are on the same spot. If one ${what === 'knees' ? 'leg' : 'arm'} is hidden behind her, right-click its joints and mark them hidden.` });
    }
    return out;
  }
  // do segments AB and CD cross (strictly)?
  function crosses(A, B, C, D) { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(A, B, C) * o(A, B, D) < 0 && o(C, D, A) * o(C, D, B) < 0; }
  const FOLLOW = ['elbowL', 'elbowR', 'wristL', 'wristR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];
  const patchR = T => clamp(Math.round(T * 0.09 / 2) * 2, 6, 20);
  // her picture around P (grey, her outline against nothing), sampled every 2 px, normalised for brightness and contrast
  function patchAt(ctx, P, r) {
    const { w, h, grey } = ctx, x0 = Math.round(P[0]), y0 = Math.round(P[1]), n = (r + 1) * (r + 1), v = new Float32Array(n); let k = 0, s = 0, s2 = 0;
    for (let dy = -r; dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) { const x = x0 + dx, y = y0 + dy; const g = x >= 0 && y >= 0 && x < w && y < h ? grey[y * w + x] : 0; v[k++] = g; s += g; s2 += g * g; }
    const m = s / n, sd = Math.sqrt(Math.max(0, s2 / n - m * m)); if (sd < 4) return null;
    for (let i = 0; i < n; i++) v[i] = (v[i] - m) / sd; return v;
  }
  function nccAt(ctx, t, x0, y0, r) {
    const { w, h, grey } = ctx, n = (r + 1) * (r + 1); let k = 0, s = 0, s2 = 0, sx = 0;
    for (let dy = -r; dy <= r; dy += 2) { const y = y0 + dy; for (let dx = -r; dx <= r; dx += 2) { const x = x0 + dx; const g = x >= 0 && y >= 0 && x < w && y < h ? grey[y * w + x] : 0; s += g; s2 += g * g; sx += g * t[k++]; } }
    const m = s / n, sd = Math.sqrt(Math.max(0, s2 / n - m * m)); return sd < 4 ? -1 : sx / (n * sd);          // Σ t = 0, so the mean drops out
  }
  // where the joint's patch is now: searched near P (coarse, then fine); scored against its last look and, when you pinned it, your fix
  function matchPatch(ctx, t, P, R) {
    const score = (x, y) => { const a = nccAt(ctx, t.last, x, y, t.r); return t.fix && t.fix !== t.last ? a * 0.65 + nccAt(ctx, t.fix, x, y, t.r) * 0.35 : a; };
    R = Math.round(R); let best = null; const st = Math.max(2, Math.round(R / 10)), x0 = Math.round(P[0]), y0 = Math.round(P[1]);          // whole pixels only
    for (let dy = -R; dy <= R; dy += st) for (let dx = -R; dx <= R; dx += st) { if (dx * dx + dy * dy > R * R) continue; const v = score(x0 + dx, y0 + dy) - Math.hypot(dx, dy) / R * 0.05; if (!best || v > best.v) best = { v, x: x0 + dx, y: y0 + dy }; }
    if (!best) return null;
    for (let pass = 0; pass < 2; pass++) { const c = best, s2 = pass ? 1 : Math.max(1, st >> 1); for (let dy = -st; dy <= st; dy += s2) for (let dx = -st; dx <= st; dx += s2) { const x = c.x + dx, y = c.y + dy, v = score(x, y) - Math.hypot(x - x0, y - y0) / R * 0.05; if (v > best.v) best = { v, x, y }; } }
    return { p: [best.x, best.y], ncc: +score(best.x, best.y).toFixed(3) };
  }
  // the two spots an elbow can be with this upper arm (u) and forearm (f) between shoulder S and wrist W
  function elbowSpots(S, W, u, f) {
    const d = dist(S, W); if (d < 1) return [];
    const ux = (W[0] - S[0]) / d, uy = (W[1] - S[1]) / d;
    if (d >= u + f) { const t = u / (u + f); return [[S[0] + (W[0] - S[0]) * t, S[1] + (W[1] - S[1]) * t]]; }
    const a = clamp((u * u - f * f + d * d) / (2 * d), -u, u), hh = Math.sqrt(Math.max(0, u * u - a * a)), mx = S[0] + ux * a, my = S[1] + uy * a;
    return [[mx - uy * hh, my + ux * hh], [mx + uy * hh, my - ux * hh]];
  }
  /* her hands: skin pieces of hand size that aren't her face (near the nose), her chest (touching the neck) or her
     legs (big, or by an ankle). The wrist is where the hand meets the sleeve; on a bare arm (no sleeve edge) the end of
     the piece nearest her shoulders. */
  function handBlobs(ctx, J, T) {
    const { w, h, kind, alpha } = ctx; if (!kind) return [];
    const xs = Object.values(J).filter(Boolean).map(p => p[0]), ys = Object.values(J).filter(Boolean).map(p => p[1]); if (!xs.length) return [];
    const pad = T * 1.3, x0 = Math.max(0, Math.floor(Math.min(...xs) - pad)), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs) + pad)), y0 = Math.max(0, Math.floor(Math.min(...ys) - pad * 0.6)), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
    const seen = new Uint8Array(w * h), out = [], amin = T * T * 0.006, amax = T * T * 0.12;
    const neck = J.shoulderL && J.shoulderR ? [(J.shoulderL[0] + J.shoulderR[0]) / 2, (J.shoulderL[1] + J.shoulderR[1]) / 2] : null;
    const isSkin = i => kind[i] === 1 && alpha[i] >= 128;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i0 = y * w + x; if (seen[i0] || !isSkin(i0)) continue;
      const st = [i0], px = []; seen[i0] = 1; let big = false;
      while (st.length) { const i = st.pop(); px.push(i); if (px.length > amax * 1.5) big = true; const xx = i % w, yy = (i / w) | 0;
        for (const j of [xx > 0 ? i - 1 : -1, xx < w - 1 ? i + 1 : -1, yy > 0 ? i - w : -1, yy < h - 1 ? i + w : -1]) if (j >= 0 && !seen[j] && isSkin(j)) { seen[j] = 1; st.push(j); } }
      if (big || px.length < amin || px.length > amax) continue;
      let cx = 0, cy = 0, near = (P, r) => P && px.some(i => Math.hypot(i % w - P[0], ((i / w) | 0) - P[1]) < r);
      for (const i of px) { cx += i % w; cy += (i / w) | 0; } cx /= px.length; cy /= px.length;
      if (J.nose && Math.hypot(cx - J.nose[0], cy - J.nose[1]) < T * 0.3) continue;
      if (near(neck, T * 0.12) || near(J.shoulderL, T * 0.2) || near(J.shoulderR, T * 0.2) || near(J.ankleL, T * 0.3) || near(J.ankleR, T * 0.3) || near(J.kneeL, T * 0.12) || near(J.kneeR, T * 0.12)) continue;
      // where the hand meets clothing (the cuff)
      let ex = 0, ey = 0, en = 0;
      for (const i of px) { const xx = i % w, yy = (i / w) | 0; for (const j of [i - 2, i + 2, i - 2 * w, i + 2 * w]) if (j >= 0 && j < w * h && kind[j] === 3 && alpha[j] >= 128) { ex += xx; ey += yy; en++; break; } }
      let wrist;
      if (en >= 4 && en < px.length * 0.6) wrist = [ex / en, ey / en];
      else { const S = neck || [cx, cy - T]; let b = null; for (const i of px) { const d = Math.hypot(i % w - S[0], ((i / w) | 0) - S[1]); if (!b || d < b.d) b = { d, p: [i % w, (i / w) | 0] }; } wrist = [b.p[0] + (cx - b.p[0]) * 0.15, b.p[1] + (cy - b.p[1]) * 0.15]; }
      out.push({ c: [cx, cy], wrist, area: px.length, cuff: en });
    }
    return out;
  }
  // what a bone runs over: share of its middle that is on her, and of that, how much is skin (vs clothing)
  function sampleBone(ctx, A, B) {
    const { w, h, alpha, kind } = ctx; let inside = 0, skin = 0, cloth = 0, n = 0;
    for (let t = 0.15; t <= 0.851; t += 0.0583) {
      const x = Math.round(A[0] + (B[0] - A[0]) * t), y = Math.round(A[1] + (B[1] - A[1]) * t); n++;
      if (x < 0 || y < 0 || x >= w || y >= h) continue; const i = y * w + x; if (alpha[i] < 128) continue; inside++;
      if (kind[i] === 1) skin++; else if (kind[i] === 3) cloth++;
    }
    return { inside: inside / n, skin: skin + cloth ? skin / (skin + cloth) : 0.5, stuff: skin + cloth };
  }
  /* the extra points a doll needs, worked out from the joints and her outline (picture coordinates; null when unseen):
     pelvis (between the hips), neck (between the shoulders), torso (the chest, 40% of the way down), headTop (the top
     of her head along neck → nose), handL/R (the fingertips past the wrist), footL/R (the toe tip near the ankle) */
  const EXTRA = ['pelvis', 'torso', 'neck', 'headTop', 'handL', 'handR', 'footL', 'footR'];
  const EXTRA_LABEL = { pelvis: 'Pelvis', torso: 'Chest', neck: 'Neck', headTop: 'Top of the head', handL: 'Her left hand', handR: 'Her right hand', footL: 'Her left foot', footR: 'Her right foot' };
  function extras(J, ctx) {
    const E = {}, mid = (a, b) => (J[a] && J[b] ? [(J[a][0] + J[b][0]) / 2, (J[a][1] + J[b][1]) / 2] : null);
    E.pelvis = mid('hipL', 'hipR'); E.neck = mid('shoulderL', 'shoulderR');
    E.torso = E.pelvis && E.neck ? [E.neck[0] + (E.pelvis[0] - E.neck[0]) * 0.4, E.neck[1] + (E.pelvis[1] - E.neck[1]) * 0.4] : null;
    const inside = (x, y) => { x = Math.round(x); y = Math.round(y); return ctx && x >= 0 && y >= 0 && x < ctx.w && y < ctx.h && ctx.alpha[y * ctx.w + x] >= 96; };
    // walk from P in direction d (unit) while still on her (gaps up to 3 px allowed), at most `max` px
    const hairAt = (x, y) => { x = Math.round(x); y = Math.round(y); return ctx && ctx.kind && x >= 0 && y >= 0 && x < ctx.w && y < ctx.h && ctx.kind[y * ctx.w + x] === 2; };
    // walk from P in direction d (unit) while still on her (gaps up to 3 px allowed), at most `max` px; hands stop at hair
    const walk = (P, d, max, noHair) => { let last = null, gap = 0; for (let s = 0; s <= max; s += 1) { const x = P[0] + d[0] * s, y = P[1] + d[1] * s; if (noHair && hairAt(x, y)) break; if (inside(x, y)) { last = [x, y]; gap = 0; } else if (++gap > 3) break; } return last; };
    const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    if (ctx && J.nose && E.neck) { const L = Math.hypot(J.nose[0] - E.neck[0], J.nose[1] - E.neck[1]); E.headTop = walk(J.nose, unit(E.neck, J.nose), L * 1.4); } else E.headTop = null;
    for (const s of ['L', 'R']) {
      const el = J['elbow' + s], wr = J['wrist' + s];
      E['hand' + s] = ctx && el && wr && !hairAt(wr[0], wr[1]) ? walk(wr, unit(el, wr), Math.hypot(wr[0] - el[0], wr[1] - el[1]) * 0.75, true) : null;
      const kn = J['knee' + s], an = J['ankle' + s], other = J['ankle' + (s === 'L' ? 'R' : 'L')];
      E['foot' + s] = null;
      if (ctx && kn && an) {
        // the toe: the point of her outline near this ankle (and nearer it than the other ankle) furthest from the knee
        const L = Math.hypot(an[0] - kn[0], an[1] - kn[1]), r = L * 0.5; let best = null;
        for (let y = Math.round(an[1] - r * 0.3); y <= an[1] + r; y += 2) for (let x = Math.round(an[0] - r); x <= an[0] + r; x += 2) {
          if (!inside(x, y) || Math.hypot(x - an[0], y - an[1]) > r) continue;
          if (other && Math.hypot(x - other[0], y - other[1]) < Math.hypot(x - an[0], y - an[1])) continue;
          const v = Math.hypot(x - kn[0], y - kn[1]); if (!best || v > best.v) best = { v, p: [x, y] };
        }
        E['foot' + s] = best && best.v > L * 1.05 ? best.p : null;
      }
    }
    return E;
  }
  // gentle smoothing over neighbouring frames (after a run): each joint moves toward the average of the frames
  // around it, less when it is sure. Hand-fixed frames are left exactly as you placed them.
  function smooth(list, fixedFrames) {
    const out = list.map(f => (f ? JSON.parse(JSON.stringify(f)) : f));
    for (let i = 1; i < list.length - 1; i++) {
      const a = list[i - 1], b = list[i], c = list[i + 1]; if (!a || !b || !c || (fixedFrames && fixedFrames.has(i))) continue;
      for (const n of JOINTS) {
        if (!a.joints[n] || !b.joints[n] || !c.joints[n]) continue;
        const w = 0.5 * (1 - clamp(b.conf[n] ?? 0.5, 0, 1)) + 0.15, m = [(a.joints[n][0] + c.joints[n][0]) / 2, (a.joints[n][1] + c.joints[n][1]) / 2];
        out[i].joints[n] = [b.joints[n][0] + (m[0] - b.joints[n][0]) * w, b.joints[n][1] + (m[1] - b.joints[n][1]) * w];
      }
    }
    return out;
  }
  root.BodyKit = { NAMES, LABEL, JOINTS, BONES, EXTRA, EXTRA_LABEL, ready, detect, detectFast, Follower, smooth, extras, sampleBone, handBlobs, elbowSpots, fixWarnings };
})(window);
