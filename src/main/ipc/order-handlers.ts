import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import {
  createOrder,
  getActiveOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  OrderInput
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

  ipcMain.handle('orders:cancel', (_event, id: number) => {
    return cancelOrder(db, id)
  })
}
