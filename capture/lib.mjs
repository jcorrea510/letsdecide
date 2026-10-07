import { chromium } from '/home/jackcorrea/baseball/node_modules/playwright-core/index.mjs';
export async function open({ w = 1920, h = 1080, seed = 4, tod = 'dusk', park = 'sandlot', ui = false } = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/helium/helium', args: ['--no-sandbox', '--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.text()); });
  await page.goto(`http://localhost:5173/?mode=quick&seed=${seed}&tod=${tod}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-boot') === 'ready' && window.__app && window.__app.engine, null, { timeout: 120000 });
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important} #boot{display:none!important}' + (ui ? ' .hint,.bugwrap,.lineup,.pitchtag,.iconbtn,.pitchside{display:none!important}' : ' #ui{display:none!important}') });
  await page.evaluate(([park]) => {
    const a = window.__app; a.halted = true;
    if (park !== 'sandlot') { a.prog.settings.park = park; a.startGame('quick'); }
    if (a.engine && a.engine.opponent) { a.engine.opponent = { ...a.engine.opponent, abbr: 'BAY', name: 'Bay City' }; a.updateScoreboard(); }
    a.settings.zone = false; a.settings.landingRing = false; a.settings.pitchGuide = false; a.zone.visible = false;
    if (a.ui.rotateEl) a.ui.rotateEl.style.display = 'none';
    const lerp = (x, y, k) => x + (y - x) * k;
    const clamp01 = (k) => Math.max(0, Math.min(1, k));
    const smooth = (k) => { k = clamp01(k); return k * k * (3 - 2 * k); };
    const easeOut = (k) => 1 - Math.pow(1 - clamp01(k), 3);
    const v3 = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)];
    window.H = { lerp, clamp01, smooth, easeOut, v3 };
  }, [park]);
  return { browser, page };
}
