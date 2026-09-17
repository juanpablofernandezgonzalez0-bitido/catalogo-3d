import express from 'express';
import {
  getProducts, getProduct, createProduct, updateProduct,
  deleteProduct, reorderProducts, getDecoracion, saveDecoracion,
  getVideos, saveVideos
} from '../src/db.mjs';

const app = express();
app.use(express.json({ limit: '10mb' }));

const cache = new Map();
const TTL = 30000;
function cached(key, fn) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL) return hit.val;
  return fn().then(val => { cache.set(key, { val, ts: Date.now() }); return val; });
}
function invalidate(pattern) {
  for (const k of cache.keys()) { if (k.startsWith(pattern)) cache.delete(k); }
}

app.use((req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) res.status(504).json({ error: 'Timeout' });
  }, 8500);
  res.on('close', () => clearTimeout(timeout));
  next();
});

app.get('/api/products', async (req, res) => {
  try {
    const data = await cached('products', getProducts);
    res.set('Cache-Control', 'public, max-age=30');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const p = await getProduct(req.params.id);
    if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/products/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds required' });
    await reorderProducts(orderedIds);
    invalidate('products');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const p = await updateProduct(req.params.id, req.body);
    if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
    invalidate('products');
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = await createProduct(req.body);
    invalidate('products');
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await deleteProduct(req.params.id);
    invalidate('products');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/decoracion', async (req, res) => {
  try {
    const data = await cached('decoracion', getDecoracion);
    res.set('Cache-Control', 'public, max-age=30');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/decoracion', async (req, res) => {
  try {
    const data = await saveDecoracion(req.body);
    invalidate('decoracion');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/videos', async (req, res) => {
  try {
    const data = await cached('videos', getVideos);
    res.set('Cache-Control', 'public, max-age=30');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/videos', async (req, res) => {
  try {
    const data = await saveVideos(req.body);
    invalidate('videos');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/config', (req, res) => {
  res.json({
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || '',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const { getProducts } = await import('../src/db.mjs');
    const start = Date.now();
    const products = await getProducts();
    res.json({ status: 'ok', latency: Date.now() - start, products: products.length });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

export default app;
