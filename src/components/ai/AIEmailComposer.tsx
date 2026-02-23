import { useState, useEffect } from 'react'
import { X, Sparkles, Send, RefreshCw, Edit3, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { aiApi, messagesApi } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { getAIUnavailableMessage } from '@/hooks/useAIAvailability'

interface AIEmailComposerProps {
  isOpen: boolean
  onClose: () => void
  leadName?: string
  leadEmail?: string
  leadId?: string
  context?: string
}

export function AIEmailComposer({ 
  isOpen, 
  onClose, 
  leadName = '',
  leadEmail = '',
  leadId,
}: AIEmailComposerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null)
  const { toast } = useToast()
  const [emailData, setEmailData] = useState({
    subject: `Following up on our conversation, ${leadName.split(' ')[0]}`,
    body: '',
  })

  // Auto-generate email on open
  useEffect(() => {
    if (isOpen && !emailData.body) {
      handleGenerate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await aiApi.composeEmail({
        leadName,
        leadEmail,
        tone: 'professional',
        purpose: 'follow-up',
        context: `Following up with ${leadName}`,
      })
      if (result.success && result.data) {
        setEmailData({
          subject: result.data.subject || `${leadName} - Follow Up`,
          body: result.data.content || result.data.body || result.data.message || '',
        })
        setConfidenceScore(result.data.confidenceScore || result.data.confidence || null)
      } else {
        setEmailData({
          subject: result.subject || `${leadName} - Follow Up`,
          body: result.content || result.body || result.message || 'Failed to generate email content.',
        })
        setConfidenceScore(result.confidenceScore || result.confidence || null)
      }
    } catch (error) {
      console.error('Failed to generate email:', error)
      const aiMsg = getAIUnavailableMessage(error)
      if (aiMsg) {
        toast.error(aiMsg)
        setEmailData(prev => ({
          ...prev,
          body: prev.body || 'AI is not configured. Please add your OpenAI API key in Settings.',
        }))
      } else {
        toast.error('Failed to generate email. Please try again.')
        setEmailData(prev => ({
          ...prev,
          body: prev.body || 'Failed to generate email. Please try again.',
        }))
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`${emailData.subject}\n\n${emailData.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = async () => {
    if (!leadEmail) {
      toast.error('No email address provided')
      return
    }
    setIsSending(true)
    try {
      const result = await messagesApi.sendEmail({
        to: leadEmail,
        subject: emailData.subject,
        body: emailData.body,
        leadId,
      })
      if (result.success) {
        toast.success(`Email sent to ${leadName || leadEmail}`)
        onClose()
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      toast.error('Failed to send email. Please try again.')
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
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <h2 className="font-semibold">AI Email Composer</h2>
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
          <div>
            <label className="text-sm font-medium">To</label>
            <div className="mt-1 flex items-center space-x-2">
              <Input value={leadEmail} readOnly className="flex-1" />
              <Badge variant="secondary">{leadName}</Badge>
            </div>
          </div>

          {/* AI Confidence */}
          {confidenceScore !== null && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">AI Confidence Score</span>
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                {confidenceScore}% Effective
              </Badge>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={emailData.subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setEmailData({ ...emailData, subject: e.target.value })
              }
              className="mt-1"
              disabled={!isEditing}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={emailData.body}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                setEmailData({ ...emailData, body: e.target.value })
              }
              disabled={!isEditing}
              className="mt-1 min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Loading State */}
          {isGenerating && (
            <div className="flex items-center justify-center space-x-2 rounded-lg border border-dashed bg-muted/30 p-4">
              <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
              <span className="text-sm text-muted-foreground">
                AI is crafting the perfect email...
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-muted/30 p-4 rounded-b-lg">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              {isEditing ? 'Lock' : 'Edit'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending} className="bg-gradient-to-r from-purple-600 to-blue-600">
              <Send className="mr-2 h-4 w-4" />
              {isSending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
