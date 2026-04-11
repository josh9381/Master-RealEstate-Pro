import { Facebook, Twitter, Instagram, Linkedin, Share2, Calendar, BarChart3, Users, TrendingUp, Clock, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ComingSoon } from '@/components/shared/ComingSoon'

const platforms = [
  {
    name: 'Facebook',
    icon: Facebook,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
    description: 'Pages, groups, and ad campaigns',
    features: ['Page management', 'Post scheduling', 'Ad analytics', 'Audience insights'],
  },
  {
    name: 'Twitter / X',
    icon: Twitter,
    color: 'text-sky-500',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-200',
    description: 'Tweets, threads, and engagement',
    features: ['Tweet scheduling', 'Thread composer', 'Hashtag analytics', 'Follower tracking'],
  },
  {
    name: 'Instagram',
    icon: Instagram,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
    description: 'Posts, stories, and reels',
    features: ['Post scheduling', 'Story templates', 'Hashtag research', 'Engagement tracking'],
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
    description: 'Professional content and networking',
    features: ['Article publishing', 'Post scheduling', 'Lead gen forms', 'Company page analytics'],
  },
]

const plannedFeatures = [
  { icon: Calendar, title: 'Unified Scheduler', description: 'Schedule posts across all platforms from one calendar view' },
  { icon: BarChart3, title: 'Cross-Platform Analytics', description: 'Compare engagement metrics across all connected platforms' },
  { icon: Users, title: 'Audience Insights', description: 'Understand your followers with demographic and behavior data' },
  { icon: TrendingUp, title: 'Performance Tracking', description: 'Track reach, impressions, and engagement over time' },
  { icon: Clock, title: 'Best Time to Post', description: 'AI-powered recommendations for optimal posting times' },
  { icon: Share2, title: 'Content Library', description: 'Save and reuse your best-performing content templates' },
]

const SocialMediaDashboard = () => {
  return (
    <div className="space-y-6">
      <ComingSoon
        title="Social Media Dashboard"
        description="Manage and schedule posts across all platforms from one place. Connect Facebook, Twitter/X, Instagram, and LinkedIn to publish content, track engagement, and grow your audience."
        icon={Share2}
        previewItems={[
          'Unified post scheduler across all platforms',
          'Cross-platform analytics and engagement tracking',
          'AI-powered best time to post recommendations',
          'Content library with reusable templates',
        ]}
      />

      {/* Platform Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Platforms</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {platforms.map((platform) => {
            const Icon = platform.icon
            return (
              <Card key={platform.name} className={`${platform.borderColor} border-2 opacity-75`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${platform.bgColor}`}>
                      <Icon className={`h-6 w-6 ${platform.color}`} />
                    </div>
                    <Badge variant="secondary">Not Connected</Badge>
                  </div>
                  <CardTitle className="text-base mt-2">{platform.name}</CardTitle>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {platform.features.map((feature) => (
                      <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" className="w-full mt-4" disabled>
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Connect
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Planned Features */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Planned Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plannedFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="opacity-75">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Placeholder Dashboard Preview */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Dashboard Preview</CardTitle>
          <CardDescription>This is how your social media overview will look once platforms are connected</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Total Posts', value: '—' },
              { label: 'Total Engagement', value: '—' },
              { label: 'Scheduled Posts', value: '—' },
              { label: 'Avg. Reach', value: '—' },
            ].map((stat) => (
              <div key={stat.label} className="p-4 border rounded-lg text-center bg-muted/30">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SocialMediaDashboard

