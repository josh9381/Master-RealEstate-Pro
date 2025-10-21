import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Mail, MessageSquare, Phone, MoreHorizontal } from 'lucide-react'

const campaigns = [
  { id: 1, name: 'Summer Email Campaign', type: 'email', status: 'active', sent: 1250, opened: 625, clicked: 187, startDate: '2024-01-15' },
  { id: 2, name: 'Product Launch SMS', type: 'sms', status: 'scheduled', sent: 0, opened: 0, clicked: 0, startDate: '2024-01-25' },
  { id: 3, name: 'Cold Call Outreach', type: 'phone', status: 'active', sent: 500, opened: 300, clicked: 45, startDate: '2024-01-10' },
  { id: 4, name: 'Newsletter - January', type: 'email', status: 'completed', sent: 5000, opened: 2500, clicked: 750, startDate: '2024-01-01' },
  { id: 5, name: 'Follow-up SMS Series', type: 'sms', status: 'paused', sent: 200, opened: 150, clicked: 30, startDate: '2024-01-12' },
]

function CampaignsList() {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'scheduled': return 'warning'
      case 'paused': return 'secondary'
      case 'completed': return 'outline'
      default: return 'secondary'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-5 w-5" />
      case 'sms': return <MessageSquare className="h-5 w-5" />
      case 'phone': return <Phone className="h-5 w-5" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="mt-2 text-muted-foreground">
            Create and manage your marketing campaigns
          </p>
        </div>
        <Button asChild>
          <Link to="/campaigns/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {/* Campaign Cards */}
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {getTypeIcon(campaign.type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      <Link to={`/campaigns/${campaign.id}`} className="hover:text-primary">
                        {campaign.name}
                      </Link>
                    </CardTitle>
                    <div className="mt-1 flex items-center space-x-2">
                      <Badge variant={getStatusVariant(campaign.status)}>
                        {campaign.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Started {campaign.startDate}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <p className="text-2xl font-bold">{campaign.sent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Opened</p>
                  <p className="text-2xl font-bold">{campaign.opened.toLocaleString()}</p>
                  {campaign.sent > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {((campaign.opened / campaign.sent) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clicked</p>
                  <p className="text-2xl font-bold">{campaign.clicked.toLocaleString()}</p>
                  {campaign.sent > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {((campaign.clicked / campaign.sent) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <Button variant="outline" asChild className="w-full">
                    <Link to={`/campaigns/${campaign.id}`}>View Details</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default CampaignsList
