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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-colors animate-pulse"
          title={`${errorCount} unique errors (${totalOccurrences} total)`}
        >
          <span className="text-sm">⚠</span>
          <span className="font-bold">{errorCount}</span>
          <span className="text-red-200">errors</span>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="w-[480px] max-h-[70vh] bg-gray-900 text-gray-100 rounded-lg shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm">⚠</span>
              <span className="font-semibold text-sm">Dev Errors ({errorCount})</span>
              <span className="text-gray-500">({totalOccurrences} total)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { clearDevErrors(); refresh() }}
                className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
              >
                Clear
              </button>
              <button
                onClick={refresh}
                className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
              >
                Refresh
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 text-xs bg-gray-700 hover:bg-gray-600 rounded"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Error List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-800">
            {errors.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No errors captured</div>
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
    api: 'text-yellow-400 bg-yellow-900/30',
    runtime: 'text-red-400 bg-red-900/30',
    promise: 'text-orange-400 bg-orange-900/30',
    'react-query': 'text-purple-400 bg-purple-900/30',
    network: 'text-blue-400 bg-blue-900/30',
  }

  const colorClass = typeColors[error.type] || 'text-gray-400 bg-gray-800'

  return (
    <div className="px-3 py-2 hover:bg-gray-800/50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-2">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${colorClass}`}>
          {error.type}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-gray-200 break-words leading-tight">{error.message}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
            <span>{new Date(error.timestamp).toLocaleTimeString()}</span>
            {error.count > 1 && <span className="text-orange-400">×{error.count}</span>}
            {error.status && <span>HTTP {error.status}</span>}
          </div>
        </div>
      </div>

      {expanded && error.stack && (
        <pre className="mt-2 p-2 bg-gray-950 rounded text-[10px] text-gray-400 overflow-x-auto max-h-32 whitespace-pre-wrap">
          {error.stack}
        </pre>
      )}
    </div>
  )
}
