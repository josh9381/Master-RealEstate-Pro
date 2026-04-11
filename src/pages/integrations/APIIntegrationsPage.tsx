import { Key, Plus, Copy, Trash2, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useState } from 'react'
import { APP_API_BASE_URL } from '@/lib/appConfig'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { formatDistanceToNow } from 'date-fns'

interface APIKeyData {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  user: { firstName: string | null; lastName: string | null; email: string }
}

export default function APIIntegrationsPage() {
  const apiBaseUrl = APP_API_BASE_URL
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  const { data: keysData, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const res = await api.get('/api/api-keys')
      return res.data as APIKeyData[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/api/api-keys', { name })
      return res.data
    },
    onSuccess: (data) => {
      setNewlyCreatedKey(data.key)
      setShowCreateForm(false)
      setNewKeyName('')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key created', 'Copy your key now — it won\'t be shown again.')
    },
    onError: () => {
      toast.error('Failed to create API key')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/api-keys/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success('API key revoked')
    },
    onError: () => {
      toast.error('Failed to revoke API key')
    },
  })

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const keys = keysData || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">API Integrations</h1>
          <p className="text-muted-foreground">Manage your API keys and integrations</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          Generate New Key
        </Button>
      </div>

      {/* Newly Created Key Banner */}
      {newlyCreatedKey && (
        <Card className="p-4 border-warning bg-warning/5 dark:bg-warning/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-warning dark:text-warning">
                Copy your API key now
              </h3>
              <p className="text-sm text-warning/80 dark:text-warning/80 mb-2">
                This key will not be shown again. Store it securely.
              </p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-card px-3 py-1.5 rounded border font-mono break-all">
                  {newlyCreatedKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(newlyCreatedKey)}
                >
                  {copiedKey ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNewlyCreatedKey(null)}>
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Create New API Key</h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Key name (e.g. Production, Staging)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm transition-colors"
              autoFocus
            />
            <Button
              onClick={() => createMutation.mutate(newKeyName)}
              disabled={!newKeyName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
            <Button variant="outline" onClick={() => { setShowCreateForm(false); setNewKeyName('') }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* API Keys */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold leading-tight">API Keys</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No API keys yet</p>
            <p className="text-sm mt-1">Generate a key to start using the API</p>
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((apiKey) => (
              <div key={apiKey.id} className="p-4 border rounded-lg transition-all duration-200 hover:shadow-md">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{apiKey.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                        {apiKey.keyPrefix}••••••••••••••••
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        title="Full API key is only shown once at creation time and cannot be retrieved"
                      >
                        <Copy className="h-4 w-4 opacity-40" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                      {apiKey.isActive ? 'Active' : 'Revoked'}
                    </Badge>
                    {apiKey.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeMutation.mutate(apiKey.id)}
                        disabled={revokeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Created: {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}</span>
                  <span>•</span>
                  <span>Last used: {apiKey.lastUsedAt ? formatDistanceToNow(new Date(apiKey.lastUsedAt), { addSuffix: true }) : 'Never'}</span>
                  {apiKey.expiresAt && (
                    <>
                      <span>•</span>
                      <span>Expires: {formatDistanceToNow(new Date(apiKey.expiresAt), { addSuffix: true })}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>By: {apiKey.user.firstName} {apiKey.user.lastName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* API Documentation */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold leading-tight mb-4">API Documentation</h2>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Authentication</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Include your API key in the Authorization header for all requests
            </p>
            <code className="block bg-muted p-3 rounded text-sm">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Base URL</h3>
            <code className="block bg-muted p-3 rounded text-sm">
              {apiBaseUrl}
            </code>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Rate Limits</h3>
            <p className="text-sm text-muted-foreground">
              • 1000 requests per hour per key
            </p>
          </div>
        </div>
      </Card>

      {/* Webhooks */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold leading-tight">Webhooks</h2>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>

        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <p>Webhook configuration coming soon</p>
          <p className="text-sm mt-2">You&apos;ll be able to receive real-time event notifications</p>
        </div>
      </Card>
    </div>
  )
}
