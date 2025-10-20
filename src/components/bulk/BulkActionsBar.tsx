import { useState } from 'react'
import { X, Tag, UserPlus, Trash2, Download, Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface BulkActionsBarProps {
  selectedCount: number
  onClearSelection: () => void
  onChangeStatus?: () => void
  onAddTags?: () => void
  onAssignTo?: () => void
  onExport?: () => void
  onDelete?: () => void
  onBulkEmail?: () => void
  className?: string
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onChangeStatus,
  onAddTags,
  onAssignTo,
  onExport,
  onDelete,
  onBulkEmail,
  className,
}: BulkActionsBarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showAssignMenu, setShowAssignMenu] = useState(false)

  if (selectedCount === 0) return null

  const statusOptions = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']
  const assignOptions = ['Sarah Johnson', 'Mike Davis', 'Emily Wilson', 'Unassigned']

  return (
    <div
      className={cn(
        "fixed top-20 left-1/2 z-30 -translate-x-1/2 transform animate-in slide-in-from-top duration-300",
        className
      )}
    >
      <div className="rounded-lg border bg-primary text-primary-foreground shadow-2xl">
        <div className="flex items-center space-x-4 px-6 py-3">
          {/* Selection Count */}
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{selectedCount} selected</span>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-primary-foreground/20" />

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Change Status */}
            {onChangeStatus && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <Tag className="mr-2 h-4 w-4" />
                  Change Status
                </Button>
                
                {showStatusMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowStatusMenu(false)}
                    />
                    <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-lg border bg-background p-2 shadow-lg">
                      {statusOptions.map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            onChangeStatus()
                            setShowStatusMenu(false)
                          }}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Add Tags */}
            {onAddTags && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddTags}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Tag className="mr-2 h-4 w-4" />
                Add Tags
              </Button>
            )}

            {/* Assign To */}
            {onAssignTo && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssignMenu(!showAssignMenu)}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign To
                </Button>

                {showAssignMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowAssignMenu(false)}
                    />
                    <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-lg border bg-background p-2 shadow-lg">
                      {assignOptions.map((person) => (
                        <button
                          key={person}
                          onClick={() => {
                            onAssignTo()
                            setShowAssignMenu(false)
                          }}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          {person}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bulk Email */}
            {onBulkEmail && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkEmail}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            )}

            {/* Export */}
            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}

            {/* Delete */}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-primary-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-primary-foreground/20" />

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            className="rounded-lg p-1.5 hover:bg-primary-foreground/10 transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
