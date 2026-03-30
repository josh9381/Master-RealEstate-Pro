import { useConfirmStore } from '@/store/confirmStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './Dialog'
import { Button } from './Button'

export function ConfirmDialog() {
  const { open, options, close } = useConfirmStore()

  if (!options) return null

  const isDestructive = options.variant === 'destructive'

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(false) }}>
      <DialogContent className="max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
          <DialogDescription>{options.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            {options.cancelLabel || 'Cancel'}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={() => close(true)}
          >
            {options.confirmLabel || 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
