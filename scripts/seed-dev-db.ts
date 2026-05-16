#!/usr/bin/env tsx
// ============================================================
// Seed script — popula SQLite local com dados de exemplo
// Uso: pnpm db:seed
// ============================================================

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { createHash } from 'crypto';

const DB_PATH = process.env.DATABASE_URL || './data/pedi-ai.db';

mkdirSync('./data', { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const _db = drizzle(sqlite);

// ── Schema (importa do schema) ─────────────────────────────
// Copiamos o schema inline para evitar problemas de path resolution

// ── CREATE TABLES ─────────────────────────────────────────

sqlite.exec(`
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  settings TEXT,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  number INTEGER NOT NULL,
  qr_code TEXT,
  name TEXT,
  capacity INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price REAL NOT NULL,
  dietary_labels TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS modifier_groups (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 0,
  min_selections INTEGER NOT NULL DEFAULT 0,
  max_selections INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS modifier_values (
  id TEXT PRIMARY KEY,
  modifier_group_id TEXT NOT NULL REFERENCES modifier_groups(id),
  name TEXT NOT NULL,
  price_adjustment REAL NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS combos (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL,
  description TEXT,
  bundle_price REAL NOT NULL,
  image_url TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS combo_items (
  id TEXT PRIMARY KEY,
  combo_id TEXT NOT NULL REFERENCES combos(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  table_id TEXT,
  customer_id TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  subtotal REAL NOT NULL,
  tax REAL NOT NULL,
  total REAL NOT NULL,
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  combo_id TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  status TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payment_intents (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL,
  mercado_pago_payment_id TEXT,
  qr_code TEXT,
  qr_code_base64 TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  status TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  trial_started_at TEXT NOT NULL,
  trial_ends_at TEXT NOT NULL,
  trial_days INTEGER NOT NULL,
  subscription_started_at TEXT,
  subscription_ends_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1
);
`);

console.log('✓ Tabelas criadas');

// ── Helper para gerar UUIDs ────────────────────────────────

function uuid(): string {
  return crypto.randomUUID();
}

const now = new Date().toISOString();

// ── SEED DATA ─────────────────────────────────────────────

console.log('Iniciando seed...');

// Restaurante 1: Pizzaria do Bairro
const r1 = { id: uuid(), name: 'Pizzaria do Bairro', description: 'As melhores pizzas da região', address: 'Rua das Pizzarias, 123', phone: '(11) 99999-0001', logo_url: null, settings: null, created_at: now, updated_at: now };
sqlite.prepare(`INSERT OR REPLACE INTO restaurants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(r1.id, r1.name, r1.description, r1.address, r1.phone, r1.logo_url, r1.settings, r1.created_at, r1.updated_at);

// Restaurante 2: Burger House
const r2 = { id: uuid(), name: 'Burger House', description: 'Hambúrgartesanos premium', address: 'Av. dos Burgers, 456', phone: '(11) 99999-0002', logo_url: null, settings: null, created_at: now, updated_at: now };
sqlite.prepare(`INSERT OR REPLACE INTO restaurants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(r2.id, r2.name, r2.description, r2.address, r2.phone, r2.logo_url, r2.settings, r2.created_at, r2.updated_at);

console.log(`✓ ${r1.name} e ${r2.name} criados`);

// Mesas para Pizzaria
for (let i = 1; i <= 5; i++) {
  const tableId = uuid();
  const qrData = `pedi-ai:${r1.id}:table:${tableId}`;
  sqlite.prepare(`INSERT OR REPLACE INTO tables VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    tableId, r1.id, i, qrData, `Mesa ${i}`, 4, 1, null, now, now
  );
}

// Mesas para Burger House
for (let i = 1; i <= 4; i++) {
  const tableId = uuid();
  const qrData = `pedi-ai:${r2.id}:table:${tableId}`;
  sqlite.prepare(`INSERT OR REPLACE INTO tables VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    tableId, r2.id, i, qrData, `Mesa ${i}`, 4, 1, null, now, now
  );
}
console.log('✓ Mesas criadas (5 para Pizzaria, 4 para Burger House)');

// ── Categorias e Produtos da Pizzaria ────────────────────

const cat1 = { id: uuid(), restaurant_id: r1.id, name: 'Pizzas Tradicionais', description: 'Nossas receitas clássicas', image_url: null, sort_order: 1, active: 1, created_at: now, updated_at: now };
const cat2 = { id: uuid(), restaurant_id: r1.id, name: 'Pizzas Especiais', description: 'Receitas exclusivas', image_url: null, sort_order: 2, active: 1, created_at: now, updated_at: now };
const cat3 = { id: uuid(), restaurant_id: r1.id, name: 'Bebidas', description: 'Refrigerantes e sucos', image_url: null, sort_order: 3, active: 1, created_at: now, updated_at: now };
const cat4 = { id: uuid(), restaurant_id: r1.id, name: 'Sobremesas', description: 'Doces para fechar com chave de ouro', image_url: null, sort_order: 4, active: 1, created_at: now, updated_at: now };

for (const cat of [cat1, cat2, cat3, cat4]) {
  sqlite.prepare(`INSERT OR REPLACE INTO categories VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    cat.id, cat.restaurant_id, cat.name, cat.description, cat.image_url, cat.sort_order, cat.active, null, cat.created_at, cat.updated_at
  );
}

const pizzasT = [
  { name: 'Margherita', description: 'Molho de tomate, mussarela, manjericão', price: 42.90 },
  { name: 'Pepperoni', description: 'Molho de tomate, mussarela, pepperoni', price: 45.90 },
  { name: 'Quatro Queijos', description: 'Mussarela, gorgonzola, provolone, parmesão', price: 47.90 },
  { name: 'Frango com Catupiry', description: 'Frango desfiado, catupiry, mussarela', price: 44.90 },
  { name: 'Napolitana', description: 'Molho de tomate, mussarela, parmesão, anchovas', price: 46.90 },
];

const pizzasE = [
  { name: 'Pedi-AI Especial', description: 'Molho de tomate, mussarela, bacon, cebola caramelizada', price: 52.90 },
  { name: 'Calabresa Acebolada', description: 'Calabresa defumada, cebola, mussarela', price: 43.90 },
  { name: 'Chocolate com Morango', description: 'Chocolate meio amargo, morango fresco, leite condensado', price: 49.90 },
];

const bebidas = [
  { name: 'Refrigerante Lata 350ml', description: 'Coca-Cola, Guaraná ou Sprite', price: 6.90 },
  { name: 'Suco Natural 500ml', description: 'Laranja, limão ou maracujá', price: 12.90 },
  { name: 'Água Mineral 500ml', description: 'Com ou sem gás', price: 5.90 },
];

const sobremesas = [
  { name: 'Petit Gateau', description: 'Bolinho de chocolate com sorvete de creme', price: 22.90 },
  { name: 'Brownie', description: 'Com sorvete de creme e calda de chocolate', price: 18.90 },
  { name: 'Torta Holandesa', description: 'Fatia generosa', price: 16.90 },
];

const allProducts: Array<{ id: string; catId: string; name: string; desc: string; price: number }> = [];
let sortOrder = 1;

for (const p of pizzasT) {
  const pid = uuid();
  sqlite.prepare(`INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    pid, cat1.id, p.name, p.description, null, p.price, null, 1, sortOrder++, now, now
  );
  allProducts.push({ id: pid, catId: cat1.id, name: p.name, desc: p.description, price: p.price });
}
for (const p of pizzasE) {
  const pid = uuid();
  sqlite.prepare(`INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    pid, cat2.id, p.name, p.description, null, p.price, null, 1, sortOrder++, now, now
  );
  allProducts.push({ id: pid, catId: cat2.id, name: p.name, desc: p.description, price: p.price });
}
for (const p of bebidas) {
  const pid = uuid();
  sqlite.prepare(`INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    pid, cat3.id, p.name, p.description, null, p.price, null, 1, sortOrder++, now, now
  );
  allProducts.push({ id: pid, catId: cat3.id, name: p.name, desc: p.description, price: p.price });
}
for (const p of sobremesas) {
  const pid = uuid();
  sqlite.prepare(`INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    pid, cat4.id, p.name, p.description, null, p.price, null, 1, sortOrder++, now, now
  );
  allProducts.push({ id: pid, catId: cat4.id, name: p.name, desc: p.description, price: p.price });
}

console.log(`✓ ${allProducts.length} produtos criados`);

// Modificador: Borda
const mg1 = { id: uuid(), restaurant_id: r1.id, name: 'Borda', required: 0, min_selections: 0, max_selections: 1, created_at: now };
sqlite.prepare(`INSERT OR REPLACE INTO modifier_groups VALUES (?, ?, ?, ?, ?, ?, ?)`).run(mg1.id, mg1.restaurant_id, mg1.name, mg1.required, mg1.min_selections, mg1.max_selections, mg1.created_at);

const modsBorda = [
  { name: 'Sem borda', price_adjustment: 0 },
  { name: 'Borda de catupiry', price_adjustment: 8.00 },
  { name: 'Borda de chocolate', price_adjustment: 10.00 },
  { name: 'Borda de cheddar', price_adjustment: 8.00 },
];
for (const m of modsBorda) {
  sqlite.prepare(`INSERT OR REPLACE INTO modifier_values VALUES (?, ?, ?, ?, ?, ?)`).run(uuid(), mg1.id, m.name, m.price_adjustment, 1, now);
}

// Modificador: Tamanho
const mg2 = { id: uuid(), restaurant_id: r1.id, name: 'Tamanho', required: 1, min_selections: 1, max_selections: 1, created_at: now };
sqlite.prepare(`INSERT OR REPLACE INTO modifier_groups VALUES (?, ?, ?, ?, ?, ?, ?)`).run(mg2.id, mg2.restaurant_id, mg2.name, mg2.required, mg2.min_selections, mg2.max_selections, mg2.created_at);

const modsTamanho = [
  { name: 'Pequena (6 fatias)', price_adjustment: 0 },
  { name: 'Média (8 fatias)', price_adjustment: 10.00 },
  { name: 'Grande (12 fatias)', price_adjustment: 18.00 },
];
for (const m of modsTamanho) {
  sqlite.prepare(`INSERT OR REPLACE INTO modifier_values VALUES (?, ?, ?, ?, ?, ?)`).run(uuid(), mg2.id, m.name, m.price_adjustment, 1, now);
}

console.log('✓ Modificadores criados');

// Combos para Burger House
const catBurger = { id: uuid(), restaurant_id: r2.id, name: 'Burgers', description: null, image_url: null, sort_order: 1, active: 1, created_at: now, updated_at: now };
const catBatata = { id: uuid(), restaurant_id: r2.id, name: 'Acompanhamentos', description: null, image_url: null, sort_order: 2, active: 1, created_at: now, updated_at: now };

for (const cat of [catBurger, catBatata]) {
  sqlite.prepare(`INSERT OR REPLACE INTO categories VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    cat.id, cat.restaurant_id, cat.name, cat.description, cat.image_url, cat.sort_order, cat.active, null, cat.created_at, cat.updated_at
  );
}

const burgers = [
  { name: 'Classic Burger', description: '180g de blend bovino, queijo cheddar, alface, tomate', price: 32.90 },
  { name: 'Bacon Burger', description: '180g, bacon crocante, cheddar, molho barbecue', price: 37.90 },
  { name: 'Cheese Burger Duplo', description: '2x 90g, queijo mussarela, picles, mostarda', price: 39.90 },
  { name: 'Veggie Burger', description: 'Hambúrguer de grão-de-bico, rúcula, tomate seco', price: 34.90 },
];
for (const b of burgers) {
  sqlite.prepare(`INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uuid(), catBurger.id, b.name, b.description, null, b.price, null, 1, 1, now, now
  );
}

const bats = [
  { name: 'Batata Frita Média', description: 'Batatas fritas sequinhas e crocantes', price: 16.90 },
  { name: 'Batata com Cheddar', description: 'Porção média com cheddar derretido', price: 22.90 },
  { name: 'Onion Rings', description: 'Anéis de cebola empanados (8 unidades)', price: 19.90 },
];
for (const b of bats) {
  sqlite.prepare(`INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uuid(), catBatata.id, b.name, b.description, null, b.price, null, 1, 1, now, now
  );
}

console.log('✓ Produtos do Burger House criados');

// ── Usuários de teste ────────────────────────────────────

function hashPassword(password: string): string {
  return createHash('sha256').update(password + 'dev-secret-change-in-production').digest('hex');
}

// Admin para Pizzaria
const adminHash = hashPassword('admin123');
sqlite.prepare(`INSERT OR REPLACE INTO users_profiles VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
  uuid(), uuid(), r1.id, 'dono', 'Admin Pizzaria', 'admin@pizzaria.com', now
);
// A senha fica no hash — buscável pelo email para signInWithPassword
// Para dev, criamos uma tabela auxiliar de credenciais
sqlite.prepare(`
  CREATE TABLE IF NOT EXISTS dev_credentials (
    email TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    user_id TEXT NOT NULL
  )
`).run();
sqlite.prepare(`INSERT OR REPLACE INTO dev_credentials VALUES (?, ?, ?)`).run(
  'admin@pizzaria.com', adminHash, 'dev-user-001'
);

// Admin para Burger House
sqlite.prepare(`INSERT OR REPLACE INTO users_profiles VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
  uuid(), uuid(), r2.id, 'dono', 'Admin Burger', 'admin@burger.com', now
);
sqlite.prepare(`INSERT OR REPLACE INTO dev_credentials VALUES (?, ?, ?)`).run(
  'admin@burger.com', adminHash, 'dev-user-002'
);

// Cliente genérico
sqlite.prepare(`INSERT OR REPLACE INTO dev_credentials VALUES (?, ?, ?)`).run(
  'cliente@teste.com', adminHash, 'dev-user-003'
);

console.log('✓ Usuários de teste criados:');
console.log('  admin@pizzaria.com / admin123');
console.log('  admin@burger.com / admin123');
console.log('  cliente@teste.com / admin123');

// ── Subscription de trial ─────────────────────────────────

const sub1 = {
  id: uuid(),
  restaurant_id: r1.id,
  status: 'trialing',
  plan_type: 'profissional',
  price_cents: 4900,
  currency: 'BRL',
  trial_started_at: now,
  trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  trial_days: 14,
  subscription_started_at: null,
  subscription_ends_at: null,
  cancelled_at: null,
  created_at: now,
  updated_at: now,
  version: 1,
};

sqlite.prepare(`INSERT OR REPLACE INTO subscriptions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  sub1.id, sub1.restaurant_id, sub1.status, sub1.plan_type, sub1.price_cents, sub1.currency,
  sub1.trial_started_at, sub1.trial_ends_at, sub1.trial_days, sub1.subscription_started_at,
  sub1.subscription_ends_at, sub1.cancelled_at, sub1.created_at, sub1.updated_at, sub1.version
);

console.log('✓ Subscription de trial criada');

// ── Resumo ───────────────────────────────────────────────

console.log('\n══════════════════════════════════════');
console.log('Seed completo!');
console.log(`Banco: ${DB_PATH}`);
console.log('\nCredenciais de acesso:');
console.log('  email: admin@pizzaria.com');
console.log('  senha: admin123');
console.log('══════════════════════════════════════\n');

sqlite.close();
