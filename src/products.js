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

    document.querySelectorAll('.card-image-wrap').forEach(wrap => {
      const images = JSON.parse(wrap.dataset.images || '[]');
      if (images.length > 1) startAutoPlay(wrap);
    });
  } catch (e) {
    console.warn('Error loading products:', e);
  }
}

function renderCard(p) {
  const cart = getCart();

  const priceRows = p.prices.map(pr => {
    const inCart = cart.find(i => i.id === p.id && i.label === pr.label);
    const qty = inCart ? inCart.qty : 0;
    return `
      <div class="price-row">
        <span>${pr.label}</span>
        <span class="price-val">$${pr.price.toLocaleString('es-CO')}</span>
        <span class="cart-qty-ctrl" data-id="${p.id}" data-label="${pr.label}" data-price="${pr.price}">
          ${qty > 0 ? `
            <button class="qty-btn" data-action="remove">−</button>
            <span class="qty-num">${qty}</span>
          ` : ''}
          <button class="qty-btn add-btn" data-action="add">+</button>
        </span>
      </div>`;
  }).join('');

  const images = Array.isArray(p.images) ? p.images : [p.image || p.images || ''].filter(Boolean);
  const firstImg = images[0] || '';
  const hasMultiple = images.length > 1;

  const dots = hasMultiple ? `<div class="gallery-dots">${images.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}" data-idx="${i}"></span>`).join('')}</div>` : '';

  return `
    <div class="product-card" data-product='${JSON.stringify({ id: p.id, name: p.name, images: Array.isArray(p.images) ? p.images : [p.image || ''].filter(Boolean) }).replace(/'/g, "&#39;")}'>
      <div class="card-image-wrap" data-images='${JSON.stringify(images)}'>
        <img src="${firstImg}" alt="${p.name}" loading="lazy">
        <div class="card-overlay"></div>
        ${hasMultiple ? `
          <button class="gallery-arrow left" data-dir="prev">‹</button>
          <button class="gallery-arrow right" data-dir="next">›</button>
        ` : ''}
        ${dots}
      </div>
      <div class="card-info">
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="prices">${priceRows}</div>
      </div>
    </div>
  `;
}

function goToImage(wrap, idx) {
  const images = JSON.parse(wrap.dataset.images);
  if (idx < 0) idx = images.length - 1;
  if (idx >= images.length) idx = 0;
  wrap.querySelector('img').src = images[idx];
  wrap.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  wrap.dataset.currentIdx = idx;
}

function startAutoPlay(wrap) {
  let timer = setInterval(() => {
    const images = JSON.parse(wrap.dataset.images);
    const current = parseInt(wrap.dataset.currentIdx || '0');
    goToImage(wrap, current + 1);
  }, 3500);
  wrap.dataset.timer = timer;

  wrap.addEventListener('mouseenter', () => {
    clearInterval(timer);
    timer = setInterval(() => {
      const images = JSON.parse(wrap.dataset.images);
      const current = parseInt(wrap.dataset.currentIdx || '0');
      goToImage(wrap, current + 1);
    }, 3500);
    wrap.dataset.timer = timer;
  });

  wrap.addEventListener('mouseleave', () => {
    clearInterval(timer);
    timer = setInterval(() => {
      const images = JSON.parse(wrap.dataset.images);
      const current = parseInt(wrap.dataset.currentIdx || '0');
      goToImage(wrap, current + 1);
    }, 3500);
    wrap.dataset.timer = timer;
  });
}

document.addEventListener('click', (e) => {
  const arrow = e.target.closest('.gallery-arrow');
  if (!arrow) return;
  e.stopPropagation();
  const wrap = arrow.closest('.card-image-wrap');
  const dir = arrow.dataset.dir === 'next' ? 1 : -1;
  const current = parseInt(wrap.dataset.currentIdx || '0');
  goToImage(wrap, current + dir);
});

document.addEventListener('click', (e) => {
  const wrap = e.target.closest('.card-image-wrap');
  if (!wrap || e.target.closest('.gallery-arrow')) return;
  const images = JSON.parse(wrap.dataset.images || '[]');
  if (images.length > 0) {
    const idx = parseInt(wrap.dataset.currentIdx || '0');
    openLightbox(images, idx);
  }
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.qty-btn');
  if (!btn) return;
  const ctrl = btn.closest('.cart-qty-ctrl');
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
      : `<button class="qty-btn add-btn" data-action="add">+</button>`;
  });
});
