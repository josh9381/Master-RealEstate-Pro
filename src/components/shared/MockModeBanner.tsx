import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface IntegrationStatus {
  email: { configured: boolean; provider: string }
  sms: { configured: boolean; provider: string }
  ai: { configured: boolean; provider: string }
}

interface MockModeBannerProps {
  /** Which services to check — defaults to email + sms */
  services?: ('email' | 'sms' | 'ai')[]
}

export function MockModeBanner({ services = ['email', 'sms'] }: MockModeBannerProps) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/system/integration-status')
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch {
        // If the endpoint fails, we can't determine status — don't show banner
      }
    }
    fetchStatus()
  }, [])

  if (dismissed || !status) return null

  const mockServices: string[] = []
  if (services.includes('email') && !status.email.configured) mockServices.push('Email')
  if (services.includes('sms') && !status.sms.configured) mockServices.push('SMS')
  if (services.includes('ai') && !status.ai.configured) mockServices.push('AI')

  if (mockServices.length === 0) return null

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-yellow-800">Demo Mode</h3>
          <Badge variant="warning" className="text-[10px]">Mock</Badge>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          {mockServices.join(' and ')} {mockServices.length === 1 ? 'is' : 'are'} in demo mode. 
          Messages are logged but not delivered. Add API keys in{' '}
          <a href="/settings/services" className="underline font-medium">Settings → Services</a>{' '}
          to send real messages.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-yellow-600 hover:text-yellow-800 text-sm shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
