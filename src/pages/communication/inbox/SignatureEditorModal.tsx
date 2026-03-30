import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface SignatureEditorModalProps {
  editingSignature: string
  autoAppendSignature: boolean
  onSignatureChange: (signature: string) => void
  onAutoAppendChange: (autoAppend: boolean) => void
  onSave: () => void
  onClose: () => void
}

export const SignatureEditorModal = ({
  editingSignature,
  autoAppendSignature,
  onSignatureChange,
  onAutoAppendChange,
  onSave,
  onClose,
}: SignatureEditorModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="signature-dialog-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-2xl mx-4" tabIndex={-1}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="signature-dialog-title" className="text-lg font-semibold">Email Signature Editor</h3>
              <Button size="sm" variant="ghost" onClick={onClose}>×</Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Signature</label>
              <textarea
                value={editingSignature}
                onChange={(e) => onSignatureChange(e.target.value)}
                rows={6}
                className="w-full p-3 border rounded-md resize-none font-mono text-sm"
                placeholder="Enter your email signature..."
              />
              <p className="text-xs text-muted-foreground">
                Tip: Use line breaks to format your signature
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoAppend"
                checked={autoAppendSignature}
                onChange={(e) => onAutoAppendChange(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoAppend" className="text-sm cursor-pointer">
                Automatically append signature to email replies
              </label>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Preview</h4>
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{editingSignature}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={onSave}>Save Signature</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
