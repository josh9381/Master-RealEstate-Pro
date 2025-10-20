import { useState } from 'react'
import { X, Sparkles, Send, RefreshCw, Edit3, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

interface AIEmailComposerProps {
  isOpen: boolean
  onClose: () => void
  leadName?: string
  leadEmail?: string
  context?: string
}

export function AIEmailComposer({ 
  isOpen, 
  onClose, 
  leadName = 'John Doe',
  leadEmail = 'john@example.com',
}: AIEmailComposerProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailData, setEmailData] = useState({
    subject: `Following up on our conversation, ${leadName.split(' ')[0]}`,
    body: `Hi ${leadName.split(' ')[0]},

I wanted to follow up on our recent conversation about how our CRM platform can help streamline your sales process.

Based on what you shared about your current challenges with lead tracking and follow-up management, I think our AI-powered lead scoring and automated workflow features would be particularly valuable for your team.

I'd love to schedule a quick 15-minute demo to show you how other companies in your industry have increased their conversion rates by 35% on average.

Are you available for a brief call this week? I have openings on:
• Tuesday at 2:00 PM
• Wednesday at 10:00 AM
• Thursday at 3:30 PM

Looking forward to hearing from you!

Best regards,
Sarah Johnson
Senior Sales Consultant`,
  })

  const confidenceScore = 92

  if (!isOpen) return null

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      setEmailData({
        subject: `Quick question about your sales process, ${leadName.split(' ')[0]}`,
        body: `Hi ${leadName.split(' ')[0]},

I hope this email finds you well! I noticed your company has been growing rapidly, and I wanted to reach out personally.

Many companies at your stage struggle with managing leads efficiently across multiple channels. Our platform helps teams like yours:

✓ Automatically score and prioritize leads
✓ Never miss a follow-up with intelligent reminders
✓ Track all communications in one unified inbox

I'd love to show you a quick 10-minute demo. Would any of these times work for you?

• Tuesday, 2:00 PM EST
• Wednesday, 11:00 AM EST  
• Friday, 3:00 PM EST

Let me know what works best!

Best,
Sarah Johnson`,
      })
      setIsGenerating(false)
    }, 1500)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`${emailData.subject}\n\n${emailData.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = () => {
    // Simulate sending
    alert(`Email would be sent to ${leadEmail}`)
    onClose()
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
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">AI Confidence Score</span>
            </div>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              {confidenceScore}% Effective
            </Badge>
          </div>

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
            <Button onClick={handleSend} className="bg-gradient-to-r from-purple-600 to-blue-600">
              <Send className="mr-2 h-4 w-4" />
              Send Email
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
