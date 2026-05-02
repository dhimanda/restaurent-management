import { create } from 'zustand'

export interface Expense {
  id: number
  date: string
  amount: number
  payment_method: string
  category: string
  responsible_person: string
  note: string | null
  created_at: string
}

interface ExpenseSummary {
  total: { total: number; count: number }
  byCategory: { category: string; total: number; count: number }[]
}

interface ExpenseState {
  expenses: Expense[]
  summary: ExpenseSummary | null
  isLoading: boolean
  isSaving: boolean
  filterFrom: string
  filterTo: string
  fetchExpenses: (filters?: { from?: string; to?: string; category?: string }) => Promise<void>
  fetchSummary: (from: string, to: string) => Promise<void>
  createExpense: (input: Omit<Expense, 'id' | 'created_at'>) => Promise<void>
  updateExpense: (id: number, input: Omit<Expense, 'id' | 'created_at'>) => Promise<void>
  deleteExpense: (id: number) => Promise<void>
  setFilterFrom: (date: string) => void
  setFilterTo: (date: string) => void
}

function getTodayString(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function getMonthStartString(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01'
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  summary: null,
  isLoading: false,
  isSaving: false,
  filterFrom: getMonthStartString(),
  filterTo: getTodayString(),

  setFilterFrom: (date: string) => set({ filterFrom: date }),
  setFilterTo: (date: string) => set({ filterTo: date }),

  fetchExpenses: async (filters) => {
    set({ isLoading: true })
    try {
      const data = await window.api.expenses.getAll(filters)
      set({ expenses: data, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
      set({ isLoading: false })
    }
  },

  fetchSummary: async (from: string, to: string) => {
    try {
      const data = await window.api.expenses.getSummary(from, to)
      set({ summary: data })
    } catch (error) {
      console.error('Failed to fetch expense summary:', error)
    }
  },

  createExpense: async (input) => {
    set({ isSaving: true })
    try {
      const created = await window.api.expenses.create(input)
      const current = get().expenses
      set({ expenses: [created, ...current], isSaving: false })
    } catch (error) {
      console.error('Failed to create expense:', error)
      set({ isSaving: false })
    }
  },

  updateExpense: async (id: number, input) => {
    set({ isSaving: true })
    try {
      await window.api.expenses.update(id, input)
      const updated = get().expenses.map(e => e.id === id ? { ...e, ...input } : e)
      set({ expenses: updated, isSaving: false })
    } catch (error) {
      console.error('Failed to update expense:', error)
      set({ isSaving: false })
    }
  },

  deleteExpense: async (id: number) => {
    try {
      await window.api.expenses.delete(id)
      set({ expenses: get().expenses.filter(e => e.id !== id) })
    } catch (error) {
      console.error('Failed to delete expense:', error)
    }
  }
}))
