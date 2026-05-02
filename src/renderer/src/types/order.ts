export interface Order {
  id: number
  order_number: string
  table_no: string
  status: 'pending' | 'preparing' | 'served' | 'cancelled'
  payment_method: string
  discount_type: 'flat' | 'percentage' | ''
  discount_value: number
  subtotal: number
  tax_total: number
  grand_total: number
  notes: string
  order_time: string
  served_time: string | null
  created_at: string
  item_count?: number
  total_items?: number
  items?: OrderItem[]
}

export interface OrderItem {
  id: number
  order_id: number
  menu_item_id: number
  name: string
  qty: number
  unit_price: number
  notes: string
}

export interface CartItem {
  menu_item_id: number
  name: string
  qty: number
  unit_price: number
  notes: string
}

export interface OrderInput {
  table_no?: string
  payment_method?: string
  discount_type?: string
  discount_value?: number
  notes?: string
  items: CartItem[]
}
