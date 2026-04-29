import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { getFundBalance, getFundTransactions, setInitialFund } from '../database/fund-queries'

export function registerFundHandlers(db: Database.Database): void {
  ipcMain.handle('fund:getBalance', () => {
    return { balance: getFundBalance(db) }
  })

  ipcMain.handle('fund:setInitial', (_event, amount: number) => {
    setInitialFund(db, amount)
    return { success: true, balance: getFundBalance(db) }
  })

  ipcMain.handle('fund:getTransactions', (_event, limit?: number) => {
    return getFundTransactions(db, limit)
  })
}
