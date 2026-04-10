/**
 * CampaignExecutionStatus — Real-time execution feedback component
 * Shows queued → sending (X/Y) → completed with progress bar
 * Polls backend every 3 seconds while campaign is in "sending" phase
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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
  /** Called when execution completes */
  onComplete?: () => void;
}

export function CampaignExecutionStatus({ campaignId, onComplete }: CampaignExecutionStatusProps) {
  const [status, setStatus] = useState<ExecutionStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const startPolling = useCallback(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const fetchStatus = async () => {
      if (document.hidden) return;
      
      try {
        const response = await campaignsApi.getCampaignStats(campaignId);
        const data = response?.data as ExecutionStatusData | undefined;
        if (data) {
          setStatus(prev => {
            // Adjust polling interval: 1s during sending, 5s otherwise
            const newInterval = data.phase === 'sending' ? 1000 : 5000;
            const currentInterval = prev?.phase === 'sending' ? 1000 : 5000;
            if (newInterval !== currentInterval && intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = setInterval(fetchStatus, newInterval);
            }
            return data;
          });
          setError(null);

          if ((data.phase === 'completed' || data.phase === 'draft') && !completedRef.current) {
            completedRef.current = true;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            if (data.phase === 'completed') onCompleteRef.current?.();
          }
        }
      } catch (err) {
        setError('Failed to fetch execution status');
      }
    };

    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 3000);
  }, [campaignId]);

  const retryFetch = useCallback(() => {
    setError(null);
    completedRef.current = false;
    startPolling();
  }, [startPolling]);

  useEffect(() => {
    startPolling();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Re-fetch immediately when tab becomes visible
        campaignsApi.getCampaignStats(campaignId).then(response => {
          const data = response?.data as ExecutionStatusData | undefined;
          if (data) setStatus(data);
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [campaignId, startPolling]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
            <button
              onClick={retryFetch}
              className="text-sm text-primary hover:underline font-medium"
            >
              Retry
            </button>
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
    queued: <Clock className="h-5 w-5 text-warning" />,
    sending: <Radio className="h-5 w-5 text-primary animate-pulse" />,
    completed: <CheckCircle2 className="h-5 w-5 text-success" />,
    paused: <AlertTriangle className="h-5 w-5 text-warning" />,
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
                  ? 'bg-success'
                  : status.phase === 'sending'
                  ? 'bg-primary'
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
