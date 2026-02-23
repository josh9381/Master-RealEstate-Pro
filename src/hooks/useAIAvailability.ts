import { useState, useEffect } from 'react'

interface AIAvailability {
  available: boolean
  loading: boolean
  message: string
}

let cachedStatus: { available: boolean; checked: boolean } = { available: true, checked: false }

/**
 * Hook to check if AI features (OpenAI) are configured and available.
 * Uses a cached result after the first check to avoid repeated API calls.
 */
export function useAIAvailability(): AIAvailability {
  const [status, setStatus] = useState<AIAvailability>({
    available: cachedStatus.checked ? cachedStatus.available : true,
    loading: !cachedStatus.checked,
    message: '',
  })

  useEffect(() => {
    if (cachedStatus.checked) {
      setStatus({
        available: cachedStatus.available,
        loading: false,
        message: cachedStatus.available ? '' : 'Configure OpenAI API key in Settings to enable AI features',
      })
      return
    }

    const checkAvailability = async () => {
      try {
        const response = await fetch('/api/system/integration-status')
        if (response.ok) {
          const data = await response.json()
          cachedStatus = { available: data.ai.configured, checked: true }
          setStatus({
            available: data.ai.configured,
            loading: false,
            message: data.ai.configured ? '' : 'Configure OpenAI API key in Settings to enable AI features',
          })
        } else {
          // Can't determine — assume available
          cachedStatus = { available: true, checked: true }
          setStatus({ available: true, loading: false, message: '' })
        }
      } catch {
        // Can't reach backend — assume available
        cachedStatus = { available: true, checked: true }
        setStatus({ available: true, loading: false, message: '' })
      }
    }

    checkAvailability()
  }, [])

  return status
}

/**
 * Check if an error response indicates that OpenAI is not configured (503).
 * Returns a user-friendly message if so, or null if it's a different error.
 */
export function getAIUnavailableMessage(error: unknown): string | null {
  if (error && typeof error === 'object') {
    const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string }
    if (err.response?.status === 503) {
      return 'AI features are not configured. Add your OpenAI API key in Settings to enable AI features.'
    }
    if (err.response?.status === 500 && err.response?.data?.message?.includes('OPENAI_API_KEY')) {
      return 'AI features are not configured. Add your OpenAI API key in Settings to enable AI features.'
    }
  }
  return null
}
