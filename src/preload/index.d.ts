export interface PaymentMethodItem {
  id: number
  label: string
  sort_order: number
  is_active: number
}

export interface ExpenseCategoryItem {
  id: number
  name: string
  sort_order: number
  is_active: number
}

export interface ElectronAPI {
  menu: {
    getAll: () => Promise<any[]>
    getByCategory: (categoryId: number) => Promise<any[]>
    getAvailable: () => Promise<any[]>
    create: (item: any) => Promise<any>
    update: (id: number, item: any) => Promise<any>
    delete: (id: number) => Promise<any>
    toggleAvailability: (id: number) => Promise<any>
    pickImage: () => Promise<string | null>
  }
  categories: {
    getAll: () => Promise<any[]>
    create: (name: string) => Promise<any>
  }
  orders: {
    create: (order: any) => Promise<any>
    getActive: () => Promise<any[]>
    getAll: (filters?: any) => Promise<any[]>
    getById: (id: number) => Promise<any>
    updateStatus: (id: number, status: string) => Promise<any>
    updatePaymentMethod: (id: number, paymentMethod: string) => Promise<any>
    cancel: (id: number) => Promise<any>
    getAllDetailed: (filters?: any) => Promise<any>
    getAllForExport: (filters?: any) => Promise<any[]>
    getResponsiblePersons: () => Promise<string[]>
  }
  reports: {
    dailySummary: (date: string) => Promise<any>
    dateRange: (from: string, to: string) => Promise<any>
    itemPerformance: (from: string, to: string) => Promise<any[]>
    paymentBreakdown: (from: string, to: string) => Promise<any[]>
  }
  settings: {
    getAll: () => Promise<Record<string, string>>
    set: (key: string, value: string) => Promise<any>
    setMultiple: (settings: Record<string, string>) => Promise<any>
  }
  sync: {
    connectDrive: () => Promise<any>
    syncNow: () => Promise<any>
    getStatus: () => Promise<{ connected: boolean; lastSyncTime: string | null }>
    exportDb: () => Promise<{ success: boolean; message: string; path?: string }>
    importDb: () => Promise<{ success: boolean; message: string }>
    exportCsv: (type: string, from: string, to: string) => Promise<{ success: boolean; message: string; path?: string }>
  }
  print: {
    printBill: (orderId: number) => Promise<{ success: boolean; message?: string }>
    exportPdf: (orderId: number) => Promise<{ success: boolean; message?: string; path?: string }>
  }
  expenses: {
    create: (input: any) => Promise<any>
    getAll: (filters?: any) => Promise<any[]>
    update: (id: number, input: any) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
    getSummary: (from: string, to: string) => Promise<any>
    getResponsiblePersons: () => Promise<string[]>
  }
  fund: {
    getBalance: () => Promise<{ balance: number }>
    setInitial: (amount: number) => Promise<{ success: boolean; balance: number }>
    getTransactions: (limit?: number) => Promise<any[]>
  }
  paymentMethods: {
    getAll: () => Promise<PaymentMethodItem[]>
    create: (label: string) => Promise<PaymentMethodItem>
    update: (id: number, label: string) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
  }
  expenseCategories: {
    getAll: () => Promise<ExpenseCategoryItem[]>
    create: (name: string) => Promise<ExpenseCategoryItem>
    update: (id: number, name: string) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
