export interface MenuItem {
  id: number
  category_id: number
  category_name: string
  name: string
  price: number
  cost_price: number | null
  description: string | null
  image_path: string | null
  availability: number
  tags: string | null
  tax_rate: number | null
  preparation_time: number | null
  sku: string | null
  created_at: string
  updated_at: string
}

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

export interface Category {
  id: number
  name: string
  sort_order: number
  created_at: string
}
