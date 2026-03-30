import { logger } from '@/lib/logger'
import { Paperclip } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { messagesApi } from '@/lib/api'

interface AttachmentModalProps {
  onClose: () => void
  onFilesAdded: (files: File[]) => void
}

export const AttachmentModal = ({
  onClose,
  onFilesAdded,
}: AttachmentModalProps) => {
  const { toast } = useToast()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="attachment-dialog-title" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card className="w-full max-w-md mx-4" tabIndex={-1}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="attachment-dialog-title" className="text-lg font-semibold">Add Attachment</h3>
              <Button size="sm" variant="ghost" onClick={onClose}>×</Button>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Paperclip className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to browse
              </p>
              <input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv"
                onChange={async (e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const files = Array.from(e.target.files)

                    const MAX_FILE_SIZE = 10 * 1024 * 1024
                    const MAX_TOTAL_SIZE = 25 * 1024 * 1024
                    const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.com', '.js', '.vbs', '.ps1', '.msi', '.dll']

                    let totalSize = 0
                    for (const file of files) {
                      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
                      if (BLOCKED_EXTENSIONS.includes(ext)) {
                        toast.error(`Blocked file type: ${ext}. Executable files are not allowed.`)
                        e.target.value = ''
                        return
                      }
                      if (file.size > MAX_FILE_SIZE) {
                        toast.error(`File "${file.name}" exceeds 10 MB limit.`)
                        e.target.value = ''
                        return
                      }
                      totalSize += file.size
                    }
                    if (totalSize > MAX_TOTAL_SIZE) {
                      toast.error('Total file size exceeds 25 MB limit.')
                      e.target.value = ''
                      return
                    }

                    onFilesAdded(files)
                    const fileNames = files.map(f => f.name).join(', ')
                    try {
                      for (const file of files) {
                        await messagesApi.uploadAttachment(file)
                      }
                      toast.success(`Uploaded: ${fileNames}`)
                    } catch (error) {
                      logger.error('Failed to upload attachments:', error)
                      toast.error('Failed to upload one or more files')
                    }
                    onClose()
                  }
                }}
              />
              <label htmlFor="file-upload">
                <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                  Browse Files
                </Button>
              </label>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF</p>
              <p>Maximum 10 MB per file, 25 MB total</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
