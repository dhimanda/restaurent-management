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
    cancel: (id: number) => Promise<any>
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
  }
  print: {
    printBill: (orderId: number) => Promise<{ success: boolean; message?: string }>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
