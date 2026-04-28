import Database from 'better-sqlite3'

export function getDailySummary(db: Database.Database, date: string) {
  const dateStart = date + ' 00:00:00'
  const dateEnd = date + ' 23:59:59'

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(grand_total), 0) as total_revenue,
      COALESCE(AVG(grand_total), 0) as avg_order_value,
      COALESCE(SUM(tax_total), 0) as total_tax,
      COALESCE(SUM(CASE WHEN discount_value > 0 THEN
        CASE WHEN discount_type = 'percentage' THEN subtotal * (discount_value / 100) ELSE discount_value END
      ELSE 0 END), 0) as total_discounts
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
  `).get(dateStart, dateEnd) as Record<string, number>

  const totalItemsSold = db.prepare(`
    SELECT COALESCE(SUM(oi.qty), 0) as total
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_time BETWEEN ? AND ?
    AND o.status != 'cancelled'
  `).get(dateStart, dateEnd) as { total: number }

  const topItemsByQty = db.prepare(`
    SELECT oi.name, SUM(oi.qty) as total_qty, SUM(oi.qty * oi.unit_price) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_time BETWEEN ? AND ?
    AND o.status != 'cancelled'
    GROUP BY oi.name
    ORDER BY total_qty DESC
    LIMIT 5
  `).all(dateStart, dateEnd)

  const paymentBreakdown = db.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(grand_total) as total
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
    GROUP BY payment_method
  `).all(dateStart, dateEnd)

  return {
    ...summary,
    total_items_sold: totalItemsSold.total,
    top_items: topItemsByQty,
    payment_breakdown: paymentBreakdown
  }
}

export function getDateRangeReport(db: Database.Database, from: string, to: string) {
  const dateStart = from + ' 00:00:00'
  const dateEnd = to + ' 23:59:59'

  const dailyRevenue = db.prepare(`
    SELECT DATE(order_time) as date,
      COUNT(*) as orders,
      SUM(grand_total) as revenue
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
    GROUP BY DATE(order_time)
    ORDER BY date
  `).all(dateStart, dateEnd)

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(grand_total), 0) as total_revenue,
      COALESCE(AVG(grand_total), 0) as avg_order_value
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
  `).get(dateStart, dateEnd)

  const orders = db.prepare(`
    SELECT id, table_no, status, payment_method, grand_total, order_time
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    ORDER BY order_time DESC
  `).all(dateStart, dateEnd)

  return { daily_revenue: dailyRevenue, summary, orders }
}

export function getItemPerformance(db: Database.Database, from: string, to: string) {
  const dateStart = from + ' 00:00:00'
  const dateEnd = to + ' 23:59:59'

  return db.prepare(`
    SELECT
      oi.name,
      COUNT(DISTINCT oi.order_id) as order_count,
      SUM(oi.qty) as total_qty,
      SUM(oi.qty * oi.unit_price) as total_revenue,
      ROUND(AVG(oi.unit_price), 2) as avg_price
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_time BETWEEN ? AND ?
    AND o.status != 'cancelled'
    GROUP BY oi.name
    ORDER BY total_revenue DESC
  `).all(dateStart, dateEnd)
}

export function getPaymentBreakdown(db: Database.Database, from: string, to: string) {
  const dateStart = from + ' 00:00:00'
  const dateEnd = to + ' 23:59:59'

  return db.prepare(`
    SELECT payment_method, COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total
    FROM orders
    WHERE order_time BETWEEN ? AND ?
    AND status != 'cancelled'
    GROUP BY payment_method
  `).all(dateStart, dateEnd)
}
