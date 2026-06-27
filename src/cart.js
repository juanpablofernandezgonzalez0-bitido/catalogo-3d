const STORAGE_KEY = 'masss_cart';

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  document.dispatchEvent(new CustomEvent('cart-update'));
}

export function addToCart(product, label, price) {
  const items = getCart();
  const existing = items.find(i => i.id === product.id && i.label === label);
  if (existing) {
    existing.qty += 1;
  } else {
    items.push({
      id: product.id,
      name: product.name,
      label,
      price,
      qty: 1,
      image: (Array.isArray(product.images) ? product.images[0] : product.image) || '',
    });
  }
  saveCart(items);
  document.dispatchEvent(new CustomEvent('cart-added', { detail: { name: product.name, label } }));
}

export function removeFromCart(productId, label) {
  const items = getCart();
  const idx = items.findIndex(i => i.id === productId && i.label === label);
  if (idx === -1) return;
  if (items[idx].qty > 1) {
    items[idx].qty -= 1;
  } else {
    items.splice(idx, 1);
  }
  saveCart(items);
}

export function clearCart() {
  localStorage.removeItem(STORAGE_KEY);
  document.dispatchEvent(new CustomEvent('cart-update'));
}

export function getTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function getCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

export function getWhatsAppText() {
  const items = getCart();
  if (!items.length) return '';
  let msg = 'Hola, quiero pedir:\n\n';
  items.forEach(i => {
    msg += `• ${i.name} — ${i.label} x${i.qty} = $${(i.price * i.qty).toLocaleString('es-CO')}\n`;
  });
  msg += `\nTotal: $${getTotal().toLocaleString('es-CO')}`;
  return encodeURIComponent(msg);
}
