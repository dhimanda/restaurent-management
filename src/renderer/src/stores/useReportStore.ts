import { create } from 'zustand'
import { DailySummary, DateRangeReport, ItemPerformance } from '../types/report'
import { getTodayDateString, getDateNDaysAgo } from '../utils/format'

interface AllOrdersFilters {
  search: string
  status: string
  paymentMethod: string
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
  sortBy: string
  sortDir: string
  page: number
  pageSize: number
}

interface AllOrdersResult {
  orders: any[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

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
  allOrdersFilters: AllOrdersFilters
  allOrdersResult: AllOrdersResult | null
  allOrdersLoading: boolean
  allOrdersError: string
  setActiveTab: (tab: string) => void
  setSelectedDate: (date: string) => void
  setDateFrom: (date: string) => void
  setDateTo: (date: string) => void
  setBillOrderId: (id: string) => void
  fetchDailySummary: () => Promise<void>
  fetchDateRangeReport: () => Promise<void>
  fetchItemPerformance: () => Promise<void>
  fetchBillOrder: () => Promise<void>
  setAllOrdersFilter: (key: string, value: any) => void
  setAllOrdersPage: (page: number) => void
  setAllOrdersSort: (sortBy: string) => void
  fetchAllOrders: () => Promise<void>
  fetchAllOrdersForExport: () => Promise<any[]>
}

function buildApiFilters(f: AllOrdersFilters): Record<string, any> {
  const apiFilters: Record<string, any> = {
    sortBy: f.sortBy,
    sortDir: f.sortDir,
    page: f.page,
    pageSize: f.pageSize
  }
  if (f.search) apiFilters.search = f.search
  if (f.status) apiFilters.status = f.status
  if (f.paymentMethod) apiFilters.paymentMethod = f.paymentMethod
  if (f.dateFrom) apiFilters.dateFrom = f.dateFrom
  if (f.dateTo) apiFilters.dateTo = f.dateTo
  if (f.amountMin) apiFilters.amountMin = parseFloat(f.amountMin)
  if (f.amountMax) apiFilters.amountMax = parseFloat(f.amountMax)
  return apiFilters
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
  allOrdersFilters: {
    search: '',
    status: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    sortBy: 'order_time',
    sortDir: 'desc',
    page: 1,
    pageSize: 25
  },
  allOrdersResult: null,
  allOrdersLoading: false,
  allOrdersError: '',

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
  },

  setAllOrdersFilter: (key: string, value: any) => {
    const filters = { ...get().allOrdersFilters, [key]: value, page: 1 }
    set({ allOrdersFilters: filters })
  },

  setAllOrdersPage: (page: number) => {
    const filters = { ...get().allOrdersFilters, page }
    set({ allOrdersFilters: filters })
  },

  setAllOrdersSort: (sortBy: string) => {
    const current = get().allOrdersFilters
    let sortDir = 'desc'
    if (current.sortBy === sortBy) {
      sortDir = current.sortDir === 'desc' ? 'asc' : 'desc'
    }
    set({ allOrdersFilters: { ...current, sortBy, sortDir, page: 1 } })
  },

  fetchAllOrders: async () => {
    set({ allOrdersLoading: true, allOrdersError: '' })
    try {
      const apiFilters = buildApiFilters(get().allOrdersFilters)
      const result = await window.api.orders.getAllDetailed(apiFilters)
      set({ allOrdersResult: result, allOrdersLoading: false })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load orders'
      console.error('Failed to fetch all orders:', error)
      set({ allOrdersLoading: false, allOrdersError: msg })
    }
  },

  /**
   * Fetch ALL matching orders (no pagination) for export purposes.
   * Returns the full array of orders matching current filters.
   */
  fetchAllOrdersForExport: async () => {
    try {
      const apiFilters = buildApiFilters(get().allOrdersFilters)
      const orders = await window.api.orders.getAllForExport(apiFilters)
      return orders
    } catch (error) {
      console.error('Failed to fetch orders for export:', error)
      return []
    }
  }
}))
