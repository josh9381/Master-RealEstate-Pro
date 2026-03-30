import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

const MAX_TOASTS = 5

export interface Toast {
  id: string
  type: ToastType
  message: string
  description?: string
  duration?: number
  exiting?: boolean
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    set((state) => {
      // Deduplicate: skip if a toast with the same type+message already exists
      const isDuplicate = state.toasts.some(
        (t) => !t.exiting && t.type === toast.type && t.message === toast.message
      )
      if (isDuplicate) return state

      let toasts = [...state.toasts, newToast]
      // Enforce max limit — remove oldest (non-exiting) toasts beyond limit
      while (toasts.filter(t => !t.exiting).length > MAX_TOASTS) {
        const oldestIndex = toasts.findIndex(t => !t.exiting)
        if (oldestIndex === -1) break
        toasts[oldestIndex] = { ...toasts[oldestIndex], exiting: true }
        // Schedule removal of the exiting toast after animation
        const exitId = toasts[oldestIndex].id
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter(t => t.id !== exitId) }))
        }, 300)
      }
      return { toasts }
    })
    
    // Auto-remove after duration
    const duration = toast.duration || 5000
    setTimeout(() => {
      // Mark as exiting for slide-out animation, then remove
      set((state) => ({
        toasts: state.toasts.map(t => t.id === id ? { ...t, exiting: true } : t),
      }))
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, 300)
    }, duration)
  },
  
  removeToast: (id) => {
    // Mark as exiting, then remove after animation
    set((state) => ({
      toasts: state.toasts.map(t => t.id === id ? { ...t, exiting: true } : t),
    }))
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 300)
  },
  
  clearAll: () => set({ toasts: [] }),
}))
