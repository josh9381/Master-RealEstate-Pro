import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Edit, Pause, Play, Trash2 } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const performanceData = [
  { date: 'Jan 15', sent: 100, opened: 50, clicked: 15 },
  { date: 'Jan 16', sent: 150, opened: 75, clicked: 22 },
  { date: 'Jan 17', sent: 200, opened: 100, clicked: 30 },
  { date: 'Jan 18', sent: 250, opened: 125, clicked: 37 },
  { date: 'Jan 19', sent: 300, opened: 150, clicked: 45 },
  { date: 'Jan 20', sent: 250, opened: 125, clicked: 38 },
]

function CampaignDetail() {
  const { id } = useParams()

  const campaign = {
    id,
    name: 'Summer Email Campaign',
    type: 'email',
    status: 'active',
    sent: 1250,
    opened: 625,
    clicked: 187,
    converted: 45,
    startDate: '2024-01-15',
    endDate: '2024-02-15',
  }

  const openRate = ((campaign.opened / campaign.sent) * 100).toFixed(1)
  const clickRate = ((campaign.clicked / campaign.sent) * 100).toFixed(1)
  const conversionRate = ((campaign.converted / campaign.sent) * 100).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <div className="mt-2 flex items-center space-x-2">
            <Badge variant="success">{campaign.status}</Badge>
            <span className="text-sm text-muted-foreground">
              {campaign.startDate} - {campaign.endDate}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline">
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
          <Button variant="outline">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.sent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opened
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.opened.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{openRate}% open rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clicked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.clicked.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{clickRate}% click rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Converted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.converted}</div>
            <p className="text-xs text-muted-foreground">{conversionRate}% conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sent" stroke="#3b82f6" name="Sent" />
              <Line type="monotone" dataKey="opened" stroke="#10b981" name="Opened" />
              <Line type="monotone" dataKey="clicked" stroke="#f59e0b" name="Clicked" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-6 bg-muted/30">
            <h3 className="text-lg font-semibold mb-2">Summer Sale - 50% Off!</h3>
            <p className="text-muted-foreground">
              Don't miss our biggest summer sale. Get 50% off on all products...
            </p>
            <Button className="mt-4">View Full Content</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CampaignDetail
