import { contextBridge, ipcRenderer } from 'electron'

const api = {
  menu: {
    getAll: () => ipcRenderer.invoke('menu:getAll'),
    getByCategory: (categoryId: number) => ipcRenderer.invoke('menu:getByCategory', categoryId),
    getAvailable: () => ipcRenderer.invoke('menu:getAvailable'),
    create: (item: any) => ipcRenderer.invoke('menu:create', item),
    update: (id: number, item: any) => ipcRenderer.invoke('menu:update', id, item),
    delete: (id: number) => ipcRenderer.invoke('menu:delete', id),
    toggleAvailability: (id: number) => ipcRenderer.invoke('menu:toggleAvailability', id),
    pickImage: () => ipcRenderer.invoke('menu:pickImage')
  },
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (name: string) => ipcRenderer.invoke('categories:create', name)
  },
  orders: {
    create: (order: any) => ipcRenderer.invoke('orders:create', order),
    getActive: () => ipcRenderer.invoke('orders:getActive'),
    getAll: (filters?: any) => ipcRenderer.invoke('orders:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('orders:getById', id),
    updateStatus: (id: number, status: string) => ipcRenderer.invoke('orders:updateStatus', id, status),
    cancel: (id: number) => ipcRenderer.invoke('orders:cancel', id)
  },
  reports: {
    dailySummary: (date: string) => ipcRenderer.invoke('reports:dailySummary', date),
    dateRange: (from: string, to: string) => ipcRenderer.invoke('reports:dateRange', from, to),
    itemPerformance: (from: string, to: string) => ipcRenderer.invoke('reports:itemPerformance', from, to),
    paymentBreakdown: (from: string, to: string) => ipcRenderer.invoke('reports:paymentBreakdown', from, to)
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    setMultiple: (settings: Record<string, string>) => ipcRenderer.invoke('settings:setMultiple', settings)
  },
  sync: {
    connectDrive: () => ipcRenderer.invoke('sync:connectDrive'),
    syncNow: () => ipcRenderer.invoke('sync:syncNow'),
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    exportDb: () => ipcRenderer.invoke('sync:exportDb'),
    importDb: () => ipcRenderer.invoke('sync:importDb')
  },
  print: {
    printBill: (orderId: number) => ipcRenderer.invoke('print:bill', orderId)
  }
}

contextBridge.exposeInMainWorld('api', api)
