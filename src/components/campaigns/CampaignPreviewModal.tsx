import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, DollarSign, Users, CheckCircle } from 'lucide-react'
import DOMPurify from 'dompurify'
import type { CampaignPreviewData } from '@/types'
import { formatCurrency } from '@/lib/metricsCalculator'

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

export function CampaignPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  preview,
  isLoading = false
}: CampaignPreviewModalProps) {
  const hasWarnings = preview.warnings && preview.warnings.length > 0
  const isHighCost = (preview.cost?.total || 0) > 50
  const noRecipients = (preview.recipientCount || 0) === 0

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
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-warning mb-2">
                    Warning{(preview.warnings?.length || 0) > 1 ? 's' : ''}
                  </h4>
                  <ul className="space-y-1 text-sm text-warning/80">
                    {(preview.warnings || []).map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Recipients</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {(preview.recipientCount || 0).toLocaleString()}
              </p>
              <p className="text-xs text-primary mt-1">
                {preview.campaignType === 'EMAIL' && 'Email recipients'}
                {preview.campaignType === 'SMS' && 'Phone numbers'}
                {preview.campaignType === 'PHONE' && 'Call recipients'}
              </p>
            </div>

            <div className="bg-success/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-success mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-medium">Estimated Cost</span>
              </div>
              <p className={`text-2xl font-bold ${isHighCost ? 'text-destructive' : 'text-foreground'}`}>
                ${(preview.cost?.total || 0).toFixed(2)}
              </p>
              <p className="text-xs text-success mt-1">
                ${formatCurrency(preview.cost?.perRecipient || 0)} per {(preview.campaignType || '').toLowerCase()}
              </p>
            </div>
          </div>

          {/* Status Breakdown */}
          {Object.keys(preview.statusBreakdown || {}).length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-3">
                Recipients by Status
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.statusBreakdown || {}).map(([status, count]) => (
                  <Badge key={status} variant={getStatusBadgeVariant(status)} className="px-3 py-1">
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Message Preview */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">
              Message Preview
            </h4>
            <div className="border border-border rounded-lg p-4 bg-muted">
              {preview.messagePreview?.subject && (
                <div className="mb-3 pb-3 border-b border-border">
                  <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                  <p className="font-medium text-foreground">
                    {preview.messagePreview?.subject}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Message:</p>
                <div 
                  className="text-sm text-foreground whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview.messagePreview?.body || '') }}
                />
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground italic">
                  Preview shown with first recipient's data
                </p>
              </div>
            </div>
          </div>

          {/* Sample Recipients */}
          {(preview.sampleRecipients || []).length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-3">
                Sample Recipients (showing first {(preview.sampleRecipients || []).length})
              </h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                          Contact
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(preview.sampleRecipients || []).map((recipient, idx) => (
                        <tr key={recipient.id || recipient.email || idx} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-2 text-foreground">
                            {recipient.name}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {preview.campaignType === 'EMAIL' && recipient.email}
                            {preview.campaignType === 'SMS' && recipient.phone}
                            {preview.campaignType === 'PHONE' && recipient.phone}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant={getStatusBadgeVariant(recipient.status || 'Unknown')}>
                              {recipient.status || 'Unknown'}
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
          {(preview.recipientCount || 0) > 0 && (
            <div className="bg-muted rounded-lg p-4 text-sm">
              <h4 className="font-semibold text-foreground mb-2">
                Cost Breakdown
              </h4>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Unit cost ({preview.campaignType}):</span>
                  <span className="font-mono">${formatCurrency(preview.cost?.perRecipient || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recipients:</span>
                  <span className="font-mono">× {(preview.recipientCount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-semibold text-foreground">
                  <span>Total Cost:</span>
                  <span className="font-mono">${(preview.cost?.total || 0).toFixed(2)} {preview.cost?.currency}</span>
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
            className={isHighCost ? 'bg-destructive hover:bg-destructive/90 transition-colors' : ''}
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
