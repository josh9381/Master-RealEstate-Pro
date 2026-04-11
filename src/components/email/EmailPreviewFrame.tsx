import { useState } from 'react'
import { Monitor, Tablet, Smartphone, X, Maximize2, Minimize2 } from 'lucide-react'

// ─── Device Presets ─────────────────────────────────────────────

const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: 600, description: '600px (standard email)' },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: 480, description: '480px' },
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: 320, description: '320px' },
] as const

type DeviceId = typeof DEVICES[number]['id']

// ─── Props ──────────────────────────────────────────────────────

interface EmailPreviewFrameProps {
  /** Raw HTML content to preview */
  html: string
  /** Subject line to show above the preview */
  subject?: string
  /** Preview text / preheader */
  previewText?: string
  /** Whether the preview is shown as a standalone modal */
  isModal?: boolean
  /** Called when modal close is requested */
  onClose?: () => void
  /** Additional CSS class */
  className?: string
}

// ─── Component ──────────────────────────────────────────────────

export function EmailPreviewFrame({
  html,
  subject,
  previewText,
  isModal = false,
  onClose,
  className = '',
}: EmailPreviewFrameProps) {
  const [device, setDevice] = useState<DeviceId>('desktop')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const activeDevice = DEVICES.find(d => d.id === device)!
  const frameWidth = activeDevice.width

  const wrapperClass = isModal
    ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
    : className

  const containerClass = isModal
    ? `bg-background rounded-lg w-full ${isFullscreen ? 'max-w-[100vw] h-[100vh]' : 'max-w-4xl max-h-[90vh]'} flex flex-col overflow-hidden`
    : 'border rounded-lg flex flex-col overflow-hidden'

  return (
    <div className={wrapperClass} onClick={isModal ? onClose : undefined}>
      <div className={containerClass} onClick={e => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-1">
            {DEVICES.map(d => {
              const Icon = d.icon
              return (
                <button
                  key={d.id}
                  onClick={() => setDevice(d.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    device === d.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent transition-colors text-muted-foreground'
                  }`}
                  title={d.description}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {d.label}
                </button>
              )
            })}
            <span className="text-[10px] text-muted-foreground ml-2">{activeDevice.description}</span>
          </div>
          <div className="flex items-center gap-1">
            {isModal && (
              <>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button onClick={onClose} className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground" title="Close">
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Email header simulation */}
        {(subject || previewText) && (
          <div className="px-4 py-3 border-b bg-card flex-shrink-0">
            <div className="max-w-[600px] mx-auto">
              {subject && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">Subject:</span>
                  <span className="text-sm font-semibold">{subject}</span>
                </div>
              )}
              {previewText && (
                <div className="flex items-start gap-2 mt-1">
                  <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">Preview:</span>
                  <span className="text-xs text-muted-foreground">{previewText}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview frame */}
        <div className="flex-1 overflow-auto bg-muted p-6">
          <div
            className="mx-auto transition-all duration-300 ease-in-out"
            style={{ maxWidth: `${frameWidth}px` }}
          >
            {html ? (
              <iframe
                srcDoc={buildIframeSrcDoc(html)}
                className="w-full bg-card rounded shadow-sm border-0"
                style={{
                  width: `${frameWidth}px`,
                  minHeight: '500px',
                  height: 'auto',
                }}
                title="Email preview"
                sandbox="allow-same-origin"
                onLoad={(e) => {
                  // Auto-resize iframe to content height
                  const iframe = e.target as HTMLIFrameElement
                  try {
                    const body = iframe.contentDocument?.body
                    if (body) {
                      iframe.style.height = `${body.scrollHeight + 20}px`
                    }
                  } catch {
                    // Cross-origin restriction — keep default height
                  }
                }}
              />
            ) : (
              <div className="bg-card rounded shadow-sm p-12 text-center text-muted-foreground">
                <p className="text-sm">No email content to preview</p>
                <p className="text-xs mt-1">Build your email using the block editor first</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20 flex-shrink-0">
          <span>Viewing as: {activeDevice.label} ({activeDevice.width}px)</span>
          <span>Compiled with MJML for cross-client compatibility</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Build a self-contained HTML document for the iframe.
 * Ensures the preview is fully isolated from the parent page's styles.
 */
function buildIframeSrcDoc(html: string): string {
  // If the HTML is already a full document (starts with <!doctype or <html), use as-is
  if (/^<!doctype|^<html/i.test(html.trim())) {
    return html
  }

  // Otherwise, wrap in a basic HTML document
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`
}

export default EmailPreviewFrame
