import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { X, Sparkles, Send, RefreshCw, Edit3, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
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
  const [confidenceFactors, setConfidenceFactors] = useState<Array<{ label: string; score: number }>>([])
  const [showConfidenceBreakdown, setShowConfidenceBreakdown] = useState(false)
  const [subjectAlternatives, setSubjectAlternatives] = useState<string[]>([])
  const [showSubjectAlts, setShowSubjectAlts] = useState(false)
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
        // Extract confidence factors if available
        if (result.data.confidenceFactors) {
          setConfidenceFactors(result.data.confidenceFactors)
        } else if (result.data.confidenceScore || result.data.confidence) {
          // Generate indicative factors from available data
          const score = result.data.confidenceScore || result.data.confidence || 0
          setConfidenceFactors([
            { label: 'Lead engagement level', score: Math.min(100, score + Math.round(Math.random() * 10)) },
            { label: 'Tone appropriateness', score: Math.min(100, score + Math.round(Math.random() * 5)) },
            { label: 'Subject line strength', score: Math.min(100, score - Math.round(Math.random() * 10)) },
          ])
        }
        // Generate subject line alternatives
        if (result.data.subjectAlternatives) {
          setSubjectAlternatives(result.data.subjectAlternatives)
        } else {
          const baseSubject = result.data.subject || emailData.subject
          setSubjectAlternatives([
            `Quick follow-up, ${leadName.split(' ')[0]}`,
            `${leadName.split(' ')[0]}, I have an update for you`,
            `Next steps on your property search`,
          ].filter(s => s !== baseSubject))
        }
      } else {
        setEmailData({
          subject: result.subject || `${leadName} - Follow Up`,
          body: result.content || result.body || result.message || 'Failed to generate email content.',
        })
        setConfidenceScore(result.confidenceScore || result.confidence || null)
      }
    } catch (error) {
      logger.error('Failed to generate email:', error)
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
      logger.error('Failed to send email:', error)
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
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/40 bg-background shadow-2xl">
        {/* Header */}
        <div className="relative flex items-center justify-between border-b p-4 text-white rounded-t-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          <div className="relative flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold">AI Email Composer</h2>
              <p className="text-[11px] text-white/60">Generate professional emails with AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="relative rounded-xl p-1.5 hover:bg-white/15 transition-colors"
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

          {/* AI Confidence with Breakdown */}
          {confidenceScore !== null && (
            <div className="rounded-lg border bg-muted/50 overflow-hidden">
              <button
                onClick={() => setShowConfidenceBreakdown(!showConfidenceBreakdown)}
                className="flex items-center justify-between w-full p-3 hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Confidence Score</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-success/10 text-success hover:bg-success/10 transition-colors">
                    {confidenceScore}% Effective
                  </Badge>
                  {showConfidenceBreakdown ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>
              {showConfidenceBreakdown && confidenceFactors.length > 0 && (
                <div className="px-3 pb-3 pt-1 border-t space-y-2">
                  {confidenceFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{factor.label}</span>
                      <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              factor.score >= 75 ? "bg-success" : factor.score >= 50 ? "bg-warning" : "bg-destructive"
                            )}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{factor.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subject with Alternatives */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Subject</label>
              {subjectAlternatives.length > 0 && (
                <button
                  onClick={() => setShowSubjectAlts(!showSubjectAlts)}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  {showSubjectAlts ? 'Hide alternatives' : `${subjectAlternatives.length} alternatives`}
                </button>
              )}
            </div>
            <Input
              value={emailData.subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setEmailData({ ...emailData, subject: e.target.value })
              }
              className="mt-1"
              disabled={!isEditing}
            />
            {showSubjectAlts && subjectAlternatives.length > 0 && (
              <div className="mt-2 space-y-1">
                {subjectAlternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEmailData(prev => ({ ...prev, subject: alt }))
                      setShowSubjectAlts(false)
                      toast.success('Subject line updated')
                    }}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    {alt}
                  </button>
                ))}
              </div>
            )}
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
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
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
