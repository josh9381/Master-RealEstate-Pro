import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface GlobalShortcutOptions {
  onOpenSearch?: () => void
}

export function useGlobalShortcuts({ onOpenSearch }: GlobalShortcutOptions = {}) {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return

      // Don't fire when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault()
          onOpenSearch?.()
          break
        case 'd':
          e.preventDefault()
          navigate('/dashboard')
          break
        case 'l':
          e.preventDefault()
          navigate('/leads')
          break
        case 'c':
          e.preventDefault()
          navigate('/communication')
          break
        case 's':
          e.preventDefault()
          navigate('/settings')
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate, onOpenSearch])
}
