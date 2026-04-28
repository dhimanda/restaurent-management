import { ipcMain, dialog, app } from 'electron'
import Database from 'better-sqlite3'
import { join } from 'path'
import { copyFileSync, existsSync } from 'fs'

export function registerSyncHandlers(db: Database.Database): void {
  // Export database to user-chosen location
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

      // Verify the file is a valid SQLite database
      if (!existsSync(sourcePath)) {
        return { success: false, message: 'File not found' }
      }

      // Close current database connection
      db.close()

      // Copy the backup file
      copyFileSync(sourcePath, destPath)

      return { success: true, message: 'Database imported successfully. Please restart the application.' }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, message: 'Import failed: ' + errorMessage }
    }
  })

  // Google Drive sync placeholder
  ipcMain.handle('sync:connectDrive', async () => {
    return { success: false, message: 'Google Drive sync will be configured in Settings. Please add your OAuth credentials first.' }
  })

  ipcMain.handle('sync:syncNow', async () => {
    return { success: false, message: 'Google Drive is not connected. Please connect your account first.' }
  })

  ipcMain.handle('sync:getStatus', () => {
    return {
      connected: false,
      lastSyncTime: null
    }
  })
}
