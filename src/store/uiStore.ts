import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          document.documentElement.classList.toggle('dark', newTheme === 'dark')
          return { theme: newTheme }
        }),
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },
    }),
    {
      name: 'ui-preferences',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen, theme: state.theme }),
      onRehydrateStorage: () => (rehydratedState, error) => {
        if (error) {
          // If stored state is corrupted, fall back to system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          document.documentElement.classList.toggle('dark', prefersDark)
          return
        }
        if (rehydratedState) {
          document.documentElement.classList.toggle('dark', rehydratedState.theme === 'dark')
        } else {
          // No stored preference — use system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          document.documentElement.classList.toggle('dark', prefersDark)
        }
      },
    }
  )
)
