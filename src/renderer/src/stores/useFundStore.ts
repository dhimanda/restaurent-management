import { create } from 'zustand'

interface FundTransaction {
  id: number
  type: 'initial_fund' | 'sales' | 'expense'
  reference_id: number | null
  amount: number
  note: string | null
  created_at: string
}

interface FundState {
  balance: number
  transactions: FundTransaction[]
  isLoading: boolean
  fetchBalance: () => Promise<void>
  setInitialFund: (amount: number) => Promise<void>
  fetchTransactions: (limit?: number) => Promise<void>
}

export const useFundStore = create<FundState>((set) => ({
  balance: 0,
  transactions: [],
  isLoading: false,

  fetchBalance: async () => {
    set({ isLoading: true })
    try {
      const result = await window.api.fund.getBalance()
      set({ balance: result.balance, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch fund balance:', error)
      set({ isLoading: false })
    }
  },

  setInitialFund: async (amount: number) => {
    try {
      const result = await window.api.fund.setInitial(amount)
      set({ balance: result.balance })
    } catch (error) {
      console.error('Failed to set initial fund:', error)
    }
  },

  fetchTransactions: async (limit?: number) => {
    try {
      const data = await window.api.fund.getTransactions(limit)
      set({ transactions: data })
    } catch (error) {
      console.error('Failed to fetch fund transactions:', error)
    }
  }
}))
