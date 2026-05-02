import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import {
  createExpense,
  getAllExpenses,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getDistinctExpenseResponsiblePersons
} from '../database/expense-queries'

export function registerExpenseHandlers(db: Database.Database): void {
  ipcMain.handle('expenses:create', (_event, input) => {
    return createExpense(db, input)
  })

  ipcMain.handle('expenses:getAll', (_event, filters) => {
    return getAllExpenses(db, filters)
  })

  ipcMain.handle('expenses:update', (_event, id: number, input) => {
    updateExpense(db, id, input)
    return { success: true }
  })

  ipcMain.handle('expenses:delete', (_event, id: number) => {
    deleteExpense(db, id)
    return { success: true }
  })

  ipcMain.handle('expenses:getSummary', (_event, from: string, to: string) => {
    return getExpenseSummary(db, from, to)
  })

  ipcMain.handle('expenses:getResponsiblePersons', () => {
    return getDistinctExpenseResponsiblePersons(db)
  })
}
