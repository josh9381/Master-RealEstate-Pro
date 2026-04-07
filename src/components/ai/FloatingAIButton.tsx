import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIAssistant } from './AIAssistant'

const BADGE_SEEN_KEY = 'ai-assistant-badge-seen'

export function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewSuggestion, setHasNewSuggestion] = useState(() => {
    try {
      return !localStorage.getItem(BADGE_SEEN_KEY)
    } catch {
      return true
    }
  })
  const [showPulse, setShowPulse] = useState(true)
  const shortcutCooldown = useRef(false)

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

  // Wire Alt+A keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.key.toLowerCase() !== 'a') return

      // Don't trigger when typing in inputs/textareas
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      e.preventDefault()
      if (!shortcutCooldown.current) {
        shortcutCooldown.current = true
        toggleOpen(!isOpen)
        setTimeout(() => { shortcutCooldown.current = false }, 300)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, toggleOpen])

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => toggleOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-110 hover:shadow-xl hover:shadow-purple-500/40",
          isOpen && "scale-0 opacity-0"
        )}
        aria-label="Open AI Assistant (Alt+A)"
      >
        <Sparkles className="h-6 w-6" />
        
        {/* Notification Badge */}
        {hasNewSuggestion && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-[10px] font-bold shadow-sm shadow-rose-500/30 ring-2 ring-background">
            1
          </span>
        )}
        
        {/* Glow Ring Animation — stops after 10s */}
        {showPulse && (
          <span className="absolute inset-0 animate-ping rounded-2xl bg-purple-400/50" />
        )}

        {/* Subtle ambient glow */}
        <span className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 blur-lg opacity-40" />
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
