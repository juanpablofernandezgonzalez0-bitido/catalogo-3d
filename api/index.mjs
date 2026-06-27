import express from 'express';
import {
  getProducts, getProduct, createProduct, updateProduct,
  deleteProduct, reorderProducts, getDecoracion, saveDecoracion
} from '../src/db.mjs';

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/api/products', async (req, res) => {
  try {
    const data = await getProducts();
    res.json(data);
  } catch (e) {
    console.error('GET /api/products error:', e);
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
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const p = await updateProduct(req.params.id, req.body);
    if (!p) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const product = await createProduct(req.body);
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await deleteProduct(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/decoracion', async (req, res) => {
  try {
    const data = await getDecoracion();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/decoracion', async (req, res) => {
  try {
    const data = await saveDecoracion(req.body);
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

export default app;
