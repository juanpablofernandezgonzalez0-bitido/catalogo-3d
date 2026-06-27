import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;
let _db;

async function connect() {
  if (_db) return _db;
  client = new MongoClient(uri);
  await client.connect();
  _db = client.db('masss_catalog');
  return _db;
}

export async function getProducts() {
  const db = await connect();
  return db.collection('products').find().sort({ order: 1 }).toArray();
}

export async function getProduct(id) {
  const db = await connect();
  return db.collection('products').findOne({ id });
}

export async function createProduct(data) {
  const db = await connect();
  const maxOrder = await db.collection('products')
    .find().sort({ order: -1 }).limit(1).toArray()
    .then(r => r.length ? r[0].order : -1);
  const product = { id: Date.now().toString(36), order: maxOrder + 1, ...data };
  await db.collection('products').insertOne(product);
  return product;
}

export async function updateProduct(id, data) {
  const db = await connect();
  const result = await db.collection('products').findOneAndUpdate(
    { id },
    { $set: data },
    { returnDocument: 'after' }
  );
  return result;
}

export async function deleteProduct(id) {
  const db = await connect();
  await db.collection('products').deleteOne({ id });
}

export async function reorderProducts(orderedIds) {
  const db = await connect();
  const bulk = db.collection('products').initializeUnorderedBulkOp();
  orderedIds.forEach((id, i) => {
    bulk.find({ id }).updateOne({ $set: { order: i } });
  });
  await bulk.execute();
}

export async function getDecoracion() {
  const db = await connect();
  const doc = await db.collection('decoracion').findOne({ _id: 'config' });
  if (!doc) return { hero: '', banner1: '', banner2: '' };
  const { _id, ...rest } = doc;
  return rest;
}

export async function saveDecoracion(data) {
  const db = await connect();
  await db.collection('decoracion').updateOne(
    { _id: 'config' },
    { $set: data },
    { upsert: true }
  );
  return data;
}
