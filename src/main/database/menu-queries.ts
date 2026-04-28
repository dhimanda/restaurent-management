import Database from 'better-sqlite3'

export interface MenuItemInput {
  category_id: number
  name: string
  price: number
  cost_price?: number
  description?: string
  image_path?: string
  availability?: number
  tags?: string
  tax_rate?: number
  preparation_time?: number
  sku?: string
}

export function getAllMenuItems(db: Database.Database) {
  return db.prepare(`
    SELECT mi.*, c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    ORDER BY c.sort_order, mi.name
  `).all()
}

export function getMenuItemsByCategory(db: Database.Database, categoryId: number) {
  return db.prepare(`
    SELECT mi.*, c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    WHERE mi.category_id = ?
    ORDER BY mi.name
  `).all(categoryId)
}

export function getAvailableMenuItems(db: Database.Database) {
  return db.prepare(`
    SELECT mi.*, c.name as category_name
    FROM menu_items mi
    LEFT JOIN categories c ON mi.category_id = c.id
    WHERE mi.availability = 1
    ORDER BY c.sort_order, mi.name
  `).all()
}

export function createMenuItem(db: Database.Database, item: MenuItemInput) {
  const stmt = db.prepare(`
    INSERT INTO menu_items (category_id, name, price, cost_price, description, image_path, availability, tags, tax_rate, preparation_time, sku)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    item.category_id,
    item.name,
    item.price,
    item.cost_price || null,
    item.description || null,
    item.image_path || null,
    item.availability !== undefined ? item.availability : 1,
    item.tags || null,
    item.tax_rate || null,
    item.preparation_time || null,
    item.sku || null
  )
  return { id: result.lastInsertRowid, ...item }
}

export function updateMenuItem(db: Database.Database, id: number, item: Partial<MenuItemInput>) {
  const fields: string[] = []
  const values: unknown[] = []

  if (item.category_id !== undefined) { fields.push('category_id = ?'); values.push(item.category_id) }
  if (item.name !== undefined) { fields.push('name = ?'); values.push(item.name) }
  if (item.price !== undefined) { fields.push('price = ?'); values.push(item.price) }
  if (item.cost_price !== undefined) { fields.push('cost_price = ?'); values.push(item.cost_price) }
  if (item.description !== undefined) { fields.push('description = ?'); values.push(item.description) }
  if (item.image_path !== undefined) { fields.push('image_path = ?'); values.push(item.image_path) }
  if (item.availability !== undefined) { fields.push('availability = ?'); values.push(item.availability) }
  if (item.tags !== undefined) { fields.push('tags = ?'); values.push(item.tags) }
  if (item.tax_rate !== undefined) { fields.push('tax_rate = ?'); values.push(item.tax_rate) }
  if (item.preparation_time !== undefined) { fields.push('preparation_time = ?'); values.push(item.preparation_time) }
  if (item.sku !== undefined) { fields.push('sku = ?'); values.push(item.sku) }

  fields.push("updated_at = datetime('now')")
  values.push(id)

  const sql = `UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`
  return db.prepare(sql).run(...values)
}

export function deleteMenuItem(db: Database.Database, id: number) {
  return db.prepare('DELETE FROM menu_items WHERE id = ?').run(id)
}

export function toggleMenuItemAvailability(db: Database.Database, id: number) {
  return db.prepare(`
    UPDATE menu_items
    SET availability = CASE WHEN availability = 1 THEN 0 ELSE 1 END,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(id)
}

export function getAllCategories(db: Database.Database) {
  return db.prepare('SELECT * FROM categories ORDER BY sort_order').all()
}

export function createCategory(db: Database.Database, name: string) {
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM categories').get() as { next_order: number }
  const result = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(name, maxOrder.next_order)
  return { id: result.lastInsertRowid, name, sort_order: maxOrder.next_order }
}
