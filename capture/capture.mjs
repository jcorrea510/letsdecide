import { open } from './lib.mjs';
import { SHOTS } from './shots.mjs';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const [name, mode] = process.argv.slice(2); // mode: 'preview' = small, every 6th frame into a contact sheet
const s = SHOTS[name];
const preview = mode === 'preview';
const { browser, page } = await open({ ...s.opts, ...(preview ? { w: 640, h: 360 } : {}) });
await page.evaluate(([prep, skip]) => { window.S = {}; eval(prep); const a = window.__app; let t = 0; while (t < (skip || 0) - 1e-6) { a.tick(1 / 120, false); t += 1 / 120; } }, [s.prep, s.skip]);
const dir = `${process.cwd()}/frames/${name}${preview ? '_p' : ''}`;
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
let saved = 0;
for (let f = 0; f < s.frames; f++) {
  const keep = !preview || f % 6 === 0;
  const info = await page.evaluate(([f, n, dt, cam, keep, each, noTrail]) => {
    const a = window.__app, e = a.engine;
    const step = eval(`(${dt})`)(f, n);
    let rem = step; while (rem > 1e-7) { const d = Math.min(rem, 1 / 120); a.tick(d, false); rem -= d; }
    if (each) eval(`(${each})`)(f, n);
    if (noTrail) a.S.scene.traverse((o) => { if (o.isPoints && o.geometry.attributes.aAlpha) o.visible = false; });
    a.cam.override = eval(`(${cam})`)(f, n);
    a.zone.visible = false; a.pitchMarker.visible = false;
    a.tick(0.000001, keep);
    return { t: +(e.time - (window.T0 || 0)).toFixed(2), ph: e.phase };
  }, [f, s.frames, s.dt.toString(), s.cam.toString(), keep, s.each ? s.each.toString() : null, !!s.noTrail]);
  if (keep) await page.screenshot({ path: `${dir}/${String(saved++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: preview ? 80 : 95 });
  if (f % 30 === 0) console.log(name, f, JSON.stringify(info));
}
await browser.close();
if (preview) {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', `${dir}/%04d.jpg`, '-vf', 'scale=320:-1,tile=5x' + Math.ceil(saved / 5), '-frames:v', '1', `${process.cwd()}/sheet_${name}.jpg`]);
} else {
  mkdirSync('clips', { recursive: true });
  execFileSync('/home/jackcorrea/letsdecide/.tools/ffbin/ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-i', `${dir}/%04d.jpg`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', `clips/${name}.mp4`]);
}
console.log('done', name, saved);
