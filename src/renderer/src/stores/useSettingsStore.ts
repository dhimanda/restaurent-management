import { create } from 'zustand'

interface SettingsState {
  settings: Record<string, string>
  isLoading: boolean
  isSaving: boolean
  fetchSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
  updateMultipleSettings: (settings: Record<string, string>) => Promise<void>
  getSetting: (key: string, defaultValue?: string) => string
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  isLoading: false,
  isSaving: false,

  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api.settings.getAll()
      set({ settings, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      set({ isLoading: false })
    }
  },

  updateSetting: async (key: string, value: string) => {
    set({ isSaving: true })
    try {
      await window.api.settings.set(key, value)
      const current = get().settings
      set({ settings: { ...current, [key]: value }, isSaving: false })
    } catch (error) {
      console.error('Failed to update setting:', error)
      set({ isSaving: false })
    }
  },

  updateMultipleSettings: async (settings: Record<string, string>) => {
    set({ isSaving: true })
    try {
      await window.api.settings.setMultiple(settings)
      const current = get().settings
      set({ settings: { ...current, ...settings }, isSaving: false })
    } catch (error) {
      console.error('Failed to update settings:', error)
      set({ isSaving: false })
    }
  },

  getSetting: (key: string, defaultValue: string = '') => {
    return get().settings[key] || defaultValue
  }
}))
