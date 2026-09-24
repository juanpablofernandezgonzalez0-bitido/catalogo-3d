import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DIST = '/Users/juanpablofernandez/Documents/Landiing/catalogo-3d/dist';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const API = 'https://catalogo-massscabellos.vercel.app';
const LIVE = process.env.LIVE === '1';

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url.startsWith('/api/')) {
    fetch(API + url, { headers: req.headers.accept ? { accept: req.headers.accept } : {} })
      .then(async (r) => {
        res.writeHead(r.status, { 'content-type': r.headers.get('content-type') || 'application/json' });
        res.end(Buffer.from(await r.arrayBuffer()));
      })
      .catch((e) => { res.writeHead(502); res.end(String(e)); });
    return;
  }
  // replique los rewrites de vercel.json
  let f;
  if (url === '/admin') f = path.join(DIST, 'admin.html');
  else if (url === '/' ) f = path.join(DIST, 'index.html');
  else f = path.join(DIST, url);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

if (!LIVE) await new Promise((r) => server.listen(4321, r));
const BASE = LIVE ? API : 'http://localhost:4321';

const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, pass: !!cond, extra }); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const api = await (await fetch(API + '/api/products')).json();
const byCat = { producto: 0, viajero: 0, accesorio: 0 };
api.forEach((p) => { const c = p.category || 'producto'; byCat[c] = (byCat[c] || 0) + 1; });

// ── BLOCK 5: filters ──
const chips = await page.locator('#filterBar .filter-chip').count();
ok('Filtros: 3 chips', chips === 3, `got ${chips}`);
const activeTxt = (await page.locator('#filterBar .filter-chip.active').innerText()).trim();
ok('Filtro activo por defecto = Producto', activeTxt === 'Producto', activeTxt);
let n = await page.locator('#grid-productos .product-card').count();
ok('Grilla default = productos', n === byCat.producto, `got ${n} want ${byCat.producto}`);

await page.locator('#filterBar .filter-chip[data-filter="accesorio"]').click();
await page.waitForTimeout(700);
n = await page.locator('#grid-productos .product-card').count();
ok('Filtro Accesorios', n === byCat.accesorio, `got ${n} want ${byCat.accesorio}`);
const vis = await page.locator('#grid-productos .product-card.visible').count();
ok('Tras filtro, cards visibles', vis === n, `${vis}/${n}`);

await page.locator('#filterBar .filter-chip[data-filter="viajero"]').click();
await page.waitForTimeout(700);
n = await page.locator('#grid-productos .product-card').count();
ok('Filtro Kit Viajero', n === byCat.viajero, `got ${n} want ${byCat.viajero}`);
await page.locator('#filterBar .filter-chip[data-filter="producto"]').click();
await page.waitForTimeout(700);

// ── BLOCK 2: badge + reveal ──
const badges = await page.locator('#grid-productos .card-badge').count();
const wantBadges = api.filter((p) => p.badge).length;
ok('Badges renderizados', badges === wantBadges && badges > 0, `${badges} (api: ${wantBadges})`);
const badgeTxt = badges ? (await page.locator('#grid-productos .card-badge').first().innerText()).trim() : '';
ok('Texto de badge', badgeTxt.length > 0, badgeTxt);

const reveal = await page.locator('#grid-productos .card-reveal').count();
ok('Reveal panels', reveal > 0, `${reveal} of ${byCat.producto}`);

const firstCard = page.locator('#grid-productos .product-card').first();
await firstCard.hover();
await page.waitForTimeout(500);
const rBox = await firstCard.locator('.card-reveal').boundingBox();
const rVisible = await firstCard.locator('.card-reveal').evaluate((el) => {
  const st = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return { transform: st.transform, rect: r.height, opacity: st.opacity };
});
const m = rVisible.transform.match(/matrix\(1, 0, 0, 1, 0, (-?[\d.e+-]+)/);
const ty = m ? Math.abs(parseFloat(m[1])) : null;
ok('Reveal se muestra al hover (translateY ~ 0)', ty !== null && ty < 1, rVisible.transform + ' rectH=' + rVisible.rect);

// ── BLOCK 3: hero slider ──
const slides = await page.locator('.hero-visual .hero-slide').count();
ok('Hero slides >= 2', slides >= 2, `${slides}`);
const activeSlides = await page.locator('.hero-visual .hero-slide.is-active').count();
ok('Exactamente 1 slide activo', activeSlides === 1, `${activeSlides}`);
const hv = await page.locator('.hero-visual').boundingBox();
ok('hero-visual con altura > 200', hv && hv.height > 200, hv ? Math.round(hv.height) : 'null');
await page.waitForTimeout(4200);
const firstActive = await page.locator('.hero-visual .hero-slide').first().evaluate((el) => el.classList.contains('is-active'));
ok('Slider rota (el 1º deja de ser activo)', firstActive === false, String(firstActive));

// ── modal ──
await firstCard.click();
await page.waitForTimeout(600);
const modalVisible = await page.evaluate(() => {
  const m = document.getElementById('lightbox');
  if (!m) return 'missing';
  const st = getComputedStyle(m);
  return { display: st.display, opacity: st.opacity, cls: m.className };
});
ok('Modal abre al click', modalVisible.cls.includes('active') && modalVisible.display !== 'none', JSON.stringify(modalVisible));
const lbName = await page.locator('#lbName').innerText();
ok('Modal muestra nombre', lbName.trim().length > 0, lbName);
const priceRows = await page.locator('#lbPrices .lb-price-row').count();
ok('Modal lista precios', priceRows > 0, String(priceRows));

// Escape cierra
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const closed = await page.evaluate(() => !document.getElementById('lightbox').classList.contains('active'));
ok('Escape cierra el modal', closed, String(closed));
const overflow = await page.evaluate(() => document.body.style.overflow);
ok('Escape restaura scroll del body', overflow !== 'hidden', overflow || '(vacío)');

// ── BLOCK 4: toast + cart ──
const before = await page.locator('#cartBadge').innerText().catch(() => '0');
const addBtn = page.locator('#grid-productos .product-card .cart-qty-ctrl .add-cart-btn, #grid-productos .product-card .cart-qty-ctrl .qty-btn').first();
if (await addBtn.count()) {
  await addBtn.click();
  await page.waitForTimeout(500);
  const toast = await page.locator('#cartToast.show').count();
  const toastHTML = await page.locator('#cartToast').innerHTML().catch(() => '');
  ok('Toast de carrito aparece', toast > 0, toastHTML.slice(0, 120));
  ok('Toast tiene miniatura', /<img/.test(toastHTML), '');
  ok('Toast tiene contador', /toast-count/.test(toastHTML), '');
  const after = await page.locator('#cartBadge').innerText().catch(() => '0');
  ok('Badge contador cambia', before !== after, `${before} -> ${after}`);
} else {
  ok('Botón añadir encontrado', false, 'no add button');
}

// multi-price add → modal
const multi = page.locator('#grid-productos .product-card .card-info > .add-cart-btn').first();
if (await multi.count()) {
  await multi.click();
  await page.waitForTimeout(500);
  const mv = await page.evaluate(() => {
    const m = document.getElementById('lightbox');
    return m ? (m.classList.contains('active') ? 'active' : 'closed') : 'missing';
  });
  ok('Add multi-precio abre modal', mv === 'active', mv);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// ── cart drawer + WhatsApp ──
await page.locator('#cartToggle').click();
await page.waitForTimeout(500);
const drawerOpen = await page.locator('#cartDrawer.open').count();
ok('Drawer de carrito abre', drawerOpen === 1, String(drawerOpen));
const items = await page.locator('#cartBody .cart-item').count();
ok('Drawer lista items', items >= 1, String(items));
const itemName = items ? (await page.locator('#cartBody .cart-item-name').first().innerText()).trim() : '';
ok('Item con nombre real (no id)', itemName.length > 0 && !/^[a-z0-9-]{3,}$/.test(itemName), itemName);
const waHref = await page.locator('#cartWABtn').getAttribute('href');
ok('WhatsApp con texto codificado', /^https:\/\/wa\.me\/\d+\?text=/.test(waHref || '') && !/ /.test(waHref || ''), (waHref || '').slice(0, 80));
const waText = decodeURIComponent((waHref || '').split('text=')[1] || '');
ok('WhatsApp incluye nombre y total', /quiero pedir/.test(waText) && /Total/.test(waText) && itemName.length > 0 ? waText.includes(itemName) : false, waText.slice(0, 90));
const plusOk = await page.evaluate(() => {
  const b = document.querySelector('#cartBody .cart-item-qty button:last-child');
  return b && b.getAttribute('onclick') && !b.getAttribute('onclick').includes('undefined');
});
ok('Botón + del drawer invocado bien', plusOk === true, String(plusOk));
// Escape cierra drawer
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
ok('Escape cierra el drawer', (await page.locator('#cartDrawer.open').count()) === 0);

// ── block 1 sanity: animations / no crash ──
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
const visibleCards = await page.locator('.product-card.visible').count();
const totalCards = await page.locator('.product-card').count();
ok('Scroll revela cards (bloque 1)', visibleCards > 0, `${visibleCards}/${totalCards}`);

// ── reduced motion ──
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const p2 = await ctx2.newPage();
const rmErrors = [];
p2.on('pageerror', (e) => rmErrors.push(e.message));
await p2.goto(BASE + '/', { waitUntil: 'networkidle' });
await p2.waitForTimeout(1500);
ok('prefers-reduced-motion sin errores', rmErrors.length === 0, rmErrors.slice(0, 3).join(' | '));
await ctx2.close();

// ── MOBILE ──
const mctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const mp = await mctx.newPage();
const mobileErrors = [];
mp.on('pageerror', (e) => mobileErrors.push(e.message));
mp.on('console', (m) => { if (m.type() === 'error') mobileErrors.push('C:' + m.text()); });
await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
await mp.waitForTimeout(1500);

ok('Mobile: chips presentes', (await mp.locator('#filterBar .filter-chip').count()) === 3);
const chipBox = await mp.locator('#filterBar .filter-chip').first().boundingBox();
const overflowX = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok('Mobile: sin scroll horizontal', overflowX <= 0, `overflow ${overflowX}px`);
ok('Mobile: chips en viewport', chipBox && chipBox.x >= 0 && chipBox.x + chipBox.width <= 375, chipBox ? `${Math.round(chipBox.x)}/${Math.round(chipBox.width)}` : 'null');
const mhv = await mp.locator('.hero-visual').boundingBox();
ok('Mobile: hero con altura', mhv && mhv.height >= 280, mhv ? Math.round(mhv.height) : 'null');

const mcard = mp.locator('#grid-productos .product-card').first();
const hasReveal = await mcard.locator('.card-reveal').count();
if (hasReveal) {
  await mcard.click();
  await mp.waitForTimeout(400);
  const rev = await mcard.evaluate((el) => el.classList.contains('revealed'));
  ok('Mobile: 1er toque revela (tap→reveal)', rev === true, String(rev));
  await mcard.click();
  await mp.waitForTimeout(500);
  const mdisp = await mp.evaluate(() => document.getElementById('lightbox').classList.contains('active'));
  ok('Mobile: 2º toque abre modal', mdisp === true, String(mdisp));
  await mp.keyboard.press('Escape');
  await mp.waitForTimeout(300);
} else {
  ok('Mobile: reveal en cards', false, 'sin reveal');
}
ok('Mobile: sin errores JS', mobileErrors.length === 0, mobileErrors.slice(0, 3).join(' | '));
await mctx.close();

// ── ADMIN ──
const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const ap = await actx.newPage();
const adminErrors = [];
ap.on('pageerror', (e) => adminErrors.push(e.message));
await ap.goto(BASE + '/admin', { waitUntil: 'networkidle' });
await ap.waitForTimeout(1500);
ok('Admin: carga', (await ap.locator('body').innerText()).length > 100);
ok('Admin: sin errores JS', adminErrors.length === 0, adminErrors.slice(0, 3).join(' | '));
const badgeField = await ap.locator('#edit-badge').count();
ok('Admin: campo de badge existe', badgeField === 1, String(badgeField));
const opts = await ap.locator('#edit-badge option').count();
ok('Admin: opciones de badge >= 5', opts >= 5, String(opts));
await actx.close();

ok('Desktop: sin errores JS', consoleErrors.length === 0, consoleErrors.slice(0, 4).join(' | '));

await browser.close();
if (!LIVE) server.close();

// ── report ──
let fail = 0;
for (const r of results) {
  if (!r.pass) fail++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.extra ? '  [' + r.extra + ']' : ''}`);
}
console.log(`\n${results.length - fail}/${results.length} checks OK`);
process.exit(fail ? 1 : 0);
