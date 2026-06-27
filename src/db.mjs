import { MongoClient } from 'mongodb';

let client;
let _db;

function buildUri(raw) {
  // MongoDB Atlas SRV DNS resolution may fail on some serverless environments.
  // Fall back to explicit host list if the URI uses mongodb+srv protocol.
  if (raw && raw.startsWith('mongodb+srv://')) {
    const match = raw.match(/^mongodb\+srv:\/\/(.+?@)?(.+?)(\/.*)?$/);
    if (match) {
      const creds = match[1] || '';
      const host = match[2].split('?')[0].split('.')[0]; // cluster name
      const rest = match[3] || '';
      const params = rest.includes('?') ? rest.split('?')[1] : '';
      const query = params ? params.split('&').filter(p => !p.startsWith('appName=')).join('&') : '';
      // Use mongodb:// with srv resolved hosts
      return `mongodb://${creds}ac-vvt5wfh-shard-00-00.wprhzb7.mongodb.net:27017,ac-vvt5wfh-shard-00-01.wprhzb7.mongodb.net:27017,ac-vvt5wfh-shard-00-02.wprhzb7.mongodb.net:27017/masss_catalog?ssl=true&replicaSet=atlas-n208to-shard-0&authSource=admin&${query}&retryWrites=true&w=majority`;
    }
  }
  return raw;
}

async function connect() {
  if (_db) return _db;
  const uri = buildUri(process.env.MONGODB_URI || '');
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 30000,
    maxPoolSize: 1,
  });
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
