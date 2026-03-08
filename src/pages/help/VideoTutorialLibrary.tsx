import { Video, Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

const VideoTutorialLibrary = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Video Tutorials</h1>
        <p className="text-muted-foreground mt-2">
          Learn the platform through step-by-step video guides
        </p>
      </div>

      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-6">
            <Video className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Video Tutorials Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            We&apos;re producing a comprehensive library of video tutorials covering every feature
            of the platform. From getting started guides to advanced automation workflows.
          </p>
          <div className="grid gap-4 md:grid-cols-3 max-w-lg mx-auto mb-8">
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">60+</div>
              <div className="text-xs text-muted-foreground">Videos Planned</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">6</div>
              <div className="text-xs text-muted-foreground">Categories</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">4+ hrs</div>
              <div className="text-xs text-muted-foreground">Total Content</div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Bell className="h-4 w-4" />
            <span>Check back soon for updates</span>
          </div>
        </CardContent>
      </Card>

      {/* Planned topics */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Planned Tutorial Topics</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { topic: 'Getting Started & Onboarding', count: 12 },
              { topic: 'Lead Management & Pipelines', count: 8 },
              { topic: 'Email & SMS Campaigns', count: 15 },
              { topic: 'Analytics & Reporting', count: 10 },
              { topic: 'Automation Workflows', count: 6 },
              { topic: 'Integrations & APIs', count: 9 },
            ].map((item) => (
              <div key={item.topic} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                <span className="text-sm">{item.topic}</span>
                <span className="text-xs text-muted-foreground">{item.count} videos</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoTutorialLibrary;
