/**
 * One-time migration script:
 * 1. Uploads local images (Fotos/, decorar/) to Cloudinary
 * 2. Replaces URLs in products.json / decoracion.json
 * 3. Imports all data into MongoDB Atlas
 *
 * Usage: node scripts/migrate.mjs
 *
 * Requires these env vars:
 *   MONGODB_URI, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PARENT = join(ROOT, '..');

const FOTOS_DIR = join(PARENT, 'Fotos');
const DECORAR_DIR = join(PARENT, 'decorar');
const PRODUCTS_FILE = join(ROOT, 'data', 'products.json');
const DECO_FILE = join(ROOT, 'data', 'decoracion.json');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloudinary(localPath, folder) {
  const result = await cloudinary.uploader.upload(localPath, {
    folder: `masss_catalog/${folder}`,
    use_filename: true,
    unique_filename: true,
  });
  return result.secure_url;
}

function walkDir(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isFile() && /\.(jpe?g|png|gif|webp|svg)$/i.test(name)) {
      files.push(full);
    }
  }
  return files;
}

async function migrateImages() {
  console.log('\n── Migrando imágenes a Cloudinary ──\n');

  const fotoFiles = walkDir(FOTOS_DIR);
  const decoFiles = walkDir(DECORAR_DIR);

  console.log(`Encontradas ${fotoFiles.length} imágenes de productos y ${decoFiles.length} de decoración`);

  const urlMap = {};

  // Upload product images
  for (const file of fotoFiles) {
    const name = file.split('/').pop();
    console.log(`  Subiendo ${name}...`);
    const url = await uploadToCloudinary(file, 'products');
    urlMap[`/Fotos/${name}`] = url;
    urlMap[`/fotos/${name}`] = url;
    urlMap[`/fotos/${name.toLowerCase()}`] = url;
    console.log(`    → ${url}`);
  }

  // Upload decoration images
  for (const file of decoFiles) {
    const name = file.split('/').pop();
    console.log(`  Subiendo decoración ${name}...`);
    const url = await uploadToCloudinary(file, 'decoracion');
    urlMap[`/decorar/${name}`] = url;
    console.log(`    → ${url}`);
  }

  return urlMap;
}

async function migrateData(urlMap) {
  console.log('\n── Actualizando datos ──\n');

  // Update products.json URLs
  let products = JSON.parse(readFileSync(PRODUCTS_FILE, 'utf-8'));
  let replacedCount = 0;

  for (const product of products) {
    if (product.images) {
      product.images = product.images.map(img => {
        const mapped = urlMap[img] || urlMap[img.toLowerCase()];
        if (mapped) { replacedCount++; return mapped; }
        return img;
      });
    }
    if (product.image && urlMap[product.image]) {
      product.image = urlMap[product.image];
      replacedCount++;
    }
  }

  writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  console.log(`  Reemplazadas ${replacedCount} URLs de imágenes en products.json`);

  // Update decoracion.json URLs
  let decoracion = JSON.parse(readFileSync(DECO_FILE, 'utf-8'));
  let decoReplaced = 0;
  for (const key of ['hero', 'banner1', 'banner2']) {
    if (decoracion[key] && urlMap[decoracion[key]]) {
      decoracion[key] = urlMap[decoracion[key]];
      decoReplaced++;
    }
  }
  writeFileSync(DECO_FILE, JSON.stringify(decoracion, null, 2));
  console.log(`  Reemplazadas ${decoReplaced} URLs en decoracion.json`);

  return { products, decoracion };
}

async function importToMongoDB(products, decoracion) {
  console.log('\n── Importando a MongoDB ──\n');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('  MONGODB_URI no configurada');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('masss_catalog');
  console.log('  Conectado a MongoDB');

  // Clear and re-insert products
  await db.collection('products').deleteMany({});
  if (products.length) {
    await db.collection('products').insertMany(products);
    console.log(`  Insertados ${products.length} productos`);
  }

  // Upsert decoracion config
  await db.collection('decoracion').updateOne(
    { _id: 'config' },
    { $set: decoracion },
    { upsert: true }
  );
  console.log('  Importada configuración de decoración');

  await client.close();
  console.log('  Conexión cerrada');
}

async function main() {
  try {
    const urlMap = await migrateImages();
    const { products, decoracion } = await migrateData(urlMap);
    await importToMongoDB(products, decoracion);
    console.log('\n✓ Migración completada exitosamente\n');
  } catch (e) {
    console.error('\n✗ Error durante la migración:', e);
    process.exit(1);
  }
}

main();
