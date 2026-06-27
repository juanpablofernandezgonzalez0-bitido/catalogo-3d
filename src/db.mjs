const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabase(method, path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function toProduct(row) {
  if (!row) return null;
  const { sort_order, description, ...rest } = row;
  return { ...rest, order: sort_order, desc: description ?? '' };
}

export async function getProducts() {
  const rows = await supabase('GET', 'products?select=*&order=sort_order.asc');
  return rows.map(toProduct);
}

export async function getProduct(id) {
  const rows = await supabase('GET', `products?id=eq.${id}&select=*`);
  return rows.length ? toProduct(rows[0]) : null;
}

function toRow(data) {
  const { order: o, desc: d, ...rest } = data;
  const row = { ...rest };
  if (o !== undefined) row.sort_order = o;
  if (d !== undefined) row.description = d;
  return row;
}

export async function createProduct(data) {
  const { order: incomingOrder } = data;
  let sortOrder;
  if (incomingOrder !== undefined) {
    sortOrder = incomingOrder;
  } else {
    const rows = await supabase('GET', 'products?select=sort_order&order=sort_order.desc&limit=1');
    sortOrder = rows.length ? rows[0].sort_order + 1 : 0;
  }
  const product = { id: Date.now().toString(36), sort_order: sortOrder, ...toRow(data) };
  const [row] = await supabase('POST', 'products', {
    body: product,
    headers: { 'Prefer': 'return=representation' },
  });
  return toProduct(row || product);
}

export async function updateProduct(id, data) {
  const body = toRow(data);
  const [row] = await supabase('PATCH', `products?id=eq.${id}`, {
    body,
    headers: { 'Prefer': 'return=representation' },
  });
  return row ? toProduct(row) : null;
}

export async function deleteProduct(id) {
  await supabase('DELETE', `products?id=eq.${id}`);
}

export async function reorderProducts(orderedIds) {
  await supabase('PATCH', 'products?id=gte.', { body: { sort_order: -1 } });
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase('PATCH', `products?id=eq.${orderedIds[i]}`, { body: { sort_order: i } });
  }
}

export async function getDecoracion() {
  const rows = await supabase('GET', 'decoracion?id=eq.config&select=*');
  if (!rows || !rows.length) return { hero: '', banner1: '', banner2: '' };
  const { id, ...rest } = rows[0];
  return rest;
}

export async function saveDecoracion(data) {
  await supabase('POST', 'decoracion?on_conflict=id', {
    body: { id: 'config', ...data },
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
  });
  return data;
}
