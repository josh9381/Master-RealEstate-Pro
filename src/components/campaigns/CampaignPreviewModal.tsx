import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, DollarSign, Users, Mail, MessageSquare, Phone, CheckCircle } from 'lucide-react'

interface SampleRecipient {
  id: string
  name: string
  email?: string
  phone?: string
  status: string
  tags?: { id: string; name: string; color?: string }[]
}

interface CampaignPreviewData {
  campaignId: string
  campaignName: string
  campaignType: 'EMAIL' | 'SMS' | 'PHONE' | 'SOCIAL'
  recipientCount: number
  cost: {
    perRecipient: number
    total: number
    currency: string
  }
  statusBreakdown: Record<string, number>
  sampleRecipients: SampleRecipient[]
  messagePreview: {
    subject?: string
    body: string
  }
  warnings: string[]
}

interface CampaignPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  preview: CampaignPreviewData
  isLoading?: boolean
}

const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'destructive' => {
  switch (status.toUpperCase()) {
    case 'NEW':
      return 'default'
    case 'CONTACTED':
      return 'warning'
    case 'QUALIFIED':
    case 'WON':
      return 'success'
    case 'LOST':
      return 'destructive'
    default:
      return 'default'
  }
}

// TODO: Future use - helper function for campaign type icons
const _getCampaignIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case 'EMAIL':
      return Mail
    case 'SMS':
      return MessageSquare
    case 'PHONE':
      return Phone
    case 'SOCIAL':
      return Users
    default:
      return Mail
  }
}

export function CampaignPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  preview,
  isLoading = false
}: CampaignPreviewModalProps) {
  const hasWarnings = preview.warnings && preview.warnings.length > 0
  const isHighCost = preview.cost.total > 50
  const noRecipients = preview.recipientCount === 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>
              Campaign Preview: {preview.campaignName}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warnings Section */}
          {hasWarnings && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Warning{preview.warnings.length > 1 ? 's' : ''}
                  </h4>
                  <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                    {preview.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Recipients</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {preview.recipientCount.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {preview.campaignType === 'EMAIL' && 'Email recipients'}
                {preview.campaignType === 'SMS' && 'Phone numbers'}
                {preview.campaignType === 'PHONE' && 'Call recipients'}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium">Estimated Cost</span>
              </div>
              <p className={`text-2xl font-bold ${isHighCost ? 'text-red-600 dark:text-red-400' : 'text-green-900 dark:text-green-100'}`}>
                ${preview.cost.total.toFixed(2)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ${preview.cost.perRecipient.toFixed(3)} per {preview.campaignType.toLowerCase()}
              </p>
            </div>
          </div>

          {/* Status Breakdown */}
          {Object.keys(preview.statusBreakdown).length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Recipients by Status
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.statusBreakdown).map(([status, count]) => (
                  <Badge key={status} variant={getStatusBadgeVariant(status)} className="px-3 py-1">
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Message Preview */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              Message Preview
            </h4>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              {preview.messagePreview.subject && (
                <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subject:</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {preview.messagePreview.subject}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Message:</p>
                <div 
                  className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: preview.messagePreview.body }}
                />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Preview shown with first recipient's data
                </p>
              </div>
            </div>
          </div>

          {/* Sample Recipients */}
          {preview.sampleRecipients.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Sample Recipients (showing first {preview.sampleRecipients.length})
              </h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                          Contact
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {preview.sampleRecipients.map((recipient) => (
                        <tr key={recipient.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-2 text-gray-900 dark:text-white">
                            {recipient.name}
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                            {preview.campaignType === 'EMAIL' && recipient.email}
                            {preview.campaignType === 'SMS' && recipient.phone}
                            {preview.campaignType === 'PHONE' && recipient.phone}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant={getStatusBadgeVariant(recipient.status)}>
                              {recipient.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown Detail */}
          {preview.recipientCount > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-sm">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Cost Breakdown
              </h4>
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Unit cost ({preview.campaignType}):</span>
                  <span className="font-mono">${preview.cost.perRecipient.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recipients:</span>
                  <span className="font-mono">× {preview.recipientCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
                  <span>Total Cost:</span>
                  <span className="font-mono">${preview.cost.total.toFixed(2)} {preview.cost.currency}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading || noRecipients}
            className={isHighCost ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Sending...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm & Send Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
