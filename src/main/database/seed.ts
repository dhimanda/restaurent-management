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
  last_sync_time: ''
}

export function seedDatabase(db: Database.Database): void {
  // Seed categories if empty
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
  }
}
