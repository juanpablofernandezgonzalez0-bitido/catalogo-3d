import app from './api/index.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PARENT = dirname(__dirname);

app.use('/Fotos', express.static(join(PARENT, 'Fotos')));
app.use('/fotos', express.static(join(PARENT, 'Fotos')));
app.use('/decorar', express.static(join(PARENT, 'decorar')));
app.use(express.static(join(__dirname, 'dist')));

app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'admin.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor local: http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
