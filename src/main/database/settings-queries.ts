import Database from 'better-sqlite3'

// ─── Settings key/value ──────────────────────────────────────────────────────

export function getAllSettings(db: Database.Database): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return settings
}

export function getSetting(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row ? row.value : null
}

export function setSetting(db: Database.Database, key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

export function setMultipleSettings(db: Database.Database, settings: Record<string, string>): void {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  const insertMany = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value)
    }
  })
  insertMany()
}

// ─── Payment Methods ─────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: number
  label: string
  sort_order: number
  is_active: number
}

export function getAllPaymentMethods(db: Database.Database): PaymentMethod[] {
  return db.prepare('SELECT * FROM payment_methods ORDER BY sort_order, label').all() as PaymentMethod[]
}

export function createPaymentMethod(db: Database.Database, label: string): PaymentMethod {
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM payment_methods').get() as { m: number }
  const result = db.prepare('INSERT INTO payment_methods (label, sort_order) VALUES (?, ?)').run(label, maxOrder.m + 1)
  return db.prepare('SELECT * FROM payment_methods WHERE id = ?').get(result.lastInsertRowid) as PaymentMethod
}

export function updatePaymentMethod(db: Database.Database, id: number, label: string): void {
  db.prepare('UPDATE payment_methods SET label = ? WHERE id = ?').run(label, id)
}

export function deletePaymentMethod(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM payment_methods WHERE id = ?').run(id)
}

// ─── Expense Categories ───────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: number
  name: string
  sort_order: number
  is_active: number
}

export function getAllExpenseCategories(db: Database.Database): ExpenseCategory[] {
  return db.prepare('SELECT * FROM expense_categories ORDER BY sort_order, name').all() as ExpenseCategory[]
}

export function createExpenseCategory(db: Database.Database, name: string): ExpenseCategory {
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM expense_categories').get() as { m: number }
  const result = db.prepare('INSERT INTO expense_categories (name, sort_order) VALUES (?, ?)').run(name, maxOrder.m + 1)
  return db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(result.lastInsertRowid) as ExpenseCategory
}

export function updateExpenseCategory(db: Database.Database, id: number, name: string): void {
  db.prepare('UPDATE expense_categories SET name = ? WHERE id = ?').run(name, id)
}

export function deleteExpenseCategory(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id)
}
