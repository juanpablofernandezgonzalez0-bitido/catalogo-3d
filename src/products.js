import { addToCart, removeFromCart, getCart } from './cart.js';

export async function renderProducts() {
  try {
    const res = await fetch('/api/products');
    const products = await res.json();

    const groups = { producto: [], viajero: [], accesorio: [] };
    products.forEach(p => {
      const cat = p.category || 'producto';
      if (groups[cat]) groups[cat].push(p);
    });

    for (const [cat, items] of Object.entries(groups)) {
      const grid = document.getElementById(`grid-${cat === 'viajero' ? 'viajeros' : cat === 'accesorio' ? 'accesorios' : 'productos'}`);
      if (!grid) continue;
      grid.innerHTML = items.length
        ? items.map(p => renderCard(p)).join('')
        : `<p class="empty-cat" style="grid-column:1/-1;text-align:center;color:#999;padding:2rem">Próximamente</p>`;
    }

    document.dispatchEvent(new CustomEvent('cart-update'));
  } catch (e) {
    console.warn('Error loading products:', e);
  }
}

function renderCard(p) {
  const cart = getCart();
  const images = Array.isArray(p.images) ? p.images : [p.image || p.images || ''].filter(Boolean);
  const firstImg = images[0] || '';

  const priceLabel = p.prices && p.prices.length > 0
    ? `$${Math.min(...p.prices.map(pr => pr.price)).toLocaleString('es-CO')}`
    : '';

  const prices = Array.isArray(p.prices) ? p.prices : [];
  const single = prices.length === 1 ? prices[0] : null;

  const addBtn = single
    ? `<div class="cart-qty-ctrl" data-id="${p.id}" data-label="${single.label}" data-price="${single.price}"></div>`
    : prices.length > 1
      ? `<button class="add-cart-btn">Añadir</button>`
      : '';

  return `
    <div class="product-card" data-product='${JSON.stringify({ id: p.id, name: p.name, desc: p.desc_larga || p.desc || '', images: Array.isArray(p.images) ? p.images : [p.image || ''].filter(Boolean), prices: p.prices }).replace(/'/g, "&#39;")}'>
      <div class="card-image-wrap">
        <img src="${firstImg}" alt="${p.name}" loading="lazy">
        <div class="card-overlay"></div>
      </div>
      <div class="card-info">
        <div class="card-info-top">
          <h3>${p.name}</h3>
          <span class="card-price">${priceLabel}</span>
        </div>
        ${addBtn}
      </div>
    </div>
  `;
}

document.addEventListener('click', (e) => {
  const card = e.target.closest('.product-card');
  if (!card || e.target.closest('.qty-btn') || e.target.closest('.cart-qty-ctrl') || e.target.closest('.add-cart-btn')) return;
  let productData;
  try { productData = JSON.parse(card.dataset.product); } catch {}
  if (!productData) return;
  const images = Array.isArray(productData.images) ? productData.images : [];
  openProductModal(productData, images, 0);
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.qty-btn, .add-cart-btn');
  if (!btn) return;
  const ctrl = btn.closest('.cart-qty-ctrl');
  if (!ctrl) return;
  const card = btn.closest('.product-card');
  const id = ctrl.dataset.id;
  const label = ctrl.dataset.label;
  const price = parseInt(ctrl.dataset.price);
  let productData;
  try { productData = JSON.parse(card.dataset.product); } catch {}
  if (!productData) productData = { id, name: id, images: [] };
  if (btn.dataset.action === 'add') {
    addToCart(productData, label, price);
  } else {
    removeFromCart(productData.id, label);
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
