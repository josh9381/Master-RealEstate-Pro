import { useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle, XCircle, Mail, AlertCircle } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface UnsubscribeResponse {
  success: boolean
  message: string
  lead: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    emailOptIn: boolean
    emailOptOutAt: string | null
    emailOptOutReason: string | null
  }
}

interface LeadInfo {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  emailOptIn: boolean
  emailOptOutAt: string | null
  emailOptOutReason: string | null
}

export function UnsubscribePage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading')
  const [message, setMessage] = useState('')
  const [leadInfo, setLeadInfo] = useState<LeadInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleUnsubscribe = useCallback(async () => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid unsubscribe link')
      return
    }

    try {
      setStatus('loading')
      const reason = searchParams.get('reason') || 'User requested'
      
      const response = await axios.get<UnsubscribeResponse>(
        `${API_URL}/unsubscribe/${token}`,
        { params: { reason } }
      )

      if (response.data.success) {
        setLeadInfo(response.data.lead)
        if (response.data.lead.emailOptIn === false) {
          setStatus('already')
        } else {
          setStatus('success')
        }
        setMessage(response.data.message)
      }
    } catch (error) {
      setStatus('error')
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setMessage(error.response.data.message)
      } else {
        setMessage('Failed to process unsubscribe request. Please try again.')
      }
    }
  }, [token, searchParams])

  const handleResubscribe = async () => {
    if (!token || isProcessing) return

    try {
      setIsProcessing(true)
      const response = await axios.post<UnsubscribeResponse>(
        `${API_URL}/unsubscribe/${token}/resubscribe`
      )

      if (response.data.success) {
        setLeadInfo(response.data.lead)
        setStatus('success')
        setMessage('Successfully resubscribed to emails!')
      }
    } catch (error) {
      setStatus('error')
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setMessage(error.response.data.message)
      } else {
        setMessage('Failed to resubscribe. Please try again.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Auto-unsubscribe on mount (only once)
  useState(() => {
    handleUnsubscribe()
  })

  const renderStatus = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <Mail className="h-12 w-12 text-muted-foreground animate-pulse" />
            <p className="text-lg text-muted-foreground">Processing your request...</p>
          </div>
        )

      case 'success':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {leadInfo?.emailOptIn ? 'Welcome Back!' : 'Successfully Unsubscribed'}
              </h2>
              <p className="text-muted-foreground">{message}</p>
            </div>

            {leadInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Email Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm text-muted-foreground">{leadInfo.email}</span>
                  </div>
                  {(leadInfo.firstName || leadInfo.lastName) && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Name:</span>
                      <span className="text-sm text-muted-foreground">
                        {[leadInfo.firstName, leadInfo.lastName].filter(Boolean).join(' ')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={leadInfo.emailOptIn ? 'success' : 'secondary'}>
                      {leadInfo.emailOptIn ? 'Subscribed' : 'Unsubscribed'}
                    </Badge>
                  </div>
                  {leadInfo.emailOptOutAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Unsubscribed:</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(leadInfo.emailOptOutAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {leadInfo && !leadInfo.emailOptIn && (
              <div className="space-y-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">What This Means</h3>
                    <p className="text-sm text-muted-foreground">
                      You will no longer receive marketing emails from us. You may still receive
                      transactional emails related to your account or services.
                    </p>
                  </CardContent>
                </Card>
                <Button
                  onClick={handleResubscribe}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Processing...' : 'Changed Your Mind? Resubscribe'}
                </Button>
              </div>
            )}
          </div>
        )

      case 'already':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-blue-100 p-3">
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Already Unsubscribed</h2>
              <p className="text-muted-foreground">
                This email address is already unsubscribed from our mailing list.
              </p>
            </div>
            <Button
              onClick={handleResubscribe}
              disabled={isProcessing}
              variant="default"
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Resubscribe to Emails'}
            </Button>
          </div>
        )

      case 'error':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Something Went Wrong</h2>
              <p className="text-muted-foreground">{message}</p>
            </div>
            <Button onClick={handleUnsubscribe} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>Manage your email subscription</CardDescription>
        </CardHeader>
        <CardContent>{renderStatus()}</CardContent>
      </Card>
    </div>
  )
}
