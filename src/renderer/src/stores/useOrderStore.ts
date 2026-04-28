import { create } from 'zustand'
import { CartItem } from '../types/order'

interface OrderState {
  cartItems: CartItem[]
  tableNo: string
  discountType: 'flat' | 'percentage' | ''
  discountValue: number
  paymentMethod: string
  orderNotes: string
  isPlacing: boolean
  showConfirmation: boolean
  lastOrderId: number | null
  addItem: (item: CartItem) => void
  removeItem: (menuItemId: number) => void
  updateQty: (menuItemId: number, qty: number) => void
  setItemNotes: (menuItemId: number, notes: string) => void
  setTableNo: (tableNo: string) => void
  setDiscountType: (type: 'flat' | 'percentage' | '') => void
  setDiscountValue: (value: number) => void
  setPaymentMethod: (method: string) => void
  setOrderNotes: (notes: string) => void
  getSubtotal: () => number
  getDiscountAmount: () => number
  getTaxTotal: (taxRate: number) => number
  getGrandTotal: (taxRate: number) => number
  placeOrder: () => Promise<boolean>
  clearCart: () => void
  setShowConfirmation: (show: boolean) => void
}

export const useOrderStore = create<OrderState>((set, get) => ({
  cartItems: [],
  tableNo: '',
  discountType: '',
  discountValue: 0,
  paymentMethod: 'cash',
  orderNotes: '',
  isPlacing: false,
  showConfirmation: false,
  lastOrderId: null,

  addItem: (item: CartItem) => {
    const state = get()
    const existing = state.cartItems.find(ci => ci.menu_item_id === item.menu_item_id)
    if (existing) {
      set({
        cartItems: state.cartItems.map(ci =>
          ci.menu_item_id === item.menu_item_id
            ? { ...ci, qty: ci.qty + 1 }
            : ci
        )
      })
    } else {
      set({ cartItems: [...state.cartItems, { ...item, qty: 1, notes: '' }] })
    }
  },

  removeItem: (menuItemId: number) => {
    set({ cartItems: get().cartItems.filter(ci => ci.menu_item_id !== menuItemId) })
  },

  updateQty: (menuItemId: number, qty: number) => {
    if (qty <= 0) {
      get().removeItem(menuItemId)
      return
    }
    set({
      cartItems: get().cartItems.map(ci =>
        ci.menu_item_id === menuItemId ? { ...ci, qty } : ci
      )
    })
  },

  setItemNotes: (menuItemId: number, notes: string) => {
    set({
      cartItems: get().cartItems.map(ci =>
        ci.menu_item_id === menuItemId ? { ...ci, notes } : ci
      )
    })
  },

  setTableNo: (tableNo: string) => set({ tableNo }),
  setDiscountType: (type) => set({ discountType: type }),
  setDiscountValue: (value) => set({ discountValue: value }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setOrderNotes: (notes) => set({ orderNotes: notes }),

  getSubtotal: () => {
    return get().cartItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
  },

  getDiscountAmount: () => {
    const state = get()
    const subtotal = state.getSubtotal()
    if (!state.discountValue || state.discountValue <= 0) return 0
    if (state.discountType === 'percentage') {
      return subtotal * (state.discountValue / 100)
    }
    return state.discountValue
  },

  getTaxTotal: (taxRate: number) => {
    const state = get()
    const subtotal = state.getSubtotal()
    const discount = state.getDiscountAmount()
    return (subtotal - discount) * (taxRate / 100)
  },

  getGrandTotal: (taxRate: number) => {
    const state = get()
    const subtotal = state.getSubtotal()
    const discount = state.getDiscountAmount()
    const tax = state.getTaxTotal(taxRate)
    return subtotal - discount + tax
  },

  placeOrder: async () => {
    const state = get()
    if (state.cartItems.length === 0) return false

    set({ isPlacing: true })
    try {
      const result = await window.api.orders.create({
        table_no: state.tableNo,
        payment_method: state.paymentMethod,
        discount_type: state.discountType,
        discount_value: state.discountValue,
        notes: state.orderNotes,
        items: state.cartItems
      })
      set({ lastOrderId: result.id, isPlacing: false, showConfirmation: true })
      return true
    } catch (error) {
      console.error('Failed to place order:', error)
      set({ isPlacing: false })
      return false
    }
  },

  clearCart: () => {
    set({
      cartItems: [],
      tableNo: '',
      discountType: '',
      discountValue: 0,
      paymentMethod: 'cash',
      orderNotes: '',
      lastOrderId: null,
      showConfirmation: false
    })
  },

  setShowConfirmation: (show: boolean) => set({ showConfirmation: show })
}))
