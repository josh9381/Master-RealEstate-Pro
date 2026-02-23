import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface HelpTooltipProps {
  /** The help text to display */
  text: string
  /** Optional size variant */
  size?: 'sm' | 'md'
  /** Position preference (defaults to bottom) */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * A small help icon that shows explanatory text on hover.
 * Uses pure CSS positioning — no tooltip library required.
 */
export function HelpTooltip({ text, size = 'sm', position = 'bottom' }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  // Close on outside click
  useEffect(() => {
    if (!isVisible) return
    const handleClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsVisible(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isVisible])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-flex" ref={tooltipRef}>
      <button
        type="button"
        className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        aria-label="Help"
      >
        <HelpCircle className={iconSize} />
      </button>
      {isVisible && (
        <div
          className={`absolute z-50 w-64 p-3 text-xs leading-relaxed text-popover-foreground bg-popover border rounded-lg shadow-lg ${positionClasses[position]}`}
          role="tooltip"
        >
          {text}
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-popover border rotate-45 ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-0 border-l-0'
                : position === 'bottom'
                ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-b-0 border-r-0'
                : position === 'left'
                ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-l-0 border-b-0'
                : 'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-r-0 border-t-0'
            }`}
          />
        </div>
      )}
    </div>
  )
}

export default HelpTooltip
