import { Video } from 'lucide-react';
import { ComingSoon } from '@/components/shared/ComingSoon';

const VideoTutorialLibrary = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight">Video Tutorials</h1>
        <p className="text-muted-foreground mt-2">
          Learn the platform through step-by-step video guides
        </p>
      </div>

      <ComingSoon
        title="Video Tutorials"
        description="We're producing a comprehensive library of video tutorials covering every feature of the platform. From getting started guides to advanced automation workflows."
        icon={Video}
        previewItems={[
          'Getting Started & Onboarding (12 videos)',
          'Lead Management & Pipelines (8 videos)',
          'Email & SMS Campaigns (15 videos)',
          'Analytics & Reporting (10 videos)',
          'Automation Workflows (6 videos)',
          'Integrations & APIs (9 videos)',
        ]}
      />
    </div>
  );
};

export default VideoTutorialLibrary;
