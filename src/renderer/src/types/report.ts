export interface DailySummary {
  total_orders: number
  total_revenue: number
  avg_order_value: number
  total_tax: number
  total_discounts: number
  total_items_sold: number
  top_items: TopItem[]
  payment_breakdown: PaymentBreakdownItem[]
}

export interface TopItem {
  name: string
  total_qty: number
  total_revenue: number
}

export interface PaymentBreakdownItem {
  payment_method: string
  count: number
  total: number
}

export interface DateRangeReport {
  daily_revenue: DailyRevenue[]
  summary: {
    total_orders: number
    total_revenue: number
    avg_order_value: number
  }
  orders: Order[]
}

export interface DailyRevenue {
  date: string
  orders: number
  revenue: number
}

export interface ItemPerformance {
  name: string
  order_count: number
  total_qty: number
  total_revenue: number
  avg_price: number
}

interface Order {
  id: number
  table_no: string
  status: string
  payment_method: string
  grand_total: number
  order_time: string
}
