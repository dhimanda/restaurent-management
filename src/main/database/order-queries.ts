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
  responsible_person?: string
  items: OrderItemInput[]
}

/**
 * Round to 2 decimal places using banker-safe rounding.
 * Prevents floating-point drift in financial calculations.
 */
function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Generate a date-prefixed order number in YYMMDD-NNN format.
 * The sequence resets daily — each day starts from 001.
 */
function generateOrderNumber(db: Database.Database): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const datePrefix = yy + mm + dd

  // Count orders already placed today
  const todayDate = now.getFullYear() + '-' + mm + '-' + dd
  const existing = db.prepare(
    "SELECT COUNT(*) as cnt FROM orders WHERE DATE(order_time) = ?"
  ).get(todayDate) as { cnt: number }

  const seq = existing.cnt + 1
  return datePrefix + '-' + String(seq).padStart(3, '0')
}

/**
 * Valid status transitions (from → to).
 * Prevents invalid state changes at the database level.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['preparing', 'served', 'cancelled'],
  preparing: ['served', 'cancelled'],
  served: [],
  cancelled: []
}

export function createOrder(db: Database.Database, order: OrderInput) {
  const defaultTaxRate = db.prepare("SELECT value FROM settings WHERE key = 'tax_rate'").get() as { value: string } | undefined
  const taxRate = defaultTaxRate ? parseFloat(defaultTaxRate.value) : 5

  // Calculate subtotal
  let subtotal = 0
  for (const item of order.items) {
    subtotal += item.qty * item.unit_price
  }
  subtotal = roundMoney(subtotal)

  // Calculate discount with validation
  let discountAmount = 0
  if (order.discount_value && order.discount_value > 0) {
    if (order.discount_type === 'percentage') {
      const clampedPercent = Math.min(order.discount_value, 100)
      discountAmount = roundMoney(subtotal * (clampedPercent / 100))
    } else {
      discountAmount = roundMoney(Math.min(order.discount_value, subtotal))
    }
  }

  const afterDiscount = roundMoney(subtotal - discountAmount)
  const taxTotal = roundMoney(afterDiscount * (taxRate / 100))
  const grandTotal = roundMoney(afterDiscount + taxTotal)

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_number, table_no, status, payment_method, discount_type, discount_value, subtotal, tax_total, grand_total, notes, responsible_person)
    VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, name, qty, unit_price, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const result = db.transaction(() => {
    const orderNumber = generateOrderNumber(db)

    const orderResult = insertOrder.run(
      orderNumber,
      order.table_no || '',
      order.payment_method || 'Cash',
      order.discount_type || '',
      order.discount_value || 0,
      subtotal,
      taxTotal,
      grandTotal,
      order.notes || '',
      order.responsible_person || ''
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

    return { id: orderId, order_number: orderNumber }
  })()

  return { id: result.id, order_number: result.order_number, subtotal, tax_total: taxTotal, grand_total: grandTotal }
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
  // Validate the status transition
  const current = db.prepare('SELECT status, order_number, grand_total FROM orders WHERE id = ?').get(id) as { status: string; order_number: string; grand_total: number } | undefined
  if (!current) {
    return { changes: 0, error: 'Order not found' }
  }

  const allowed = VALID_TRANSITIONS[current.status]
  if (!allowed || allowed.indexOf(status) === -1) {
    return { changes: 0, error: 'Cannot transition from ' + current.status + ' to ' + status }
  }

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
    const label = current.order_number ? current.order_number : String(id)
    addFundTransaction(db, 'sales', current.grand_total, id, 'Order #' + label + ' payment')
  }

  return result
}

export function updateOrderPaymentMethod(db: Database.Database, id: number, paymentMethod: string) {
  return db.prepare('UPDATE orders SET payment_method = ? WHERE id = ?').run(paymentMethod, id)
}

export function cancelOrder(db: Database.Database, id: number) {
  // Check current status — if served, we need to reverse the fund credit
  const current = db.prepare('SELECT status, order_number, grand_total FROM orders WHERE id = ?').get(id) as { status: string; order_number: string; grand_total: number } | undefined
  if (!current) {
    return { changes: 0 }
  }

  // Validate: only pending/preparing can be cancelled
  if (current.status !== 'pending' && current.status !== 'preparing') {
    return { changes: 0, error: 'Cannot cancel an order with status: ' + current.status }
  }

  const result = db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id)
  return result
}

/**
 * Get distinct responsible person names for autocomplete suggestions.
 */
export function getDistinctResponsiblePersons(db: Database.Database): string[] {
  const rows = db.prepare(
    "SELECT DISTINCT responsible_person FROM orders WHERE responsible_person IS NOT NULL AND responsible_person != '' ORDER BY responsible_person"
  ).all() as { responsible_person: string }[]
  return rows.map(r => r.responsible_person)
}

export interface DetailedOrderFilters {
  search?: string
  status?: string
  paymentMethod?: string
  responsiblePerson?: string
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
  sortBy?: string
  sortDir?: string
  page?: number
  pageSize?: number
}

/**
 * Build WHERE clauses and params from filters.
 * Shared between paginated and export queries.
 */
function buildDetailedWhere(filters: DetailedOrderFilters): { whereSQL: string; params: unknown[] } {
  let whereClauses: string[] = []
  const params: unknown[] = []

  if (filters.status) {
    whereClauses.push('o.status = ?')
    params.push(filters.status)
  }

  if (filters.paymentMethod) {
    whereClauses.push('o.payment_method = ?')
    params.push(filters.paymentMethod)
  }

  if (filters.responsiblePerson) {
    whereClauses.push('o.responsible_person = ?')
    params.push(filters.responsiblePerson)
  }

  if (filters.dateFrom) {
    whereClauses.push('o.order_time >= ?')
    params.push(filters.dateFrom + ' 00:00:00')
  }

  if (filters.dateTo) {
    whereClauses.push('o.order_time <= ?')
    params.push(filters.dateTo + ' 23:59:59')
  }

  if (filters.amountMin !== undefined && filters.amountMin !== null) {
    whereClauses.push('o.grand_total >= ?')
    params.push(filters.amountMin)
  }

  if (filters.amountMax !== undefined && filters.amountMax !== null) {
    whereClauses.push('o.grand_total <= ?')
    params.push(filters.amountMax)
  }

  if (filters.search) {
    const searchTerm = '%' + filters.search + '%'
    whereClauses.push(
      '(o.order_number LIKE ? OR o.table_no LIKE ? OR o.payment_method LIKE ? OR o.status LIKE ? OR CAST(o.grand_total AS TEXT) LIKE ? OR o.order_time LIKE ? OR o.responsible_person LIKE ? OR EXISTS (SELECT 1 FROM order_items oi2 WHERE oi2.order_id = o.id AND oi2.name LIKE ?))'
    )
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
  }

  const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : ''
  return { whereSQL, params }
}

/**
 * Whitelist sortable columns to prevent SQL injection.
 */
const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  order_number: 'o.order_number',
  order_time: 'o.order_time',
  status: 'o.status',
  payment_method: 'o.payment_method',
  grand_total: 'o.grand_total',
  table_no: 'o.table_no',
  responsible_person: 'o.responsible_person',
  item_count: 'item_count'
}

export function getAllOrdersDetailed(db: Database.Database, filters: DetailedOrderFilters) {
  const page = filters.page || 1
  const pageSize = filters.pageSize || 25
  const offset = (page - 1) * pageSize
  const sortBy = filters.sortBy || 'order_time'
  const sortDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC'
  const sortColumn = ALLOWED_SORT_COLUMNS[sortBy] || 'o.order_time'

  const { whereSQL, params } = buildDetailedWhere(filters)

  // Get total count for pagination
  const countRow = db.prepare(
    'SELECT COUNT(*) as total FROM orders o ' + whereSQL
  ).get(...params) as { total: number }

  // Get paginated orders with item summary
  const orders = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
      (SELECT SUM(oi.qty) FROM order_items oi WHERE oi.order_id = o.id) as total_items,
      (SELECT GROUP_CONCAT(oi.name || ' x' || oi.qty, ', ') FROM order_items oi WHERE oi.order_id = o.id) as items_summary
    FROM orders o
    ${whereSQL}
    ORDER BY ${sortColumn} ${sortDir}
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset)

  return {
    orders,
    total: countRow.total,
    page,
    pageSize,
    totalPages: Math.ceil(countRow.total / pageSize)
  }
}

/**
 * Get ALL orders matching filters (no pagination).
 * Used for PDF/CSV export so users get all matching data, not just current page.
 */
export function getAllOrdersForExport(db: Database.Database, filters: DetailedOrderFilters) {
  const sortBy = filters.sortBy || 'order_time'
  const sortDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC'
  const sortColumn = ALLOWED_SORT_COLUMNS[sortBy] || 'o.order_time'

  const { whereSQL, params } = buildDetailedWhere(filters)

  const orders = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
      (SELECT SUM(oi.qty) FROM order_items oi WHERE oi.order_id = o.id) as total_items,
      (SELECT GROUP_CONCAT(oi.name || ' x' || oi.qty, ', ') FROM order_items oi WHERE oi.order_id = o.id) as items_summary
    FROM orders o
    ${whereSQL}
    ORDER BY ${sortColumn} ${sortDir}
  `).all(...params)

  return orders
}
