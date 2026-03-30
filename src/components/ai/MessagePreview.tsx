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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-primary">{getIcon()}</div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{getTitle()}</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
            {content.tone}
          </span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
            {content.purpose}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-3 mb-3">
        {type === 'email' && (
          <>
            <div className="mb-2">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Subject:</span>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{content.subject}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Body:</span>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1 whitespace-pre-wrap">
                {content.body}
              </p>
            </div>
          </>
        )}
        {type === 'sms' && (
          <div>
            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {content.message}
            </p>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {content.length}/{content.maxLength} characters
            </div>
          </div>
        )}
        {type === 'script' && (
          <div>
            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {content.content}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={onApply} size="sm" className="gap-2">
          <Send className="w-4 h-4" />
          Apply to Campaign
        </Button>
        <Button onClick={onEdit} variant="outline" size="sm" className="gap-2">
          <Edit className="w-4 h-4" />
          Edit
        </Button>
        <Button onClick={onCopy} variant="outline" size="sm" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy
        </Button>
      </div>
    </div>
  )
}
