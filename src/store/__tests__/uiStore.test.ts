import { useUIStore } from '@/store/uiStore'
import { act } from '@testing-library/react'

describe('uiStore', () => {
  beforeEach(() => {
    // Reset to defaults
    act(() => {
      useUIStore.setState({ sidebarOpen: true, theme: 'light' })
    })
  })

  it('starts with sidebar open', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('toggles sidebar', () => {
    act(() => { useUIStore.getState().toggleSidebar() })
    expect(useUIStore.getState().sidebarOpen).toBe(false)
    act(() => { useUIStore.getState().toggleSidebar() })
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('sets sidebar open/closed explicitly', () => {
    act(() => { useUIStore.getState().setSidebarOpen(false) })
    expect(useUIStore.getState().sidebarOpen).toBe(false)
    act(() => { useUIStore.getState().setSidebarOpen(true) })
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('toggles theme between light and dark', () => {
    expect(useUIStore.getState().theme).toBe('light')
    act(() => { useUIStore.getState().toggleTheme() })
    expect(useUIStore.getState().theme).toBe('dark')
    act(() => { useUIStore.getState().toggleTheme() })
    expect(useUIStore.getState().theme).toBe('light')
  })

  it('sets theme explicitly', () => {
    act(() => { useUIStore.getState().setTheme('dark') })
    expect(useUIStore.getState().theme).toBe('dark')
  })

  it('updates document.documentElement class on theme change', () => {
    act(() => { useUIStore.getState().setTheme('dark') })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    act(() => { useUIStore.getState().setTheme('light') })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
