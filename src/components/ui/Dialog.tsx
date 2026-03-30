import React, { useEffect, useRef, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

// Context for passing dialog label id from DialogContent to DialogTitle
const DialogLabelContext = React.createContext<string | undefined>(undefined)

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />
          {/* Dialog Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {children}
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export function DialogContent({ children, className }: DialogContentProps) {
  const labelId = useId()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contentRef.current?.focus()
  }, [])

  return (
    <DialogLabelContext.Provider value={labelId}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-lg rounded-2xl p-6 shadow-2xl',
          'focus:outline-none',
          'max-h-[90vh] overflow-y-auto scrollbar-thin',
          className
        )}
        style={{
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          boxShadow: '0 25px 60px -10px rgb(0 0 0 / 0.3), 0 0 0 1px hsl(var(--border))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </DialogLabelContext.Provider>
  )
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 mb-5', className)}>
      {children}
    </div>
  )
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  const labelId = React.useContext(DialogLabelContext)
  return (
    <h2
      id={labelId}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    >
      {children}
    </h2>
  )
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground mt-1', className)}>
      {children}
    </p>
  )
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6 pt-4', className)}
      style={{ borderTop: '1px solid hsl(var(--border))' }}
    >
      {children}
    </div>
  )
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute right-4 top-4 rounded-lg p-1.5 transition-colors hover:bg-accent text-muted-foreground hover:text-foreground"
      aria-label="Close dialog"
    >
      <X className="h-4 w-4" />
    </button>
  )
}

// AlertDialog aliases — many pages import AlertDialog* from this module
// These are styled wrappers that map to the Dialog primitives
interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open = false, onOpenChange, children }: AlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange || (() => {})}>
      {children}
    </Dialog>
  )
}

export function AlertDialogContent({ children, className }: DialogContentProps) {
  return <DialogContent className={cn('max-w-md', className)}>{children}</DialogContent>
}

export function AlertDialogHeader({ children, className }: DialogHeaderProps) {
  return <DialogHeader className={className}>{children}</DialogHeader>
}

export function AlertDialogTitle({ children, className }: DialogTitleProps) {
  return <DialogTitle className={className}>{children}</DialogTitle>
}

export function AlertDialogDescription({ children, className }: DialogDescriptionProps) {
  return <DialogDescription className={className}>{children}</DialogDescription>
}

export function AlertDialogFooter({ children, className }: DialogFooterProps) {
  return <DialogFooter className={className}>{children}</DialogFooter>
}

export function AlertDialogCancel({
  children,
  onClick,
  className,
  variant = 'outline',
  disabled,
}: {
  children?: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'premium'
  disabled?: boolean
}) {
  return (
    <Button variant={variant} onClick={onClick} className={className} disabled={disabled}>
      {children || 'Cancel'}
    </Button>
  )
}

export function AlertDialogAction({
  children,
  onClick,
  className,
  variant = 'default',
  disabled,
}: {
  children?: React.ReactNode
  onClick?: (() => void) | (() => Promise<void>)
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'premium'
  disabled?: boolean
}) {
  return (
    <Button variant={variant} onClick={onClick as (() => void) | undefined} className={className} disabled={disabled}>
      {children || 'Continue'}
    </Button>
  )
}
