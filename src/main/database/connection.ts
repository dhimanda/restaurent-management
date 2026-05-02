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
  order_number TEXT,
  table_no TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','preparing','served','cancelled')),
  payment_method TEXT DEFAULT 'Cash',
  discount_type TEXT CHECK(discount_type IN ('flat','percentage','')),
  discount_value REAL DEFAULT 0,
  subtotal REAL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  notes TEXT,
  responsible_person TEXT DEFAULT '',
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

CREATE TABLE IF NOT EXISTS payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  category TEXT NOT NULL,
  responsible_person TEXT DEFAULT '',
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fund_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('initial_fund','sales','expense')),
  reference_id INTEGER,
  amount REAL NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`

/**
 * Migration: Rebuild orders table to remove the hardcoded CHECK constraint
 * on payment_method. Existing databases from earlier versions have:
 *   CHECK(payment_method IN ('cash','card','mobile','other'))
 * which blocks dynamically-created payment methods.
 */
function migratePaymentMethodConstraint(db: Database.Database): void {
  const tableInfo = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'"
  ).get() as { sql: string } | undefined

  if (!tableInfo) return

  // Only migrate if the old CHECK constraint is present
  const hasOldConstraint = tableInfo.sql.includes("payment_method IN ('cash','card','mobile','other')")
  if (!hasOldConstraint) return

  console.log('Migrating orders table: removing payment_method CHECK constraint')

  db.transaction(() => {
    db.exec(`
      CREATE TABLE orders_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT,
        table_no TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK(status IN ('pending','preparing','served','cancelled')),
        payment_method TEXT DEFAULT 'Cash',
        discount_type TEXT CHECK(discount_type IN ('flat','percentage','')),
        discount_value REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        tax_total REAL DEFAULT 0,
        grand_total REAL DEFAULT 0,
        notes TEXT,
        responsible_person TEXT DEFAULT '',
        order_time TEXT DEFAULT (datetime('now')),
        served_time TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      INSERT INTO orders_new (id, table_no, status, payment_method, discount_type, discount_value, subtotal, tax_total, grand_total, notes, order_time, served_time, created_at)
        SELECT id, table_no, status, payment_method, discount_type, discount_value, subtotal, tax_total, grand_total, notes, order_time, served_time, created_at FROM orders;
      DROP TABLE orders;
      ALTER TABLE orders_new RENAME TO orders;

      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_time ON orders(order_time);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
    `)
  })()
}

/**
 * Migration: Add order_number column if missing and backfill existing orders
 * with date-prefixed format YYMMDD-NNN (daily reset sequence).
 */
function migrateOrderNumber(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[]
  const hasOrderNumber = columns.some(c => c.name === 'order_number')

  if (!hasOrderNumber) {
    console.log('Migrating orders table: adding order_number column')
    db.exec('ALTER TABLE orders ADD COLUMN order_number TEXT')
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)')
  }

  // Backfill any orders that have NULL order_number
  const nullOrders = db.prepare(
    "SELECT id, order_time FROM orders WHERE order_number IS NULL ORDER BY order_time ASC, id ASC"
  ).all() as { id: number; order_time: string }[]

  if (nullOrders.length === 0) return

  console.log('Backfilling order_number for ' + nullOrders.length + ' existing orders')

  const updateStmt = db.prepare('UPDATE orders SET order_number = ? WHERE id = ?')

  db.transaction(() => {
    // Group orders by date to generate per-day sequences
    const dateGroups: Record<string, { id: number; order_time: string }[]> = {}
    for (const order of nullOrders) {
      const dateStr = order.order_time ? order.order_time.substring(0, 10) : ''
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = []
      }
      dateGroups[dateStr].push(order)
    }

    for (const dateStr of Object.keys(dateGroups)) {
      // Count existing orders that already have order_number for this date
      const existingCount = db.prepare(
        "SELECT COUNT(*) as cnt FROM orders WHERE order_number IS NOT NULL AND order_number LIKE ?"
      ).get(formatDatePrefix(dateStr) + '%') as { cnt: number }

      let seq = existingCount.cnt

      for (const order of dateGroups[dateStr]) {
        seq++
        const orderNumber = formatDatePrefix(dateStr) + '-' + String(seq).padStart(3, '0')
        updateStmt.run(orderNumber, order.id)
      }
    }
  })()
}

/**
 * Convert a date string (YYYY-MM-DD...) to YYMMDD prefix.
 */
function formatDatePrefix(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) {
    // Fallback to today
    const now = new Date()
    const yy = String(now.getFullYear()).slice(2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return yy + mm + dd
  }
  const parts = dateStr.substring(0, 10).split('-')
  const yy = parts[0].slice(2)
  return yy + parts[1] + parts[2]
}

/**
 * Migration: Add responsible_person column if missing.
 */
function migrateResponsiblePerson(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[]
  const hasColumn = columns.some(c => c.name === 'responsible_person')

  if (!hasColumn) {
    console.log('Migrating orders table: adding responsible_person column')
    db.exec("ALTER TABLE orders ADD COLUMN responsible_person TEXT DEFAULT ''")
  }
}

/**
 * Migration: Add responsible_person column to expenses table if missing.
 */
function migrateExpenseResponsiblePerson(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(expenses)").all() as { name: string }[]
  const hasColumn = columns.some(c => c.name === 'responsible_person')

  if (!hasColumn) {
    console.log('Migrating expenses table: adding responsible_person column')
    db.exec("ALTER TABLE expenses ADD COLUMN responsible_person TEXT DEFAULT ''")
  }
}

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

  // Migrate: remove CHECK constraint on payment_method for existing databases
  migratePaymentMethodConstraint(db)

  // Migrate: add order_number column and backfill existing orders
  migrateOrderNumber(db)

  // Migrate: add responsible_person column for existing databases (orders)
  migrateResponsiblePerson(db)

  // Migrate: add responsible_person column for expenses table
  migrateExpenseResponsiblePerson(db)

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
