import { useState } from 'react'
import { X, Sparkles, Send, RefreshCw, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { aiApi, messagesApi } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'

interface AISMSComposerProps {
  isOpen: boolean
  onClose: () => void
  leadName?: string
  leadPhone?: string
  leadId?: string
}

const smsTemplates = [
  {
    id: '1',
    tone: 'Professional',
    message: "Hi {{name}}, I wanted to follow up on our conversation. Do you have 10 minutes this week for a quick demo? Let me know what works for you!",
    chars: 140,
  },
  {
    id: '2',
    tone: 'Friendly',
    message: "Hey {{name}}! \uD83D\uDC4B Quick question - would you be interested in seeing how our platform could help your team? I can show you a quick 10-min demo. Available this week?",
    chars: 149,
  },
  {
    id: '3',
    tone: 'Brief',
    message: "Hi {{name}}, following up on our chat. Available for a 10min demo this week? Just reply with a good time. Thanks!",
    chars: 111,
  },
]

export function AISMSComposer({ 
  isOpen, 
  onClose, 
  leadName = '',
  leadPhone = '',
  leadId,
}: AISMSComposerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(smsTemplates[0])
  const [customMessage, setCustomMessage] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()

  if (!isOpen) return null

  const currentMessage = isCustom ? customMessage : selectedTemplate.message.replace('{{name}}', leadName)
  const charCount = currentMessage.length
  const segmentCount = Math.ceil(charCount / 160)

  const handleRegenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await aiApi.generateSMS({
        leadName,
        leadPhone,
        tone: selectedTemplate.tone.toLowerCase(),
        purpose: 'follow-up',
      })
      if (result.success && result.data) {
        const message = result.data.message || result.data.content || result.data.sms || ''
        setSelectedTemplate({
          id: Date.now().toString(),
          tone: selectedTemplate.tone,
          message,
          chars: message.length,
        })
      }
    } catch (error) {
      console.error('Failed to generate SMS:', error)
      const aiMsg = getAIUnavailableMessage(error)
      if (aiMsg) {
        toast.error(aiMsg)
      } else {
        toast.error('Failed to generate SMS. Please try again.')
      }
      // Keep existing template on failure
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSend = async () => {
    if (!leadPhone) {
      toast.error('No phone number provided')
      return
    }
    setIsSending(true)
    try {
      const result = await messagesApi.sendSMS({
        to: leadPhone,
        body: currentMessage,
        leadId,
      })
      if (result.success) {
        toast.success(`SMS sent to ${leadName || leadPhone}`)
        onClose()
      }
    } catch (error) {
      console.error('Failed to send SMS:', error)
      toast.error('Failed to send SMS. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <h2 className="font-semibold">AI SMS Composer</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Recipient */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{leadPhone}</span>
            </div>
            <Badge variant="secondary">{leadName}</Badge>
          </div>

          {/* Template Selection (if not custom) */}
          {!isCustom && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Choose AI-Generated Tone
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {smsTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        "rounded-lg border-2 p-3 text-sm font-medium transition-all",
                        selectedTemplate.id === template.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {template.tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loading State */}
              {isGenerating && (
                <div className="flex items-center justify-center space-x-2 rounded-lg border border-dashed bg-muted/30 p-3">
                  <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
                  <span className="text-sm text-muted-foreground">
                    Generating new message...
                  </span>
                </div>
              )}
            </>
          )}

          {/* Phone Preview */}
          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-[2.5rem] border-8 border-gray-800 bg-gray-900 p-3 shadow-xl">
              {/* Phone Notch */}
              <div className="mx-auto mb-3 h-6 w-32 rounded-full bg-gray-800" />
              
              {/* Screen */}
              <div className="rounded-2xl bg-gray-100 p-4 min-h-[300px] flex flex-col">
                {/* Time */}
                <div className="text-center text-xs text-gray-500 mb-4">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Message Bubble */}
                <div className="flex-1 flex items-end">
                  <div className="w-full">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-blue-500 px-4 py-2.5 text-white">
                      {isCustom ? (
                        <textarea
                          value={customMessage}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-blue-100"
                          rows={6}
                        />
                      ) : (
                        <p className="text-sm">{currentMessage}</p>
                      )}
                    </div>
                    <div className="mt-1 text-right">
                      <span className="text-xs text-gray-500">Delivered</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Character Count */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Character Count</span>
            </div>
            <div className="flex items-center space-x-3">
              <Badge 
                variant={charCount > 160 ? "destructive" : "secondary"}
                className={cn(
                  charCount > 160 && charCount <= 320 && "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                )}
              >
                {charCount} chars
              </Badge>
              <Badge variant="outline">
                {segmentCount} {segmentCount === 1 ? 'message' : 'messages'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-muted/30 p-4 rounded-b-lg">
          <div className="flex space-x-2">
            {!isCustom ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCustom(true)
                    setCustomMessage(currentMessage)
                  }}
                >
                  Customize
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustom(false)}
              >
                Use Templates
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending} className="bg-gradient-to-r from-green-600 to-emerald-600">
              <Send className="mr-2 h-4 w-4" />
              {isSending ? 'Sending...' : 'Send SMS'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
