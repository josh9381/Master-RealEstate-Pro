import { Key, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useState } from 'react'

export default function APIIntegrationsPage() {
  const [showKey, setShowKey] = useState<{[key: string]: boolean}>({})

  const apiKeys = [
    {
      id: 1,
      name: 'Production API Key',
      key: 'sk_live_51K9x...a2b3c4d5',
      created: 'Jan 15, 2024',
      lastUsed: '2 hours ago',
      status: 'active'
    },
    {
      id: 2,
      name: 'Development API Key',
      key: 'sk_test_51K9x...f6g7h8i9',
      created: 'Jan 10, 2024',
      lastUsed: '5 days ago',
      status: 'active'
    },
    {
      id: 3,
      name: 'Staging API Key',
      key: 'sk_stage_51K9x...j0k1l2m3',
      created: 'Dec 20, 2023',
      lastUsed: 'Never',
      status: 'inactive'
    },
  ]

  const toggleKeyVisibility = (id: number) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Integrations</h1>
          <p className="text-muted-foreground">Manage your API keys and integrations</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Generate New Key
        </Button>
      </div>

      {/* API Keys */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">API Keys</h2>
        </div>

        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{apiKey.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {showKey[apiKey.id] ? apiKey.key : apiKey.key.replace(/[^.]/g, '•')}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {showKey[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={apiKey.status === 'active' ? 'default' : 'secondary'}>
                    {apiKey.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Created: {apiKey.created}</span>
                <span>•</span>
                <span>Last used: {apiKey.lastUsed}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* API Documentation */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">API Documentation</h2>
        
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
              https://api.masterrealestatepro.com/v1
            </code>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Rate Limits</h3>
            <p className="text-sm text-muted-foreground">
              • Production: 1000 requests per hour
              <br />
              • Development: 100 requests per hour
              <br />
              • Staging: 500 requests per hour
            </p>
          </div>
        </div>

        <Button variant="outline" className="mt-4">
          View Full Documentation
        </Button>
      </Card>

      {/* Webhooks */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Webhooks</h2>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </Button>
        </div>

        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <p>No webhooks configured yet</p>
          <p className="text-sm mt-2">Add a webhook to receive real-time updates</p>
        </div>
      </Card>
    </div>
  )
}
