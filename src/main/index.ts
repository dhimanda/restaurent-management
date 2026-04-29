import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './database/connection'
import { registerMenuHandlers } from './ipc/menu-handlers'
import { registerOrderHandlers } from './ipc/order-handlers'
import { registerReportHandlers } from './ipc/report-handlers'
import { registerSettingsHandlers } from './ipc/settings-handlers'
import { registerSyncHandlers } from './ipc/sync-handlers'
import { registerPrintHandlers } from './ipc/print-handlers'
import { registerExpenseHandlers } from './ipc/expense-handlers'
import { registerFundHandlers } from './ipc/fund-handlers'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    title: 'Restaurant Manager',
    backgroundColor: '#0f1117',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.restaurant.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  const db = initDatabase()

  // Register all IPC handlers
  registerMenuHandlers(db)
  registerOrderHandlers(db)
  registerReportHandlers(db)
  registerSettingsHandlers(db)
  registerSyncHandlers(db)
  registerPrintHandlers(db, () => mainWindow)
  registerExpenseHandlers(db)
  registerFundHandlers(db)

  // Image picker handler
  ipcMain.handle('menu:pickImage', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
