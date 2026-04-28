import { create } from 'zustand'
import { DailySummary, DateRangeReport, ItemPerformance } from '../types/report'
import { getTodayDateString, getDateNDaysAgo } from '../utils/format'

interface ReportState {
  activeTab: string
  dailySummary: DailySummary | null
  dateRangeReport: DateRangeReport | null
  itemPerformance: ItemPerformance[]
  selectedDate: string
  dateFrom: string
  dateTo: string
  billOrderId: string
  billOrder: any
  isLoading: boolean
  setActiveTab: (tab: string) => void
  setSelectedDate: (date: string) => void
  setDateFrom: (date: string) => void
  setDateTo: (date: string) => void
  setBillOrderId: (id: string) => void
  fetchDailySummary: () => Promise<void>
  fetchDateRangeReport: () => Promise<void>
  fetchItemPerformance: () => Promise<void>
  fetchBillOrder: () => Promise<void>
}

export const useReportStore = create<ReportState>((set, get) => ({
  activeTab: 'daily',
  dailySummary: null,
  dateRangeReport: null,
  itemPerformance: [],
  selectedDate: getTodayDateString(),
  dateFrom: getDateNDaysAgo(7),
  dateTo: getTodayDateString(),
  billOrderId: '',
  billOrder: null,
  isLoading: false,

  setActiveTab: (tab: string) => set({ activeTab: tab }),
  setSelectedDate: (date: string) => set({ selectedDate: date }),
  setDateFrom: (date: string) => set({ dateFrom: date }),
  setDateTo: (date: string) => set({ dateTo: date }),
  setBillOrderId: (id: string) => set({ billOrderId: id }),

  fetchDailySummary: async () => {
    set({ isLoading: true })
    try {
      const summary = await window.api.reports.dailySummary(get().selectedDate)
      set({ dailySummary: summary, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch daily summary:', error)
      set({ isLoading: false })
    }
  },

  fetchDateRangeReport: async () => {
    set({ isLoading: true })
    try {
      const report = await window.api.reports.dateRange(get().dateFrom, get().dateTo)
      set({ dateRangeReport: report, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch date range report:', error)
      set({ isLoading: false })
    }
  },

  fetchItemPerformance: async () => {
    set({ isLoading: true })
    try {
      const performance = await window.api.reports.itemPerformance(get().dateFrom, get().dateTo)
      set({ itemPerformance: performance, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch item performance:', error)
      set({ isLoading: false })
    }
  },

  fetchBillOrder: async () => {
    const orderId = parseInt(get().billOrderId)
    if (isNaN(orderId)) return
    set({ isLoading: true })
    try {
      const order = await window.api.orders.getById(orderId)
      set({ billOrder: order, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch bill order:', error)
      set({ isLoading: false })
    }
  }
}))
