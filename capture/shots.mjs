// Every shot: page options, prep (in-page, once), frames, and per frame: dt (game seconds to advance) and the camera.
// Functions run inside the game page: `a` = the app, `e` = its engine, `H` = helpers, `S` = state shared between frames.
const homerPrep = (b) => `(() => {
  const a = window.__app, e = a.engine;
  for (let i = 0; i < 90; i++) a.tick(1 / 30, false);
  e.cpuSwingOverride = () => ({ swing: true, aim: { x: 0, y: 2.5 }, errorMs: 0 });
  e.contactOverride = () => ({ exitVelocity: ${b[0]}, launchAngle: ${b[1]}, sprayAngle: ${b[2]}, backspin: ${900 + 55 * b[1]}, hook: 0 });
  for (let i = 0; i < 20; i++) a.tick(1 / 30, false);
  e.setPitchAim(0, 2.5); e.startDelivery();
  window.T0 = e.time;
})()`;
const HR = [110, 27, 16];
export const SHOTS = {
  // 1. high over center field, gliding in toward the diamond at dusk
  establish: {
    opts: { tod: 'dusk' }, frames: 150,
    prep: `(() => { const a = window.__app; for (let i = 0; i < 90; i++) a.tick(1 / 30, false); })()`,
    dt: () => 1 / 30,
    cam: (f, n) => { const k = H.smooth(f / n); return { pos: H.v3([60, 230, -640], [8, 60, -250], k), look: H.v3([0, 0, -120], [0, 2, -50], k), fov: H.lerp(42, 38, k) }; },
  },
  // 2. the pitcher's delivery, from the first-base side, half speed, slow push in
  pitcher: {
    opts: {}, frames: 66, prep: homerPrep(HR),
    dt: () => 0.5 / 30,
    cam: (f, n) => { const k = H.smooth(f / n); return { pos: H.v3([17, 4.2, -49], [12, 4.6, -52], k), look: H.v3([0, 5.2, -60], [0, 5.6, -59], k), fov: 34 }; },
  },
  // 3. the swing: low, in front of the plate, looking at the (left-handed) batter; slow motion through contact
  contact: {
    opts: {}, frames: 84, prep: homerPrep(HR), skip: 1.22,
    dt: (f) => { const t = window.__app.engine.time - window.T0; return (t > 1.4 && t < 1.62 ? 0.12 : 0.45) / 30; },
    cam: (f, n) => { const k = H.smooth(f / n); return { pos: H.v3([10, 2.4, -8], [8.5, 2.8, -7], k), look: H.v3([-1, 3.2, 0], [-1, 3.4, 0], k), fov: H.lerp(38, 33, k) }; },
  },
  // 4. the flight: from behind home plate, rising, the camera follows the ball out
  flight: {
    opts: {}, frames: 105, noTrail: true, prep: homerPrep(HR), skip: 1.45,
    dt: () => 1 / 30,
    cam: (f, n) => {
      const k = H.smooth(f / n), b = window.__app.actors.ballPos;
      // a chase camera: behind the ball (toward home) and a little above, closing in as it flies
      const d = Math.hypot(b.x, b.z) || 1, back = H.lerp(14, 34, H.smooth(f / 25));
      const want = [b.x - b.x / d * back, b.y + 3 + 0.08 * back, b.z - b.z / d * back];
      if (!window.S.p) window.S.p = [-4, 6, 14];
      const P = window.S.p; for (let i = 0; i < 3; i++) P[i] += (want[i] - P[i]) * H.lerp(0.18, 0.5, k);
      return { pos: P.slice(), look: [b.x, b.y, b.z], fov: 42 };
    },
  },
  // 5. over the wall: low on the warning track in right-center, the ball sails over into the seats, fireworks
  landing: {
    opts: {}, frames: 96, prep: homerPrep(HR), skip: 3.7,
    dt: () => 1 / 30,
    each: (f) => { const a = window.__app; if ([52, 60, 68, 78, 88].includes(f)) { const i = f % 7, ang = 0.12 + (i - 3) * 0.12, r = 400 + i * 12; a.fx.firework(Math.sin(ang) * r, 85 + i * 9, -Math.cos(ang) * r, null, 2.2); } },
    cam: (f, n) => {
      const k = H.smooth(f / n);
      return { pos: H.v3([28, 6, -196], [32, 7, -206], k), look: H.v3([92, 48, -352], [100, 60, -372], k), fov: H.lerp(50, 46, k) };
    },
  },
  // 6. the game itself: the pitching view with its marks, a 0-2 slider low and away, he chases it: strike three
  strikeout: {
    opts: { ui: true }, frames: 96,
    prep: `(() => {
      const a = window.__app, e = a.engine;
      for (let i = 0; i < 90; i++) a.tick(1 / 30, false);
      e.game.strikes = 2;
      e.cpuSwingOverride = () => ({ swing: true, aim: { x: -0.3, y: 2.6 }, errorMs: 160 });
      for (let i = 0; i < 30; i++) a.tick(1 / 30, false);
      window.T0 = e.time;
    })()`,
    dt: () => 1 / 30,
    each: (f) => { const a = window.__app, e = a.engine; if (f === 0) { e.selectPitch('slider'); e.setPitchAim(-0.75, 1.75); } if (f === 14) e.startDelivery(); if (f > 14 && e.phase === 'delivery' && !window.S.tap && e.ring && e.time >= e.ring.tStart + e.ring.hitAt) { e.ringTap(0); window.S.tap = 1; } },
    cam: () => null,
  },
  // 7. the double play: low on the outfield grass behind second, the pivot in slow motion, the relay to first
  dp: {
    opts: {}, frames: 120, skip: 0.65,
    prep: `(() => {
      const a = window.__app, e = a.engine;
      for (let i = 0; i < 90; i++) a.tick(1 / 30, false);
      const L = e.battingLineup; e.game.bases = [L[3], null, null];
      e.cpuSwingOverride = () => ({ swing: true, aim: { x: 0, y: 2.5 }, errorMs: 0 });
      e.contactOverride = () => ({ exitVelocity: 80, launchAngle: -6, sprayAngle: -12, backspin: 600, hook: 0 });
      for (let i = 0; i < 20; i++) a.tick(1 / 30, false);
      e.setPitchAim(0, 2.5); e.startDelivery(); window.T0 = e.time;
      const taps = [];
      window.__dpTap = () => { const want = [2, 1][taps.length]; if (want !== undefined && a.throwOpen) { const c = e.throwChoice; if (c && c.bases.find((q) => q.base === want && q.ok) && a.throwKey(want)) taps.push(want); } };
      let t = 0; while (t < 1.7) { a.tick(1 / 120, false); window.__dpTap(); t += 1 / 120; }
    })()`,
    dt: () => { const t = window.__app.engine.time - window.T0; return (t > 3.55 && t < 4.05 ? 0.3 : 0.85) / 30; },
    each: () => { window.__dpTap(); window.__app.fielderRing.hide(); },
    cam: (f, n) => {
      const k = H.smooth(f / n), b = window.__app.actors.ballPos;
      if (!window.S.l) window.S.l = [b.x, b.y, b.z];
      const L = window.S.l; L[0] += (b.x - L[0]) * 0.12; L[1] += (Math.max(2, b.y) - L[1]) * 0.12; L[2] += (b.z - L[2]) * 0.12;
      return { pos: H.v3([-14, 20, -196], [4, 24, -200], k), look: L.slice(), fov: H.lerp(34, 40, k) };
    },
  },
  // 8. the finale: night, high behind home plate, a slow push in while fireworks open over center field
  finale: {
    opts: { tod: 'night' }, frames: 165,
    prep: `(() => { const a = window.__app; for (let i = 0; i < 90; i++) a.tick(1 / 30, false); })()`,
    dt: () => 1 / 30,
    each: (f) => { const a = window.__app; if (f % 14 === 4 && f < 150) { const i = (f / 14) | 0, ang = ((i * 37) % 9 - 4) * 0.11, r = 420 + (i % 3) * 30; a.fx.firework(Math.sin(ang) * r, 110 + (i % 4) * 22, -Math.cos(ang) * r, null, 2.6); } },
    cam: (f, n) => { const k = H.smooth(f / n); return { pos: H.v3([-30, 95, 150], [-12, 60, 70], k), look: H.v3([0, 30, -250], [0, 34, -250], k), fov: 50 }; },
  },
};
