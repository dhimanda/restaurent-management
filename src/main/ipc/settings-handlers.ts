import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import {
  getAllSettings,
  setSetting,
  setMultipleSettings,
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getAllExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory
} from '../database/settings-queries'

export function registerSettingsHandlers(db: Database.Database): void {
  // Key/value settings
  ipcMain.handle('settings:getAll', () => {
    return getAllSettings(db)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    setSetting(db, key, value)
    return { success: true }
  })

  ipcMain.handle('settings:setMultiple', (_event, settings: Record<string, string>) => {
    setMultipleSettings(db, settings)
    return { success: true }
  })

  // Payment methods
  ipcMain.handle('paymentMethods:getAll', () => {
    return getAllPaymentMethods(db)
  })

  ipcMain.handle('paymentMethods:create', (_event, label: string) => {
    return createPaymentMethod(db, label)
  })

  ipcMain.handle('paymentMethods:update', (_event, id: number, label: string) => {
    updatePaymentMethod(db, id, label)
    return { success: true }
  })

  ipcMain.handle('paymentMethods:delete', (_event, id: number) => {
    deletePaymentMethod(db, id)
    return { success: true }
  })

  // Expense categories
  ipcMain.handle('expenseCategories:getAll', () => {
    return getAllExpenseCategories(db)
  })

  ipcMain.handle('expenseCategories:create', (_event, name: string) => {
    return createExpenseCategory(db, name)
  })

  ipcMain.handle('expenseCategories:update', (_event, id: number, name: string) => {
    updateExpenseCategory(db, id, name)
    return { success: true }
  })

  ipcMain.handle('expenseCategories:delete', (_event, id: number) => {
    deleteExpenseCategory(db, id)
    return { success: true }
  })
}
