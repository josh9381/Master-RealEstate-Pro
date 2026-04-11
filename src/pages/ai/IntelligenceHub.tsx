import { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, ArrowLeft, Brain } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

const InsightsTab = lazy(() => import('./InsightsTab'));
const PredictionsTab = lazy(() => import('./PredictionsTab'));

type HubTab = 'insights' | 'predictions';

const IntelligenceHub = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HubTab>('insights');

  const tabs = [
    { id: 'insights' as HubTab, label: 'Insights & Recommendations', icon: Sparkles },
    { id: 'predictions' as HubTab, label: 'Predictions & Forecasts', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/ai')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold leading-tight flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Intelligence Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered insights, recommendations, predictions, and forecasts
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <div className="flex" role="tablist" aria-label="Intelligence Hub sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <Suspense fallback={<LoadingSkeleton rows={5} showChart />}>
        <div role="tabpanel" id={`panel-${activeTab}`}>
          {activeTab === 'insights' && <InsightsTab />}
          {activeTab === 'predictions' && <PredictionsTab />}
        </div>
      </Suspense>
    </div>
  );
};

export default IntelligenceHub;
