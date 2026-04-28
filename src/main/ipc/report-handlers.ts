import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import {
  getDailySummary,
  getDateRangeReport,
  getItemPerformance,
  getPaymentBreakdown
} from '../database/report-queries'

export function registerReportHandlers(db: Database.Database): void {
  ipcMain.handle('reports:dailySummary', (_event, date: string) => {
    return getDailySummary(db, date)
  })

  ipcMain.handle('reports:dateRange', (_event, from: string, to: string) => {
    return getDateRangeReport(db, from, to)
  })

  ipcMain.handle('reports:itemPerformance', (_event, from: string, to: string) => {
    return getItemPerformance(db, from, to)
  })

  ipcMain.handle('reports:paymentBreakdown', (_event, from: string, to: string) => {
    return getPaymentBreakdown(db, from, to)
  })
}
