import { useToastStore } from '@/store/toastStore'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const toastConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.2)',
    iconColor: '#10B981',
    bar: '#10B981',
    title: '#065F46',
    titleDark: '#34D399',
  },
  error: {
    icon: AlertCircle,
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.2)',
    iconColor: '#EF4444',
    bar: '#EF4444',
    title: '#7F1D1D',
    titleDark: '#F87171',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.2)',
    iconColor: '#F59E0B',
    bar: '#F59E0B',
    title: '#78350F',
    titleDark: '#FCD34D',
  },
  info: {
    icon: Info,
    bg: 'rgba(99, 102, 241, 0.08)',
    border: 'rgba(99, 102, 241, 0.2)',
    iconColor: '#6366F1',
    bar: '#6366F1',
    title: '#1E1B4B',
    titleDark: '#A5B4FC',
  },
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type]
          const Icon = config.icon

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto relative overflow-hidden rounded-xl shadow-xl"
              style={{
                background: 'hsl(var(--card))',
                border: `1px solid ${config.border}`,
                boxShadow: `0 10px 30px -5px rgb(0 0 0 / 0.15), 0 0 0 1px ${config.border}`,
              }}
            >
              {/* Color accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ background: config.bar }}
              />

              <div className="flex items-start gap-3 p-4 pl-5">
                {/* Icon */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                  style={{ background: config.bg }}
                >
                  <Icon className="h-4 w-4" style={{ color: config.iconColor }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="font-semibold text-sm text-foreground leading-tight">
                    {toast.message}
                  </p>
                  {toast.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {toast.description}
                    </p>
                  )}
                </div>

                {/* Close */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
