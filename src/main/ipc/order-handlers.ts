import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import {
  createOrder,
  getActiveOrders,
  getAllOrders,
  getAllOrdersDetailed,
  getAllOrdersForExport,
  getOrderById,
  updateOrderStatus,
  updateOrderPaymentMethod,
  cancelOrder,
  getDistinctResponsiblePersons,
  OrderInput,
  DetailedOrderFilters
} from '../database/order-queries'

export function registerOrderHandlers(db: Database.Database): void {
  ipcMain.handle('orders:create', (_event, order: OrderInput) => {
    return createOrder(db, order)
  })

  ipcMain.handle('orders:getActive', () => {
    return getActiveOrders(db)
  })

  ipcMain.handle('orders:getAll', (_event, filters?: { status?: string; from?: string; to?: string }) => {
    return getAllOrders(db, filters)
  })

  ipcMain.handle('orders:getById', (_event, id: number) => {
    return getOrderById(db, id)
  })

  ipcMain.handle('orders:updateStatus', (_event, id: number, status: string) => {
    return updateOrderStatus(db, id, status)
  })

  ipcMain.handle('orders:updatePaymentMethod', (_event, id: number, paymentMethod: string) => {
    return updateOrderPaymentMethod(db, id, paymentMethod)
  })

  ipcMain.handle('orders:cancel', (_event, id: number) => {
    return cancelOrder(db, id)
  })

  ipcMain.handle('orders:getAllDetailed', (_event, filters: DetailedOrderFilters) => {
    return getAllOrdersDetailed(db, filters)
  })

  ipcMain.handle('orders:getAllForExport', (_event, filters: DetailedOrderFilters) => {
    return getAllOrdersForExport(db, filters)
  })

  ipcMain.handle('orders:getResponsiblePersons', () => {
    return getDistinctResponsiblePersons(db)
  })
}
