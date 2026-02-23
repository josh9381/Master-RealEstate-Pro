/**
 * CampaignExecutionStatus — Real-time execution feedback component
 * Shows queued → sending (X/Y) → completed with progress bar
 * Polls backend every 3 seconds while campaign is in "sending" phase
 */

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, Clock, AlertTriangle, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { campaignsApi } from '@/lib/api';

interface ExecutionStatusData {
  campaignId: string;
  name: string;
  phase: 'queued' | 'sending' | 'completed' | 'draft' | 'paused';
  progress: number;
  totalRecipients: number;
  totalSent: number;
  delivered: number;
  bounced: number;
  isABTest: boolean;
  isMockMode: boolean;
  startedAt: string | null;
  lastUpdated: string;
}

interface CampaignExecutionStatusProps {
  campaignId: string;
  /** Initial status if already known */
  initialPhase?: string;
  /** Called when execution completes */
  onComplete?: () => void;
}

export function CampaignExecutionStatus({ campaignId, initialPhase: _initialPhase, onComplete }: CampaignExecutionStatusProps) {
  const [status, setStatus] = useState<ExecutionStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await campaignsApi.getCampaignStats(campaignId);
        const data = (response as any)?.data;
        if (data) {
          setStatus(data);
          setError(null);

          // Stop polling if completed
          if (data.phase === 'completed' && !completedRef.current) {
            completedRef.current = true;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            onComplete?.();
          }
        }
      } catch (err) {
        setError('Failed to fetch execution status');
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds
    intervalRef.current = setInterval(fetchStatus, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [campaignId, onComplete]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading execution status...
          </div>
        </CardContent>
      </Card>
    );
  }

  const phaseIcon = {
    draft: <Clock className="h-5 w-5 text-muted-foreground" />,
    queued: <Clock className="h-5 w-5 text-yellow-500" />,
    sending: <Radio className="h-5 w-5 text-blue-500 animate-pulse" />,
    completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    paused: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  };

  const phaseLabel = {
    draft: 'Draft',
    queued: 'Queued',
    sending: 'Sending...',
    completed: 'Completed',
    paused: 'Paused',
  };

  const phaseBadgeVariant = {
    draft: 'secondary' as const,
    queued: 'warning' as const,
    sending: 'default' as const,
    completed: 'success' as const,
    paused: 'warning' as const,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {phaseIcon[status.phase]}
            Campaign Execution
          </CardTitle>
          <div className="flex items-center gap-2">
            {status.isMockMode && (
              <Badge variant="warning">Mock Mode</Badge>
            )}
            {status.isABTest && (
              <Badge variant="outline">A/B Test</Badge>
            )}
            <Badge variant={phaseBadgeVariant[status.phase]}>
              {phaseLabel[status.phase]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {status.phase === 'sending'
                ? `Sending ${status.totalSent} of ${status.totalRecipients}`
                : status.phase === 'completed'
                ? `${status.totalSent} sent`
                : status.phase === 'queued'
                ? 'Waiting to start...'
                : `${status.totalSent} / ${status.totalRecipients}`}
            </span>
            <span className="font-medium">{status.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status.phase === 'completed'
                  ? 'bg-green-500'
                  : status.phase === 'sending'
                  ? 'bg-blue-500'
                  : 'bg-muted-foreground/30'
              }`}
              style={{ width: `${Math.max(status.progress, 2)}%` }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold">{status.totalRecipients}</div>
            <div className="text-muted-foreground">Recipients</div>
          </div>
          <div>
            <div className="font-semibold">{status.totalSent}</div>
            <div className="text-muted-foreground">Sent</div>
          </div>
          <div>
            <div className="font-semibold">{status.delivered}</div>
            <div className="text-muted-foreground">Delivered</div>
          </div>
          <div>
            <div className="font-semibold">{status.bounced}</div>
            <div className="text-muted-foreground">Bounced</div>
          </div>
        </div>

        {/* Timeline */}
        {status.startedAt && (
          <div className="text-xs text-muted-foreground">
            Started: {new Date(status.startedAt).toLocaleString()} ·
            Last updated: {new Date(status.lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
