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
      className={`flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-destructive/20 dark:bg-destructive/10 dark:text-destructive ${className}`}
      role="alert"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-destructive" />
      <span className="flex-1">{message}</span>
      {retry && (
        <button
          onClick={retry}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 dark:text-destructive dark:hover:bg-destructive/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-0.5 text-destructive/70 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 dark:hover:text-destructive"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
