import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIAssistant } from './AIAssistant'

const BADGE_SEEN_KEY = 'ai-assistant-badge-seen'

export function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewSuggestion, setHasNewSuggestion] = useState(() => {
    return !localStorage.getItem(BADGE_SEEN_KEY)
  })
  const [showPulse, setShowPulse] = useState(true)
  const keysPressed = useRef(new Set<string>())

  // Stop the pulse animation after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 10000)
    return () => clearTimeout(timer)
  }, [])

  const toggleOpen = useCallback((open: boolean) => {
    setIsOpen(open)
    if (open) {
      setShowPulse(false)
    }
  }, [])

  const handleSuggestionRead = useCallback(() => {
    setHasNewSuggestion(false)
    localStorage.setItem(BADGE_SEEN_KEY, Date.now().toString())
  }, [])

  // Wire A+I keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs/textareas
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      keysPressed.current.add(e.key.toLowerCase())

      if (keysPressed.current.has('a') && keysPressed.current.has('i')) {
        e.preventDefault()
        toggleOpen(!isOpen)
        keysPressed.current.clear()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isOpen, toggleOpen])

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => toggleOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl",
          isOpen && "scale-0 opacity-0"
        )}
        aria-label="Open AI Assistant (A+I)"
      >
        <Sparkles className="h-6 w-6" />
        
        {/* Notification Badge */}
        {hasNewSuggestion && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            1
          </span>
        )}
        
        {/* Pulse Animation — stops after 10s */}
        {showPulse && (
          <span className="absolute inset-0 animate-ping rounded-full bg-purple-400 opacity-75" />
        )}
      </button>

      {/* AI Assistant Panel */}
      <AIAssistant 
        isOpen={isOpen} 
        onClose={() => toggleOpen(false)}
        onSuggestionRead={handleSuggestionRead}
      />
    </>
  )
}
