import { create } from 'zustand'
import { Order } from '../types/order'

interface DashboardState {
  orders: Order[]
  activeFilter: string
  sortBy: string
  selectedOrder: Order | null
  isDetailOpen: boolean
  isLoading: boolean
  fetchOrders: () => Promise<void>
  updateStatus: (id: number, status: string) => Promise<void>
  cancelOrder: (id: number) => Promise<void>
  setFilter: (filter: string) => void
  setSort: (sort: string) => void
  setSelectedOrder: (order: Order | null) => void
  setDetailOpen: (open: boolean) => void
  getFilteredOrders: () => Order[]
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  orders: [],
  activeFilter: 'active',
  sortBy: 'oldest',
  selectedOrder: null,
  isDetailOpen: false,
  isLoading: false,

  fetchOrders: async () => {
    set({ isLoading: true })
    try {
      const filter = get().activeFilter
      let orders: Order[]
      if (filter === 'active') {
        orders = await window.api.orders.getActive()
      } else if (filter === 'all') {
        orders = await window.api.orders.getAll()
      } else {
        orders = await window.api.orders.getAll({ status: filter })
      }
      set({ orders, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      set({ isLoading: false })
    }
  },

  updateStatus: async (id: number, status: string) => {
    try {
      await window.api.orders.updateStatus(id, status)
      await get().fetchOrders()
      // Refresh selected order if open
      const selected = get().selectedOrder
      if (selected && selected.id === id) {
        const updated = await window.api.orders.getById(id)
        set({ selectedOrder: updated })
      }
    } catch (error) {
      console.error('Failed to update order status:', error)
    }
  },

  cancelOrder: async (id: number) => {
    try {
      await window.api.orders.cancel(id)
      await get().fetchOrders()
      set({ isDetailOpen: false, selectedOrder: null })
    } catch (error) {
      console.error('Failed to cancel order:', error)
    }
  },

  setFilter: (filter: string) => {
    set({ activeFilter: filter })
    get().fetchOrders()
  },

  setSort: (sort: string) => set({ sortBy: sort }),

  setSelectedOrder: (order: Order | null) => set({ selectedOrder: order }),

  setDetailOpen: (open: boolean) => {
    set({ isDetailOpen: open })
    if (!open) {
      set({ selectedOrder: null })
    }
  },

  getFilteredOrders: () => {
    const state = get()
    let filtered = [...state.orders]

    if (state.sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.order_time).getTime() - new Date(b.order_time).getTime())
    } else if (state.sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.order_time).getTime() - new Date(a.order_time).getTime())
    } else if (state.sortBy === 'total') {
      filtered.sort((a, b) => b.grand_total - a.grand_total)
    }

    return filtered
  }
}))
