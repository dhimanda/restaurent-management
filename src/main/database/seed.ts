import Database from 'better-sqlite3'

const DEFAULT_CATEGORIES = [
  { name: 'Appetizer', sort_order: 1 },
  { name: 'Main Course', sort_order: 2 },
  { name: 'Beverage', sort_order: 3 },
  { name: 'Dessert', sort_order: 4 },
  { name: 'Special', sort_order: 5 }
]

const DEFAULT_SETTINGS: Record<string, string> = {
  restaurant_name: 'My Restaurant',
  restaurant_address: '123 Main Street',
  restaurant_phone: '+1 (555) 000-0000',
  restaurant_logo: '',
  currency_symbol: '$',
  locale: 'en-US',
  tax_rate: '5',
  receipt_format: 'a4',
  google_drive_connected: 'false',
  last_sync_time: '',
  theme: 'dark',
  initial_fund: '0'
}

const DEFAULT_PAYMENT_METHODS = [
  { label: 'Cash', sort_order: 1 },
  { label: 'Card', sort_order: 2 },
  { label: 'Mobile Banking', sort_order: 3 },
  { label: 'Other', sort_order: 4 }
]

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Raw Materials', sort_order: 1 },
  { name: 'Utilities', sort_order: 2 },
  { name: 'Assets & Equipment', sort_order: 3 },
  { name: 'Salaries', sort_order: 4 },
  { name: 'Maintenance', sort_order: 5 },
  { name: 'Other', sort_order: 6 }
]

export function seedDatabase(db: Database.Database): void {
  // Seed menu categories if empty
  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (categoryCount.count === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)')
    const insertMany = db.transaction(() => {
      for (const cat of DEFAULT_CATEGORIES) {
        insertCategory.run(cat.name, cat.sort_order)
      }
    })
    insertMany()
  }

  // Seed settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number }
  if (settingsCount.count === 0) {
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    const insertMany = db.transaction(() => {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        insertSetting.run(key, value)
      }
    })
    insertMany()
  } else {
    // Ensure new keys are added to existing databases
    const insertOrIgnore = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    insertOrIgnore.run('theme', 'dark')
    insertOrIgnore.run('initial_fund', '0')
  }

  // Seed payment methods if empty
  const pmCount = db.prepare('SELECT COUNT(*) as count FROM payment_methods').get() as { count: number }
  if (pmCount.count === 0) {
    const insertPm = db.prepare('INSERT INTO payment_methods (label, sort_order) VALUES (?, ?)')
    const insertMany = db.transaction(() => {
      for (const pm of DEFAULT_PAYMENT_METHODS) {
        insertPm.run(pm.label, pm.sort_order)
      }
    })
    insertMany()
  }

  // Seed expense categories if empty
  const ecCount = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get() as { count: number }
  if (ecCount.count === 0) {
    const insertEc = db.prepare('INSERT INTO expense_categories (name, sort_order) VALUES (?, ?)')
    const insertMany = db.transaction(() => {
      for (const ec of DEFAULT_EXPENSE_CATEGORIES) {
        insertEc.run(ec.name, ec.sort_order)
      }
    })
    insertMany()
  }
}
