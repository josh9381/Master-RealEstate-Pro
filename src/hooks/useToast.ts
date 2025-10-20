import { useToastStore, type ToastType } from '@/store/toastStore'

export function useToast() {
  const { addToast } = useToastStore()

  return {
    toast: {
      success: (message: string, description?: string) => {
        addToast({ type: 'success', message, description })
      },
      error: (message: string, description?: string) => {
        addToast({ type: 'error', message, description })
      },
      warning: (message: string, description?: string) => {
        addToast({ type: 'warning', message, description })
      },
      info: (message: string, description?: string) => {
        addToast({ type: 'info', message, description })
      },
    },
  }
}
