import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabase(method, path, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 204 || res.status === 201) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY en el entorno');
    process.exit(1);
  }

  // Read products
  const products = JSON.parse(readFileSync(join(ROOT, 'data', 'products.json'), 'utf-8'));
  console.log(`Productos a migrar: ${products.length}`);

  // Delete existing products (match all with id >= empty string)
  await supabase('DELETE', 'products?id=gte.');
  console.log('Productos existentes eliminados');

  // Insert products one by one (avoid bulk insert issues)
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const row = {
      id: p.id,
      sort_order: p.order ?? 0,
      name: p.name,
      category: p.category ?? '',
      description: p.desc ?? '',
      images: p.images ?? [],
      prices: p.prices ?? [],
    };
    await supabase('POST', 'products', row);
    console.log(`  Insertado ${i + 1}/${products.length}: ${p.name}`);
  }

  // Read decoracion
  const decoracion = JSON.parse(readFileSync(join(ROOT, 'data', 'decoracion.json'), 'utf-8'));
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/decoracion?on_conflict=id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id: 'config', ...decoracion }),
  });
  if (!upsertRes.ok) {
    const text = await upsertRes.text();
    throw new Error(`Error al migrar decoración: ${text.slice(0, 200)}`);
  }
  console.log('Decoración migrada');

  console.log('\n✓ Migración completada');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
