import { useToastStore } from '@/store/toastStore'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { Button } from './Button'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'bg-success/10 border-success/30 text-success dark:bg-success/10 dark:border-success/20 dark:text-success',
  error: 'bg-destructive/10 border-destructive/30 text-destructive dark:bg-destructive/10 dark:border-destructive/20 dark:text-destructive',
  warning: 'bg-warning/10 border-warning/30 text-warning dark:bg-warning/10 dark:border-warning/20 dark:text-warning',
  info: 'bg-info/10 border-info/30 text-info dark:bg-info/10 dark:border-info/20 dark:text-info',
}

const iconColors = {
  success: 'text-success',
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div role="status" aria-live="polite" aria-atomic="false" className="fixed bottom-24 right-4 z-[60] flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 ${
              toast.exiting
                ? 'opacity-0 translate-x-full'
                : 'animate-in slide-in-from-right'
            } ${colors[toast.type]}`}
          >
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColors[toast.type]}`} />
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{toast.message}</p>
              {toast.description && (
                <p className="text-sm opacity-90 mt-1">{toast.description}</p>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2 -mt-1"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
