import { chromium } from 'playwright';
const OUT = '/Users/elaine/app-factory/apps/tripsync/validator-workspace/round4-tester5';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['clipboard-read','clipboard-write'] });
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERR '+e.message));

await p.goto('http://localhost:3099', { waitUntil: 'networkidle' });
const sample = p.getByText(/load sample/i).first();
if (await sample.count()) { await sample.click(); await p.waitForTimeout(500); }
const parse = p.getByRole('button', { name: /parse/i }).first();
if (await parse.count()) { await parse.click(); await p.waitForTimeout(900); }

// list all visible buttons to find the commit
const btns = await p.evaluate(() => [...document.querySelectorAll('button')].map(e=>e.textContent.trim()).filter(Boolean));

// click the one that adds events
let clicked = null;
for (const t of [/add \d+ event/i, /add all/i, /confirm/i, /looks good/i, /add to/i, /create/i]) {
  const btn = p.getByRole('button', { name: t }).first();
  if (await btn.count() && await btn.isVisible().catch(()=>false)) { await btn.scrollIntoViewIfNeeded(); await btn.click(); clicked = (await btn.textContent()).trim(); await p.waitForTimeout(1200); break; }
}
await p.keyboard.press('Escape').catch(()=>{});
await p.waitForTimeout(500);
await p.evaluate(()=>window.scrollTo(0,0));
await p.screenshot({ path: `${OUT}/20-loaded-top.png`, fullPage: true });

const overflow = await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));

// auto-scroll position check
const scrollY = await p.evaluate(() => {
  const grid = document.querySelector('[class*="overflow"]');
  return window.scrollY;
});

const icsInfo = await p.evaluate(() => {
  const els = [...document.querySelectorAll('button, a')];
  const cand = els.find(e => /save to calendar|download all|\.ics/i.test(e.textContent || ''));
  if (!cand) return { found: false, allBtns: els.map(e=>e.textContent.trim()).filter(Boolean).slice(0,30) };
  const r = cand.getBoundingClientRect();
  let clipper = null, node = cand.parentElement;
  while (node) {
    const cs = getComputedStyle(node);
    if (['hidden','clip'].includes(cs.overflowX) || ['hidden','clip'].includes(cs.overflow)) {
      const nr = node.getBoundingClientRect();
      if (r.right > nr.right + 0.5 || r.left < nr.left - 0.5) { clipper = { tag: node.tagName, right: Math.round(nr.right) }; break; }
    }
    node = node.parentElement;
  }
  return { found: true, text: cand.textContent.trim(), left: Math.round(r.left), right: Math.round(r.right), offRight: r.right > 390.5, fullyVisible: r.left >= 0 && r.right <= 390.5, clipper };
});
const icsBtn = p.getByText(/save to calendar|download all/i).first();
if (await icsBtn.count()) { await icsBtn.scrollIntoViewIfNeeded(); const bx = await icsBtn.boundingBox(); if (bx) await p.screenshot({ path: `${OUT}/21-ics.png`, clip: { x:0, y:Math.max(0,bx.y-10), width:390, height:60 } }); }

// toggle screenshot
const month = p.getByText(/^Month$/).first();
if (await month.count()) { const bx = await month.boundingBox(); if (bx) await p.screenshot({ path: `${OUT}/22-toggle.png`, clip:{x:0,y:Math.max(0,bx.y-12),width:390,height:60} }); }

console.log(JSON.stringify({ clicked, overflow, scrollY, icsInfo, errs, btns: btns.slice(0,20) }, null, 2));
await b.close();
