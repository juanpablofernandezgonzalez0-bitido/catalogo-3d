const DATA_API_URL = process.env.MONGODB_DATA_API_URL;
const API_KEY = process.env.MONGODB_API_KEY;
const DATA_SOURCE = 'Cluster0';
const DB = 'masss_catalog';

async function api(action, body) {
  const res = await fetch(`${DATA_API_URL}/action/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY,
    },
    body: JSON.stringify({ dataSource: DATA_SOURCE, database: DB, ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Data API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getProducts() {
  const { documents } = await api('find', {
    collection: 'products',
    filter: {},
    sort: { order: 1 },
  });
  return documents;
}

export async function getProduct(id) {
  const { document } = await api('findOne', {
    collection: 'products',
    filter: { id },
  });
  return document;
}

export async function createProduct(data) {
  const products = await getProducts();
  const maxOrder = products.length ? Math.max(...products.map(p => p.order ?? -1)) : -1;
  const product = { id: Date.now().toString(36), order: maxOrder + 1, ...data };
  await api('insertOne', { collection: 'products', document: product });
  return product;
}

export async function updateProduct(id, data) {
  await api('updateOne', {
    collection: 'products',
    filter: { id },
    update: { $set: data },
  });
  const { document } = await api('findOne', {
    collection: 'products',
    filter: { id },
  });
  return document;
}

export async function deleteProduct(id) {
  await api('deleteOne', { collection: 'products', filter: { id } });
}

export async function reorderProducts(orderedIds) {
  await api('updateMany', {
    collection: 'products',
    filter: {},
    update: { $set: { order: -1 } },
  });
  for (let i = 0; i < orderedIds.length; i++) {
    await api('updateOne', {
      collection: 'products',
      filter: { id: orderedIds[i] },
      update: { $set: { order: i } },
    });
  }
}

export async function getDecoracion() {
  const { document } = await api('findOne', {
    collection: 'decoracion',
    filter: { _id: 'config' },
  });
  if (!document) return { hero: '', banner1: '', banner2: '' };
  const { _id, ...rest } = document;
  return rest;
}

export async function saveDecoracion(data) {
  await api('updateOne', {
    collection: 'decoracion',
    filter: { _id: 'config' },
    update: { $set: data },
    upsert: true,
  });
  return data;
}
