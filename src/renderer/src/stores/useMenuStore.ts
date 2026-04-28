import { create } from 'zustand'
import { MenuItem, MenuItemInput, Category } from '../types/menu'

interface MenuState {
  items: MenuItem[]
  categories: Category[]
  activeCategory: number | null
  searchQuery: string
  isLoading: boolean
  editingItem: MenuItem | null
  isFormOpen: boolean
  fetchItems: () => Promise<void>
  fetchCategories: () => Promise<void>
  createItem: (item: MenuItemInput) => Promise<void>
  updateItem: (id: number, item: Partial<MenuItemInput>) => Promise<void>
  deleteItem: (id: number) => Promise<void>
  toggleAvailability: (id: number) => Promise<void>
  setActiveCategory: (categoryId: number | null) => void
  setSearchQuery: (query: string) => void
  setEditingItem: (item: MenuItem | null) => void
  setFormOpen: (open: boolean) => void
  getFilteredItems: () => MenuItem[]
}

export const useMenuStore = create<MenuState>((set, get) => ({
  items: [],
  categories: [],
  activeCategory: null,
  searchQuery: '',
  isLoading: false,
  editingItem: null,
  isFormOpen: false,

  fetchItems: async () => {
    set({ isLoading: true })
    try {
      const items = await window.api.menu.getAll()
      set({ items, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch menu items:', error)
      set({ isLoading: false })
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await window.api.categories.getAll()
      set({ categories })
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  },

  createItem: async (item: MenuItemInput) => {
    try {
      await window.api.menu.create(item)
      await get().fetchItems()
    } catch (error) {
      console.error('Failed to create menu item:', error)
    }
  },

  updateItem: async (id: number, item: Partial<MenuItemInput>) => {
    try {
      await window.api.menu.update(id, item)
      await get().fetchItems()
    } catch (error) {
      console.error('Failed to update menu item:', error)
    }
  },

  deleteItem: async (id: number) => {
    try {
      await window.api.menu.delete(id)
      await get().fetchItems()
    } catch (error) {
      console.error('Failed to delete menu item:', error)
    }
  },

  toggleAvailability: async (id: number) => {
    try {
      await window.api.menu.toggleAvailability(id)
      await get().fetchItems()
    } catch (error) {
      console.error('Failed to toggle availability:', error)
    }
  },

  setActiveCategory: (categoryId: number | null) => {
    set({ activeCategory: categoryId })
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setEditingItem: (item: MenuItem | null) => {
    set({ editingItem: item })
  },

  setFormOpen: (open: boolean) => {
    set({ isFormOpen: open })
    if (!open) {
      set({ editingItem: null })
    }
  },

  getFilteredItems: () => {
    const state = get()
    let filtered = state.items

    if (state.activeCategory !== null) {
      filtered = filtered.filter(item => item.category_id === state.activeCategory)
    }

    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.category_name && item.category_name.toLowerCase().includes(query)) ||
        (item.tags && item.tags.toLowerCase().includes(query))
      )
    }

    return filtered
  }
}))
