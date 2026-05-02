export const ORDER_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  SERVED: 'served',
  CANCELLED: 'cancelled'
} as const

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500',
  preparing: 'bg-blue-500',
  served: 'bg-emerald-500',
  cancelled: 'bg-gray-500'
}

export const STATUS_BG_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 border-amber-500/30',
  preparing: 'bg-blue-500/15 border-blue-500/30',
  served: 'bg-emerald-500/15 border-emerald-500/30',
  cancelled: 'bg-gray-500/15 border-gray-500/30'
}

export const STATUS_TEXT_COLORS: Record<string, string> = {
  pending: 'text-amber-400',
  preparing: 'text-blue-400',
  served: 'text-emerald-400',
  cancelled: 'text-gray-400'
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  preparing: 'Preparing',
  served: 'Served',
  cancelled: 'Cancelled'
}

export const TAG_OPTIONS = [
  'Spicy',
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  "Chef's Pick",
  'Popular',
  'New',
  'Healthy'
]
