import Database from 'better-sqlite3'
import { addFundTransaction } from './fund-queries'

export interface OrderItemInput {
  menu_item_id: number
  name: string
  qty: number
  unit_price: number
  notes?: string
}

export interface OrderInput {
  table_no?: string
  payment_method?: string
  discount_type?: string
  discount_value?: number
  notes?: string
  items: OrderItemInput[]
}

export function createOrder(db: Database.Database, order: OrderInput) {
  const defaultTaxRate = db.prepare("SELECT value FROM settings WHERE key = 'tax_rate'").get() as { value: string } | undefined
  const taxRate = defaultTaxRate ? parseFloat(defaultTaxRate.value) : 5

  // Calculate subtotal
  let subtotal = 0
  for (const item of order.items) {
    subtotal += item.qty * item.unit_price
  }

  // Calculate discount
  let discountAmount = 0
  if (order.discount_value && order.discount_value > 0) {
    if (order.discount_type === 'percentage') {
      discountAmount = subtotal * (order.discount_value / 100)
    } else {
      discountAmount = order.discount_value
    }
  }

  const afterDiscount = subtotal - discountAmount
  const taxTotal = afterDiscount * (taxRate / 100)
  const grandTotal = afterDiscount + taxTotal

  const insertOrder = db.prepare(`
    INSERT INTO orders (table_no, status, payment_method, discount_type, discount_value, subtotal, tax_total, grand_total, notes)
    VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, name, qty, unit_price, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const result = db.transaction(() => {
    const orderResult = insertOrder.run(
      order.table_no || '',
      order.payment_method || 'cash',
      order.discount_type || '',
      order.discount_value || 0,
      Math.round(subtotal * 100) / 100,
      Math.round(taxTotal * 100) / 100,
      Math.round(grandTotal * 100) / 100,
      order.notes || ''
    )

    const orderId = orderResult.lastInsertRowid

    for (const item of order.items) {
      insertItem.run(
        orderId,
        item.menu_item_id,
        item.name,
        item.qty,
        item.unit_price,
        item.notes || ''
      )
    }

    return orderId
  })()

  return { id: result, subtotal, tax_total: taxTotal, grand_total: grandTotal }
}

export function getActiveOrders(db: Database.Database) {
  const orders = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
      (SELECT SUM(qty) FROM order_items oi WHERE oi.order_id = o.id) as total_items
    FROM orders o
    WHERE o.status IN ('pending', 'preparing')
    ORDER BY o.order_time ASC
  `).all()
  return orders
}

export function getAllOrders(db: Database.Database, filters?: { status?: string; from?: string; to?: string }) {
  let sql = `
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
      (SELECT SUM(qty) FROM order_items oi WHERE oi.order_id = o.id) as total_items
    FROM orders o
    WHERE 1=1
  `
  const params: unknown[] = []

  if (filters && filters.status) {
    sql += ' AND o.status = ?'
    params.push(filters.status)
  }
  if (filters && filters.from) {
    sql += ' AND o.order_time >= ?'
    params.push(filters.from)
  }
  if (filters && filters.to) {
    sql += ' AND o.order_time <= ?'
    params.push(filters.to)
  }

  sql += ' ORDER BY o.order_time DESC'

  return db.prepare(sql).all(...params)
}

export function getOrderById(db: Database.Database, id: number) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
  if (!order) return null

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id)
  return { ...order, items }
}

export function updateOrderStatus(db: Database.Database, id: number, status: string) {
  let sql = 'UPDATE orders SET status = ?'
  const params: unknown[] = [status]

  if (status === 'served') {
    sql += ", served_time = datetime('now')"
  }

  sql += ' WHERE id = ?'
  params.push(id)

  const result = db.prepare(sql).run(...params)

  // Credit fund balance when order is served
  if (status === 'served') {
    const order = db.prepare('SELECT grand_total FROM orders WHERE id = ?').get(id) as { grand_total: number } | undefined
    if (order) {
      addFundTransaction(db, 'sales', order.grand_total, id, 'Order #' + id + ' payment')
    }
  }

  return result
}

export function cancelOrder(db: Database.Database, id: number) {
  return db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id)
}
