import { addToCart, removeFromCart, getCart } from './cart.js';

function optImg(url, w = 800) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto:best,w_${w}/`);
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let ALL_PRODUCTS = [];
let activeFilter = 'producto';

const FILTERS = [
  { key: 'producto', label: 'Cuidado capilar' },
  { key: 'viajero', label: 'Kit Viajero' },
  { key: 'accesorio', label: 'Accesorios' },
];

const minPrice = (p) => Array.isArray(p.prices) && p.prices.length
  ? Math.min(...p.prices.map(pr => pr.price))
  : null;
const money = (n) => '$' + Number(n).toLocaleString('es-CO');

export async function renderProducts() {
  try {
    const res = await fetch('/api/products');
    const products = await res.json();
    ALL_PRODUCTS = products;

    const groups = { producto: [], viajero: [], accesorio: [] };
    products.forEach(p => {
      const cat = p.category || 'producto';
      if (groups[cat]) groups[cat].push(p);
    });

    fillGrid('grid-productos', groups[activeFilter]);
    renderFilterBar(groups);
    renderKitFeature(groups.viajero[0]);

    document.dispatchEvent(new CustomEvent('cart-update'));
    return products;
  } catch (e) {
    console.warn('Error loading products:', e);
    return [];
  }
}

function fillGrid(id, items) {
  const grid = document.getElementById(id);
  if (!grid) return;
  grid.innerHTML = items.length
    ? items.map(p => renderCard(p)).join('')
    : `<p class="empty-cat" style="grid-column:1/-1;text-align:center;color:#999;padding:2rem">Próximamente</p>`;
}

function productData(p) {
  return {
    id: p.id, name: p.name, desc: p.desc_larga || p.desc || '',
    images: Array.isArray(p.images) ? p.images : [p.image || ''].filter(Boolean),
    prices: p.prices,
  };
}

// JSON listo para un atributo HTML con comillas simples
function productPayload(p) {
  return JSON.stringify(productData(p)).replace(/&/g, '&amp;').replace(/'/g, '&#39;');
}

function addControl(p) {
  const prices = Array.isArray(p.prices) ? p.prices : [];
  if (prices.length === 1) {
    return `<div class="cart-qty-ctrl" data-id="${esc(p.id)}" data-label="${esc(prices[0].label)}" data-price="${prices[0].price}"></div>`;
  }
  return prices.length > 1 ? `<button class="add-cart-btn" type="button">Añadir</button>` : '';
}

// Kit Viajero: banner destacado a lo ancho en lugar de una grilla con una sola tarjeta
function renderKitFeature(p) {
  const el = document.getElementById('kitFeature');
  if (!el) return;
  if (!p) { el.hidden = true; return; }
  const images = Array.isArray(p.images) ? p.images : [p.image].filter(Boolean);
  const price = minPrice(p);
  const sizes = (p.prices || []).map(pr => `<span class="size-tag">${esc(pr.label)}</span>`).join('');
  el.dataset.product = JSON.stringify(productData(p));
  el.innerHTML = `
    <button type="button" class="kit-media kit-details" aria-label="Ver detalles de ${esc(p.name)}">
      <img src="${optImg(images[0] || '', 1200)}" alt="${esc(p.name)}" loading="lazy" decoding="async">
    </button>
    <div class="kit-body">
      <span class="section-number">02 — Edición viajera</span>
      <h2>${esc(p.name)}</h2>
      <p class="kit-tagline">Tu rutina capilar donde vayas</p>
      ${p.desc ? `<p class="kit-desc">${esc(p.desc)}</p>` : ''}
      ${sizes ? `<div class="kit-sizes">${sizes}</div>` : ''}
      ${price !== null ? `<div class="kit-price">${money(price)}</div>` : ''}
      <div class="kit-actions">
        ${addControl(p)}
        <button type="button" class="btn-ghost kit-details">Ver detalles</button>
      </div>
    </div>`;
  el.hidden = false;
}

export function setCatalogFilter(key) {
  if (!FILTERS.some(f => f.key === key)) return;
  const bar = document.getElementById('filterBar');
  if (bar) bar.querySelectorAll('.filter-chip').forEach(c => {
    const on = c.dataset.filter === key;
    c.classList.toggle('active', on);
    c.setAttribute('aria-pressed', String(on));
  });
  if (key === activeFilter) return;
  activeFilter = key;
  applyFilter();
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-filter-link]');
  if (link) setCatalogFilter(link.dataset.filterLink);
});

function renderFilterBar(groups = {}) {
  const grid = document.getElementById('grid-productos');
  if (!grid || document.getElementById('filterBar')) return;

  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  bar.id = 'filterBar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Filtrar por categoría');
  bar.innerHTML = FILTERS.map(f => {
    const on = f.key === activeFilter;
    const count = (groups[f.key] || []).length;
    return `<button type="button" class="filter-chip${on ? ' active' : ''}" data-filter="${f.key}" aria-pressed="${on}">${f.label}<span class="chip-count">${count}</span></button>`;
  }).join('');

  grid.parentElement.insertBefore(bar, grid);

  bar.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    setCatalogFilter(chip.dataset.filter);
  });
}

function applyFilter() {
  const grid = document.getElementById('grid-productos');
  if (!grid) return;

  const items = ALL_PRODUCTS.filter(p => (p.category || 'producto') === activeFilter);

  grid.classList.add('filtering');

  setTimeout(() => {
    grid.innerHTML = items.length
      ? items.map(p => renderCard(p)).join('')
      : `<p class="empty-cat" style="grid-column:1/-1;text-align:center;color:#999;padding:2rem">Próximamente</p>`;

    grid.classList.remove('filtering');
    grid.classList.add('filter-enter');

    const cards = grid.querySelectorAll('.product-card');
    cards.forEach((c, i) => setTimeout(() => c.classList.add('visible'), i * 45));

    setTimeout(() => grid.classList.remove('filter-enter'), 600);
    document.dispatchEvent(new CustomEvent('cart-update'));
    document.dispatchEvent(new CustomEvent('products-rendered'));
  }, 220);
}

function renderCard(p) {
  const images = Array.isArray(p.images) ? p.images : [p.image || p.images || ''].filter(Boolean);
  const firstImg = images[0] || '';

  const priceLabel = p.prices && p.prices.length > 0
    ? `$${Math.min(...p.prices.map(pr => pr.price)).toLocaleString('es-CO')}`
    : '';

  const addBtn = addControl(p);

  const badge = p.badge ? `<span class="card-badge">${esc(p.badge)}</span>` : '';
  const reveal = p.desc ? `<div class="card-reveal"><p>${esc(p.desc)}</p></div>` : '';

  return `
    <div class="product-card" data-product='${productPayload(p)}'>
      <div class="card-image-wrap">
        <img src="${optImg(firstImg)}" alt="${esc(p.name)}" loading="lazy" decoding="async">
        ${badge}
        ${reveal}
        <div class="card-overlay"></div>
      </div>
      <div class="card-info">
        <div class="card-info-top">
          <h3>${esc(p.name)}</h3>
          <span class="card-price">${priceLabel}</span>
        </div>
        ${addBtn}
      </div>
    </div>
  `;
}

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('.kit-details');
  if (!trigger) return;
  const kit = trigger.closest('.kit-feature');
  let data;
  try { data = JSON.parse(kit.dataset.product); } catch {}
  if (data) openProductModal(data, Array.isArray(data.images) ? data.images : [], 0);
});

const isCoarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

document.addEventListener('click', (e) => {
  const card = e.target.closest('.product-card');
  if (!card || e.target.closest('.qty-btn') || e.target.closest('.cart-qty-ctrl') || e.target.closest('.add-cart-btn')) return;

  if (isCoarse && card.querySelector('.card-reveal') && !card.classList.contains('revealed')) {
    card.classList.add('revealed');
    return;
  }

  let productData;
  try { productData = JSON.parse(card.dataset.product); } catch {}
  if (!productData) return;
  const images = Array.isArray(productData.images) ? productData.images : [];
  openProductModal(productData, images, 0);
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.qty-btn, .add-cart-btn');
  if (!btn) return;
  const card = btn.closest('.product-card, .kit-feature');
  if (!card) return;
  let productData;
  try { productData = JSON.parse(card.dataset.product); } catch {}
  if (!productData) return;

  const ctrl = btn.closest('.cart-qty-ctrl');
  if (!ctrl) {
    // Multi-price: open modal so the customer picks the size
    const images = Array.isArray(productData.images) ? productData.images : [];
    openProductModal(productData, images, 0);
    return;
  }

  const id = ctrl.dataset.id;
  const label = ctrl.dataset.label;
  const price = parseInt(ctrl.dataset.price);
  if (btn.dataset.action === 'remove') {
    removeFromCart(productData.id, label);
  } else {
    addToCart(productData, label, price);
  }
});

document.addEventListener('cart-update', () => {
  const cart = getCart();
  document.querySelectorAll('.cart-qty-ctrl').forEach(ctrl => {
    const id = ctrl.dataset.id;
    const label = ctrl.dataset.label;
    const inCart = cart.find(i => i.id === id && i.label === label);
    const qty = inCart ? inCart.qty : 0;
    ctrl.innerHTML = qty > 0
      ? `<button class="qty-btn" data-action="remove">−</button><span class="qty-num">${qty}</span><button class="qty-btn add-btn" data-action="add">+</button>`
      : `<button class="add-cart-btn" data-action="add">Añadir</button>`;
  });
});
