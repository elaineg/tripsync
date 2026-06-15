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
await p.screenshot({ path: `${OUT}/01-cold.png` });

// Load sample
const sample = p.getByText(/load sample/i).first();
if (await sample.count()) { await sample.click(); await p.waitForTimeout(800); }
await p.screenshot({ path: `${OUT}/02-after-sample.png` });

// Commit the trip (look for commit/create button)
const commitBtns = ['create trip', 'commit', 'looks good', 'create', 'confirm', 'add to calendar', 'add all', 'save these'];
let committed = false;
for (const t of commitBtns) {
  const btn = p.getByRole('button', { name: new RegExp(t, 'i') }).first();
  if (await btn.count() && await btn.isVisible().catch(()=>false)) {
    await btn.click().catch(()=>{}); await p.waitForTimeout(1000); committed = true; break;
  }
}
await p.screenshot({ path: `${OUT}/03-after-commit.png`, fullPage: true });

// Dismiss any modal
await p.keyboard.press('Escape').catch(()=>{});
await p.waitForTimeout(400);

// Check horizontal overflow
const overflow = await p.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}));

// Find Day/Week/Month toggle region and screenshot it
let toggleInfo = null;
const dayBtn = p.getByText(/^Day$/).first();
if (await dayBtn.count()) {
  const box = await dayBtn.boundingBox();
  if (box) {
    await p.screenshot({ path: `${OUT}/04-toggle-region.png`, clip: { x: Math.max(0,box.x-10), y: Math.max(0,box.y-10), width: Math.min(390-Math.max(0,box.x-10), 390), height: 70 } });
    toggleInfo = box;
  }
}

// Find the Save to calendar (.ics) button and inspect its label + clipping
const icsInfo = await p.evaluate(() => {
  const els = [...document.querySelectorAll('button, a')];
  const cand = els.find(e => /save to calendar|\.ics|download all/i.test(e.textContent || ''));
  if (!cand) return { found: false };
  const r = cand.getBoundingClientRect();
  // walk ancestors for overflow clipping
  let clipper = null, node = cand.parentElement;
  while (node) {
    const cs = getComputedStyle(node);
    if (cs.overflowX === 'hidden' || cs.overflow === 'hidden') {
      const nr = node.getBoundingClientRect();
      if (r.right > nr.right + 0.5 || r.left < nr.left - 0.5) {
        clipper = { tag: node.tagName, right: Math.round(nr.right), text: (node.textContent||'').slice(0,30) };
        break;
      }
    }
    node = node.parentElement;
  }
  return {
    found: true,
    text: cand.textContent.trim(),
    rectRight: Math.round(r.right),
    rectLeft: Math.round(r.left),
    offRight: r.right > 390.5,
    clipper,
  };
});

await p.screenshot({ path: `${OUT}/05-full.png`, fullPage: true });

// Copy invite
let copyResult = 'not found';
const copyBtn = p.getByRole('button', { name: /copy.*(invite|link)|invite link/i }).first();
if (await copyBtn.count()) {
  await copyBtn.click().catch(()=>{}); await p.waitForTimeout(400);
  copyResult = await p.evaluate(() => navigator.clipboard.readText().catch(()=>'BLOCKED')).catch(()=>'BLOCKED');
}

console.log(JSON.stringify({ overflow, toggleInfo, icsInfo, copyResult, committed, errs }, null, 2));
await b.close();
