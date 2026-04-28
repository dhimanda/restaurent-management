import { ipcMain } from 'electron'
import Database from 'better-sqlite3'
import {
  getAllMenuItems,
  getMenuItemsByCategory,
  getAvailableMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  getAllCategories,
  createCategory,
  MenuItemInput
} from '../database/menu-queries'

export function registerMenuHandlers(db: Database.Database): void {
  ipcMain.handle('menu:getAll', () => {
    return getAllMenuItems(db)
  })

  ipcMain.handle('menu:getByCategory', (_event, categoryId: number) => {
    return getMenuItemsByCategory(db, categoryId)
  })

  ipcMain.handle('menu:getAvailable', () => {
    return getAvailableMenuItems(db)
  })

  ipcMain.handle('menu:create', (_event, item: MenuItemInput) => {
    return createMenuItem(db, item)
  })

  ipcMain.handle('menu:update', (_event, id: number, item: Partial<MenuItemInput>) => {
    return updateMenuItem(db, id, item)
  })

  ipcMain.handle('menu:delete', (_event, id: number) => {
    return deleteMenuItem(db, id)
  })

  ipcMain.handle('menu:toggleAvailability', (_event, id: number) => {
    return toggleMenuItemAvailability(db, id)
  })

  ipcMain.handle('categories:getAll', () => {
    return getAllCategories(db)
  })

  ipcMain.handle('categories:create', (_event, name: string) => {
    return createCategory(db, name)
  })
}
