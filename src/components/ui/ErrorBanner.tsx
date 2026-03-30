import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'

interface ErrorBannerProps {
  message: string
  retry?: () => void
  className?: string
  dismissible?: boolean
}

/**
 * ErrorBanner — displays API / data-fetch errors inline.
 * Use this whenever a useQuery or mutation fails and the user needs to know.
 *
 * Usage:
 *   if (isError) return <ErrorBanner message="Failed to load leads" retry={refetch} />
 */
export function ErrorBanner({ message, retry, className = '', dismissible = true }: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 ${className}`}
      role="alert"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
      <span className="flex-1">{message}</span>
      {retry && (
        <button
          onClick={retry}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-0.5 text-red-400 hover:text-red-600 dark:hover:text-red-200"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
