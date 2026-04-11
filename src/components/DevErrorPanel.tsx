/**
 * DevErrorPanel — Floating error indicator for development
 * 
 * Shows a small badge in the bottom-right corner with the count of
 * captured errors. Click to expand and see error details.
 * Only renders in development mode.
 */
import { useState, useEffect, useCallback } from 'react'
import { getDevErrors, clearDevErrors } from '@/lib/devErrorMonitor'

export function DevErrorPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [errors, setErrors] = useState(getDevErrors())

  const refresh = useCallback(() => {
    setErrors(getDevErrors())
  }, [])

  useEffect(() => {
    // Poll for new errors every 2s
    const interval = setInterval(refresh, 2000)
    return () => clearInterval(interval)
  }, [refresh])

  // Only show in dev mode
  if (!import.meta.env.DEV) return null
  
  const errorCount = errors.length
  const totalOccurrences = errors.reduce((sum, e) => sum + e.count, 0)

  if (errorCount === 0 && !isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-mono text-xs">
      {/* Badge */}
      {!isOpen && errorCount > 0 && (
        <button
          onClick={() => { refresh(); setIsOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:bg-destructive/90 transition-colors animate-pulse"
          title={`${errorCount} unique errors (${totalOccurrences} total)`}
        >
          <span className="text-sm">⚠</span>
          <span className="font-bold">{errorCount}</span>
          <span className="text-destructive-foreground/70">errors</span>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="w-[480px] max-h-[70vh] bg-popover text-popover-foreground rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-destructive text-sm">⚠</span>
              <span className="font-semibold text-sm">Dev Errors ({errorCount})</span>
              <span className="text-muted-foreground">({totalOccurrences} total)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { clearDevErrors(); refresh() }}
                className="px-2 py-0.5 text-xs bg-muted hover:bg-accent rounded transition-colors"
              >
                Clear
              </button>
              <button
                onClick={refresh}
                className="px-2 py-0.5 text-xs bg-muted hover:bg-accent rounded transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 text-xs bg-muted hover:bg-accent rounded transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Error List */}
          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {errors.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No errors captured</div>
            ) : (
              errors.map((err) => (
                <ErrorItem key={err.id} error={err} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ErrorItem({ error }: { error: ReturnType<typeof getDevErrors>[0] }) {
  const [expanded, setExpanded] = useState(false)

  const typeColors: Record<string, string> = {
    api: 'text-warning bg-warning/10',
    runtime: 'text-destructive bg-destructive/10',
    promise: 'text-warning bg-warning/10',
    'react-query': 'text-purple-400 bg-purple-900/30',
    network: 'text-info bg-info/10',
  }

  const colorClass = typeColors[error.type] || 'text-muted-foreground bg-muted'

  return (
    <div className="px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer rounded" role="button" tabIndex={0} onClick={() => setExpanded(!expanded)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}>
      <div className="flex items-start gap-2">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${colorClass}`}>
          {error.type}
        </span>
        <div className="flex-1 min-w-0">
          <p className="break-words leading-tight">{error.message}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span>{new Date(error.timestamp).toLocaleTimeString()}</span>
            {error.count > 1 && <span className="text-warning">×{error.count}</span>}
            {error.status && <span>HTTP {error.status}</span>}
          </div>
        </div>
      </div>

      {expanded && error.stack && (
        <pre className="mt-2 p-2 bg-muted rounded text-[10px] text-muted-foreground overflow-x-auto max-h-32 whitespace-pre-wrap">
          {error.stack}
        </pre>
      )}
    </div>
  )
}
