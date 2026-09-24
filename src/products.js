import { addToCart, removeFromCart, getCart } from './cart.js';

function optImg(url, w = 400) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${w}/`);
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
  { key: 'producto', label: 'Producto' },
  { key: 'viajero', label: 'Kit Viajero' },
  { key: 'accesorio', label: 'Accesorios' },
];

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

    fillGrid('grid-productos', groups.producto);
    fillGrid('grid-viajeros', groups.viajero);
    fillGrid('grid-accesorios', groups.accesorio);

    renderFilterBar();

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

function renderFilterBar() {
  const grid = document.getElementById('grid-productos');
  if (!grid || document.getElementById('filterBar')) return;

  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  bar.id = 'filterBar';
  bar.innerHTML = FILTERS.map(
    f => `<button class="filter-chip${f.key === activeFilter ? ' active' : ''}" data-filter="${f.key}">${f.label}</button>`
  ).join('');

  grid.parentElement.insertBefore(bar, grid);

  bar.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip || chip.dataset.filter === activeFilter) return;
    activeFilter = chip.dataset.filter;
    bar.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
    applyFilter();
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

  const prices = Array.isArray(p.prices) ? p.prices : [];
  const single = prices.length === 1 ? prices[0] : null;

  const addBtn = single
    ? `<div class="cart-qty-ctrl" data-id="${p.id}" data-label="${esc(single.label)}" data-price="${single.price}"></div>`
    : prices.length > 1
      ? `<button class="add-cart-btn">Añadir</button>`
      : '';

  const badge = p.badge ? `<span class="card-badge">${esc(p.badge)}</span>` : '';
  const reveal = p.desc ? `<div class="card-reveal"><p>${esc(p.desc)}</p></div>` : '';

  return `
    <div class="product-card" data-product='${JSON.stringify({ id: p.id, name: p.name, desc: p.desc_larga || p.desc || '', images: Array.isArray(p.images) ? p.images : [p.image || ''].filter(Boolean), prices: p.prices }).replace(/&/g, '&amp;').replace(/'/g, '&#39;')}'>
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
  const card = btn.closest('.product-card');
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
