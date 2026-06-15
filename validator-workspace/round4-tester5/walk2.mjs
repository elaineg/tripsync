import { chromium } from 'playwright';
const OUT = '/Users/elaine/app-factory/apps/tripsync/validator-workspace/round4-tester5';
const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  permissions: ['clipboard-read', 'clipboard-write'],
});
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERR ' + e.message));

await p.goto('http://localhost:3099', { waitUntil: 'networkidle' });

// Click through to get a trip / create
const start = p.getByRole('button', { name: /create|start|new trip|plan/i }).first();
if (await start.count() && await start.isVisible().catch(()=>false)) { await start.click(); await p.waitForTimeout(800); }

// Load sample itinerary into paste box
const sample = p.getByText(/load sample/i).first();
if (await sample.count()) { await sample.click(); await p.waitForTimeout(600); }

// Parse
const parse = p.getByRole('button', { name: /parse/i }).first();
if (await parse.count()) { await parse.click(); await p.waitForTimeout(900); }
await p.screenshot({ path: `${OUT}/10-after-parse.png`, fullPage: true });

// Commit / add all events
const commitNames = ['add all', 'create trip', 'looks good', 'add these', 'commit', 'add to calendar', 'confirm', 'save these', 'add \\d+ event'];
for (const t of commitNames) {
  const btn = p.getByRole('button', { name: new RegExp(t, 'i') }).first();
  if (await btn.count() && await btn.isVisible().catch(()=>false)) { await btn.click().catch(()=>{}); await p.waitForTimeout(1200); break; }
}
await p.keyboard.press('Escape').catch(()=>{});
await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/11-loaded.png`, fullPage: true });

const overflow = await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));

// Toggle region screenshot + check for dark sliver to the right of Month
let toggleClip = null;
const month = p.getByText(/^Month$/).first();
if (await month.count()) {
  const box = await month.boundingBox();
  if (box) {
    await p.screenshot({ path: `${OUT}/12-toggle.png`, clip: { x: 0, y: Math.max(0,box.y-12), width: 390, height: 64 } });
  }
}
// Inspect element immediately following the Month button for a clipped dark button
toggleClip = await p.evaluate(() => {
  const els = [...document.querySelectorAll('button')];
  const m = els.find(e => /^month$/i.test((e.textContent||'').trim()));
  if (!m) return { monthFound: false };
  const r = m.getBoundingClientRect();
  // anything at the right edge of viewport overlapping the toggle row
  const row = els.map(e => ({ t: (e.textContent||'').trim().slice(0,20), ...e.getBoundingClientRect().toJSON(), bg: getComputedStyle(e).backgroundColor }))
    .filter(e => Math.abs(e.y - r.y) < 20 && e.right > r.right);
  return { monthFound: true, monthRight: Math.round(r.right), siblingsRightOfMonth: row.map(e=>({t:e.t,left:Math.round(e.left),right:Math.round(e.right),bg:e.bg})) };
});

// ICS button
const icsInfo = await p.evaluate(() => {
  const els = [...document.querySelectorAll('button, a')];
  const cand = els.find(e => /save to calendar|download all|\.ics/i.test(e.textContent || ''));
  if (!cand) return { found: false };
  const r = cand.getBoundingClientRect();
  let clipper = null, node = cand.parentElement;
  while (node) {
    const cs = getComputedStyle(node);
    if (cs.overflowX === 'hidden' || cs.overflow === 'hidden' || cs.overflowX === 'clip') {
      const nr = node.getBoundingClientRect();
      if (r.right > nr.right + 0.5) { clipper = { tag: node.tagName, right: Math.round(nr.right) }; break; }
    }
    node = node.parentElement;
  }
  return { found: true, text: cand.textContent.trim(), left: Math.round(r.left), right: Math.round(r.right), offRight: r.right > 390.5, clipper };
});
// screenshot ics button area
const icsBtn = p.getByText(/save to calendar|download all/i).first();
if (await icsBtn.count()) {
  const bx = await icsBtn.boundingBox();
  if (bx) await p.screenshot({ path: `${OUT}/13-ics.png`, clip: { x: 0, y: Math.max(0,bx.y-8), width: 390, height: Math.min(60, 844) } });
}

console.log(JSON.stringify({ overflow, toggleClip, icsInfo, errs }, null, 2));
await b.close();
