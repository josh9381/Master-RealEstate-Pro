import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIAssistant } from './AIAssistant'

export function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewSuggestion, setHasNewSuggestion] = useState(true)

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl",
          isOpen && "scale-0 opacity-0"
        )}
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-6 w-6" />
        
        {/* Notification Badge */}
        {hasNewSuggestion && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            1
          </span>
        )}
        
        {/* Pulse Animation */}
        <span className="absolute inset-0 animate-ping rounded-full bg-purple-400 opacity-75" />
      </button>

      {/* AI Assistant Panel */}
      <AIAssistant 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onSuggestionRead={() => setHasNewSuggestion(false)}
      />
    </>
  )
}
