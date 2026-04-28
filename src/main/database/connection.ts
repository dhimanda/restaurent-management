import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { seedDatabase } from './seed'

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  cost_price REAL,
  description TEXT,
  image_path TEXT,
  availability INTEGER DEFAULT 1,
  tags TEXT,
  tax_rate REAL,
  preparation_time INTEGER,
  sku TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_menu_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_availability ON menu_items(availability);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_no TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','preparing','served','cancelled')),
  payment_method TEXT DEFAULT 'cash'
    CHECK(payment_method IN ('cash','card','mobile','other')),
  discount_type TEXT CHECK(discount_type IN ('flat','percentage','')),
  discount_value REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  order_time TEXT DEFAULT (datetime('now')),
  served_time TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_time ON orders(order_time);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  menu_item_id INTEGER,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`

let dbInstance: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance
  }

  const dbPath = join(app.getPath('userData'), 'restaurant.db')
  console.log('Database path:', dbPath)

  const db = new Database(dbPath)

  // Enable WAL mode for crash safety and better performance
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run schema
  db.exec(SCHEMA_SQL)

  // Seed default data
  seedDatabase(db)

  dbInstance = db

  return db
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return dbInstance
}
