import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, BarChart3, Users, Brain, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const Segmentation = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ai')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">AI Segmentation</h1>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            AI-powered clustering &amp; auto-segmentation
          </p>
        </div>
      </div>

      {/* Coming Soon Hero */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-info/10 rounded-full mb-6">
            <BarChart3 className="h-12 w-12 text-info" />
          </div>
          <h2 className="text-2xl font-bold mb-2">AI Segmentation is Coming Soon</h2>
          <p className="text-muted-foreground max-w-lg mb-8">
            Automatically discover and create audience segments using machine learning.
            AI will analyze your leads' behavior, demographics, and engagement patterns to
            surface high-value groups you didn't know existed.
          </p>

          <div className="grid gap-4 md:grid-cols-3 w-full max-w-2xl">
            <div className="flex flex-col items-center p-4 border rounded-lg">
              <Brain className="h-6 w-6 text-primary mb-2" />
              <h3 className="text-sm font-semibold">Smart Clustering</h3>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                ML-driven clustering to group leads by behavior
              </p>
            </div>
            <div className="flex flex-col items-center p-4 border rounded-lg">
              <Users className="h-6 w-6 text-primary mb-2" />
              <h3 className="text-sm font-semibold">Auto-Segments</h3>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Automatically create and refresh segments
              </p>
            </div>
            <div className="flex flex-col items-center p-4 border rounded-lg">
              <Layers className="h-6 w-6 text-primary mb-2" />
              <h3 className="text-sm font-semibold">Lookalike Audiences</h3>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Find leads that match your best converters
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Segmentation Link */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Looking for rule-based segments?</p>
                <p className="text-xs text-muted-foreground">
                  You can still create manual segments using filters and rules
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/leads/segments')}>
              Go to Segments
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Segmentation;
