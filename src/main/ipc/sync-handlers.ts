import { ipcMain, dialog, app } from 'electron'
import Database from 'better-sqlite3'
import { join } from 'path'
import { copyFileSync, existsSync, writeFileSync } from 'fs'
import { getDateRangeReport, getItemPerformance } from '../database/report-queries'
import { getAllExpenses } from '../database/expense-queries'

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (val: unknown) => {
    const s = val == null ? '' : String(val)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s
  }
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','))
  }
  return lines.join('\r\n')
}

export function registerSyncHandlers(db: Database.Database): void {
  // Export database binary backup
  ipcMain.handle('sync:exportDb', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Database Backup',
      defaultPath: join(app.getPath('documents'), `restaurant-backup-${new Date().toISOString().split('T')[0]}.db`),
      filters: [
        { name: 'SQLite Database', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'Export cancelled' }
    }

    try {
      const sourcePath = join(app.getPath('userData'), 'restaurant.db')
      copyFileSync(sourcePath, result.filePath)
      return { success: true, message: 'Database exported successfully', path: result.filePath }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, message: 'Export failed: ' + errorMessage }
    }
  })

  // Export report data as CSV
  ipcMain.handle('sync:exportCsv', async (_event, type: string, from: string, to: string) => {
    let csv = ''
    let defaultName = 'export'

    if (type === 'orders') {
      const report = getDateRangeReport(db, from, to)
      const rows = (report.orders as Record<string, unknown>[]) || []
      csv = rowsToCsv(['id', 'table_no', 'status', 'payment_method', 'grand_total', 'order_time'], rows)
      defaultName = 'orders-' + from + '-to-' + to
    } else if (type === 'items') {
      const rows = getItemPerformance(db, from, to) as Record<string, unknown>[]
      csv = rowsToCsv(['name', 'order_count', 'total_qty', 'total_revenue', 'avg_price'], rows)
      defaultName = 'item-performance-' + from + '-to-' + to
    } else if (type === 'expenses') {
      const rows = getAllExpenses(db, { from, to }) as Record<string, unknown>[]
      csv = rowsToCsv(['id', 'date', 'amount', 'payment_method', 'category', 'note'], rows)
      defaultName = 'expenses-' + from + '-to-' + to
    }

    if (!csv) {
      return { success: false, message: 'No data to export' }
    }

    const result = await dialog.showSaveDialog({
      title: 'Save CSV',
      defaultPath: join(app.getPath('documents'), defaultName + '.csv'),
      filters: [{ name: 'CSV File', extensions: ['csv'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'Export cancelled' }
    }

    try {
      writeFileSync(result.filePath, csv, 'utf-8')
      return { success: true, message: 'CSV exported successfully', path: result.filePath }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, message: 'Export failed: ' + errorMessage }
    }
  })

  // Import database from user-chosen file
  ipcMain.handle('sync:importDb', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Database Backup',
      filters: [
        { name: 'SQLite Database', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: 'Import cancelled' }
    }

    try {
      const sourcePath = result.filePaths[0]
      const destPath = join(app.getPath('userData'), 'restaurant.db')

      if (!existsSync(sourcePath)) {
        return { success: false, message: 'File not found' }
      }

      db.close()
      copyFileSync(sourcePath, destPath)
      return { success: true, message: 'Database imported successfully. Please restart the application.' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, message: 'Import failed: ' + errorMessage }
    }
  })

  ipcMain.handle('sync:connectDrive', async () => {
    return { success: false, message: 'Google Drive sync will be configured in Settings. Please add your OAuth credentials first.' }
  })

  ipcMain.handle('sync:syncNow', async () => {
    return { success: false, message: 'Google Drive is not connected. Please connect your account first.' }
  })

  ipcMain.handle('sync:getStatus', () => {
    return { connected: false, lastSyncTime: null }
  })
}
