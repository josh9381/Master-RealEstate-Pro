import React, { useEffect, useRef, useCallback, useId } from 'react'
import { Button } from './Button'

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
}

interface DialogTitleProps {
  children: React.ReactNode
}

interface DialogDescriptionProps {
  children: React.ReactNode
}

interface DialogFooterProps {
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {children}
      </div>
    </>
  )
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  // Focus trap: keep focus within dialog
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !contentRef.current) return;
    const focusable = contentRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  // Auto-focus the dialog on mount
  useEffect(() => {
    if (contentRef.current) {
      const firstFocusable = contentRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, []);

  return (
    <DialogLabelContext.Provider value={labelId}>
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 ${className}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </DialogLabelContext.Provider>
  )
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return <div className="mb-4">{children}</div>
}

export function DialogTitle({ children }: DialogTitleProps) {
  const labelId = React.useContext(DialogLabelContext);
  return <h2 id={labelId} className="text-xl font-semibold text-gray-900 dark:text-white">{children}</h2>
}

export function DialogDescription({ children }: DialogDescriptionProps) {
  return <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{children}</p>
}

export function DialogFooter({ children }: DialogFooterProps) {
  return <div className="mt-6 flex justify-end gap-3">{children}</div>
}

// AlertDialog is just an alias for Dialog with a specific styling
export const AlertDialog = Dialog
export const AlertDialogContent = DialogContent
export const AlertDialogHeader = DialogHeader
export const AlertDialogTitle = DialogTitle
export const AlertDialogDescription = DialogDescription
export const AlertDialogFooter = DialogFooter
export const AlertDialogCancel = Button
export const AlertDialogAction = Button
