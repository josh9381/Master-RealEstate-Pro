import { Mail, MessageSquare, Phone, Copy, Send, Edit } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface MessagePreviewProps {
  type: 'email' | 'sms' | 'script'
  content: {
    subject?: string
    body?: string
    message?: string
    content?: string
    tone: string
    leadName: string
    purpose: string
    length?: number
    maxLength?: number
  }
  onApply: () => void
  onEdit: () => void
  onCopy: () => void
}

export function MessagePreview({
  type,
  content,
  onApply,
  onEdit,
  onCopy,
}: MessagePreviewProps) {
  const getIcon = () => {
    switch (type) {
      case 'email':
        return <Mail className="w-5 h-5" />
      case 'sms':
        return <MessageSquare className="w-5 h-5" />
      case 'script':
        return <Phone className="w-5 h-5" />
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'email':
        return 'Email Draft'
      case 'sms':
        return 'SMS Message'
      case 'script':
        return 'Call Script'
    }
  }

  return (
    <div className="bg-card text-card-foreground border border-border/60 rounded-xl shadow-sm p-4 my-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
            <span className="text-purple-600 dark:text-purple-400">{getIcon()}</span>
          </div>
          <h3 className="font-semibold text-foreground">{getTitle()}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full font-medium border border-purple-200/60 dark:border-purple-800/40">
            {content.tone}
          </span>
          <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-full">
            {content.purpose}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-muted/50 rounded-xl p-3.5 mb-3 border border-border/30">
        {type === 'email' && (
          <>
            <div className="mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Subject:</span>
              <p className="text-sm text-foreground mt-1">{content.subject}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Body:</span>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                {content.body}
              </p>
            </div>
          </>
        )}
        {type === 'sms' && (
          <div>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {content.message}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              {content.length}/{content.maxLength} characters
            </div>
          </div>
        )}
        {type === 'script' && (
          <div>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {content.content}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={onApply} size="sm" className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-sm shadow-purple-500/20">
          <Send className="w-3.5 h-3.5" />
          Apply to Campaign
        </Button>
        <Button onClick={onEdit} variant="outline" size="sm" className="gap-2 rounded-xl">
          <Edit className="w-3.5 h-3.5" />
          Edit
        </Button>
        <Button onClick={onCopy} variant="outline" size="sm" className="gap-2 rounded-xl">
          <Copy className="w-3.5 h-3.5" />
          Copy
        </Button>
      </div>
    </div>
  )
}
