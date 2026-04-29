import { create } from 'zustand'

interface PaymentMethodItem {
  id: number
  label: string
  sort_order: number
  is_active: number
}

interface ExpenseCategoryItem {
  id: number
  name: string
  sort_order: number
  is_active: number
}

interface SettingsState {
  settings: Record<string, string>
  isLoading: boolean
  isSaving: boolean
  paymentMethods: PaymentMethodItem[]
  expenseCategories: ExpenseCategoryItem[]
  fetchSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
  updateMultipleSettings: (settings: Record<string, string>) => Promise<void>
  getSetting: (key: string, defaultValue?: string) => string
  fetchPaymentMethods: () => Promise<void>
  createPaymentMethod: (label: string) => Promise<void>
  updatePaymentMethod: (id: number, label: string) => Promise<void>
  deletePaymentMethod: (id: number) => Promise<void>
  fetchExpenseCategories: () => Promise<void>
  createExpenseCategory: (name: string) => Promise<void>
  updateExpenseCategory: (id: number, name: string) => Promise<void>
  deleteExpenseCategory: (id: number) => Promise<void>
}

function applyThemeToDocument(theme: string): void {
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  isLoading: false,
  isSaving: false,
  paymentMethods: [],
  expenseCategories: [],

  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api.settings.getAll()
      set({ settings, isLoading: false })
      applyThemeToDocument(settings['theme'] || 'dark')
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      set({ isLoading: false })
    }
  },

  updateSetting: async (key: string, value: string) => {
    set({ isSaving: true })
    try {
      await window.api.settings.set(key, value)
      const current = get().settings
      set({ settings: { ...current, [key]: value }, isSaving: false })
      if (key === 'theme') {
        applyThemeToDocument(value)
      }
    } catch (error) {
      console.error('Failed to update setting:', error)
      set({ isSaving: false })
    }
  },

  updateMultipleSettings: async (settings: Record<string, string>) => {
    set({ isSaving: true })
    try {
      await window.api.settings.setMultiple(settings)
      const current = get().settings
      set({ settings: { ...current, ...settings }, isSaving: false })
      if (settings['theme']) {
        applyThemeToDocument(settings['theme'])
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
      set({ isSaving: false })
    }
  },

  getSetting: (key: string, defaultValue: string = '') => {
    return get().settings[key] || defaultValue
  },

  // ─── Payment Methods ────────────────────────────────────────────────────────

  fetchPaymentMethods: async () => {
    try {
      const methods = await window.api.paymentMethods.getAll()
      set({ paymentMethods: methods })
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
    }
  },

  createPaymentMethod: async (label: string) => {
    try {
      await window.api.paymentMethods.create(label)
      await get().fetchPaymentMethods()
    } catch (error) {
      console.error('Failed to create payment method:', error)
    }
  },

  updatePaymentMethod: async (id: number, label: string) => {
    try {
      await window.api.paymentMethods.update(id, label)
      await get().fetchPaymentMethods()
    } catch (error) {
      console.error('Failed to update payment method:', error)
    }
  },

  deletePaymentMethod: async (id: number) => {
    try {
      await window.api.paymentMethods.delete(id)
      const current = get().paymentMethods
      set({ paymentMethods: current.filter(m => m.id !== id) })
    } catch (error) {
      console.error('Failed to delete payment method:', error)
    }
  },

  // ─── Expense Categories ─────────────────────────────────────────────────────

  fetchExpenseCategories: async () => {
    try {
      const cats = await window.api.expenseCategories.getAll()
      set({ expenseCategories: cats })
    } catch (error) {
      console.error('Failed to fetch expense categories:', error)
    }
  },

  createExpenseCategory: async (name: string) => {
    try {
      await window.api.expenseCategories.create(name)
      await get().fetchExpenseCategories()
    } catch (error) {
      console.error('Failed to create expense category:', error)
    }
  },

  updateExpenseCategory: async (id: number, name: string) => {
    try {
      await window.api.expenseCategories.update(id, name)
      await get().fetchExpenseCategories()
    } catch (error) {
      console.error('Failed to update expense category:', error)
    }
  },

  deleteExpenseCategory: async (id: number) => {
    try {
      await window.api.expenseCategories.delete(id)
      const current = get().expenseCategories
      set({ expenseCategories: current.filter(c => c.id !== id) })
    } catch (error) {
      console.error('Failed to delete expense category:', error)
    }
  }
}))
