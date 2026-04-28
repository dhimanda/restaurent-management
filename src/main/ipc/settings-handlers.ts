import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import { getAllSettings, setSetting, setMultipleSettings } from '../database/settings-queries'

export function registerSettingsHandlers(db: Database.Database): void {
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
}
