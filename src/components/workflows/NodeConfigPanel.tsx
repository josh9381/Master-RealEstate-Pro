import { Save, X, AlertTriangle, Zap, GitBranch, Clock, Play, Mail, MessageSquare, Tag, UserPlus, Bell, Send, TrendingUp, Globe, FileText, UserCircle, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { WorkflowNodeData } from './WorkflowNode';

// ── Helpers ────────────────────────────────────────────────────────────────────

const isValidCron = (cron: string): boolean => {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) return false;
  const ranges = [
    { min: 0, max: 59 }, { min: 0, max: 23 }, { min: 1, max: 31 },
    { min: 1, max: 12 }, { min: 0, max: 7 },
  ];
  return parts.slice(0, 5).every((part, i) => {
    if (part === '*') return true;
    if (/^\*\/\d+$/.test(part)) {
      const step = parseInt(part.split('/')[1]);
      return step >= 1 && step <= ranges[i].max;
    }
    if (/^\d+(-\d+)?$/.test(part)) {
      return part.split('-').map(Number).every(n => n >= ranges[i].min && n <= ranges[i].max);
    }
    if (/^(\d+,)+\d+$/.test(part)) {
      return part.split(',').map(Number).every(n => n >= ranges[i].min && n <= ranges[i].max);
    }
    return false;
  });
};

const describeCron = (cron: string): string => {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return '';
  const [min, hour, dom, mon, dow] = parts;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (min !== '*' && hour !== '*' && dom === '*' && mon === '*' && dow === '*')
    return `Every day at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (min !== '*' && hour !== '*' && dow !== '*' && dom === '*' && mon === '*')
    return `Every ${dayNames[parseInt(dow)] || dow} at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (hour.startsWith('*/')) return `Every ${hour.split('/')[1]} hour(s)`;
  if (min.startsWith('*/')) return `Every ${min.split('/')[1]} minute(s)`;
  return 'Custom schedule';
};

// ── Type styling ───────────────────────────────────────────────────────────────

const nodeTypeConfig: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{className?: string}> }> = {
  trigger:   { label: 'Trigger',       color: 'text-primary',   bg: 'bg-primary/10',     icon: Zap },
  condition: { label: 'Condition',     color: 'text-warning', bg: 'bg-warning/10',   icon: GitBranch },
  action:    { label: 'Action',        color: 'text-success', bg: 'bg-success/10',   icon: Play },
  delay:     { label: 'Delay / Wait',  color: 'text-primary dark:text-primary', bg: 'bg-primary/10 dark:bg-primary/10', icon: Clock },
};

// ── Micro-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, description }: { icon: React.ComponentType<{className?: string}>; title: string; description: string }) => (
  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50">
    <div className="p-1.5 rounded-md bg-primary/10 mt-0.5 shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium leading-tight">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
  </div>
);

const HelpTip = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
    <Info className="h-3 w-3 mt-0.5 shrink-0" />
    <span>{children}</span>
  </div>
);

const FieldGroup = ({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) => (
  <div className="space-y-1.5">
    <Label htmlFor={htmlFor} className="text-sm font-medium">{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const StyledSelect = ({ id, value, onChange, children, className = '' }: { id: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; className?: string }) => (
  <select
    id={id}
    className={`w-full h-9 px-3 border rounded-md bg-background text-foreground text-sm dark:border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${className}`}
    value={value}
    onChange={onChange}
  >
    {children}
  </select>
);

// ── Main component ─────────────────────────────────────────────────────────────

interface NodeConfigPanelProps {
  node: WorkflowNodeData;
  onSave: (nodeId: string, config: Record<string, unknown>) => void;
  onClose: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  onSave,
  onClose,
}) => {
  const [config, setConfig] = useState<Record<string, unknown>>(node.config || {});
  const [nodeLabel, setNodeLabel] = useState(node.label);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    setConfig(node.config || {});
    setNodeLabel(node.label);
    setValidationErrors([]);
  }, [node.id, node.config, node.label]);

  const updateConfig = (key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  // ── Validation ──

  const validateConfig = (): string[] => {
    const errors: string[] = [];
    if (!nodeLabel.trim()) errors.push('Node label is required');

    if (node.type === 'action') {
      const at = ((config.actionType as string) || '').toLowerCase();
      if (at.includes('email') && !config.subject) errors.push('Email subject is required');
      if (at.includes('sms') && !config.message) errors.push('SMS message is required');
      if (at.includes('tag') && !at.includes('remove') && !config.tagName) errors.push('Tag name is required');
      if (at.includes('webhook')) {
        if (!config.url) errors.push('Webhook URL is required');
        if (config.headers && typeof config.headers === 'string' && (config.headers as string).trim()) {
          try {
            const parsed = JSON.parse(config.headers as string);
            if (typeof parsed !== 'object' || Array.isArray(parsed))
              errors.push('Webhook headers must be a JSON object (e.g. {"key": "value"})');
          } catch {
            errors.push('Webhook headers contain invalid JSON');
          }
        }
      }
    }

    if (node.type === 'trigger') {
      const tt = ((config.triggerType as string) || '').toLowerCase();
      if (tt.includes('score')) {
        const s = config.scoreThreshold as number;
        if (s != null && (s < 0 || s > 100)) errors.push('Score threshold must be between 0 and 100');
      }
      if (tt.includes('time') && config.schedule && !isValidCron(config.schedule as string))
        errors.push('Invalid cron expression');
    }

    if (node.type === 'condition') {
      if ((config.conditionType as string) === 'lead_field' && !config.field) errors.push('Select a field to check');
    }

    if (node.type === 'delay') {
      const dm = config.delayMode as string;
      if (dm === 'schedule' && !config.scheduledFor) errors.push('Schedule date/time is required');
      if (dm !== 'schedule' && (!config.duration || (config.duration as number) < 1)) errors.push('Duration must be at least 1');
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateConfig();
    if (errors.length > 0) { setValidationErrors(errors); return; }
    onSave(node.id, { ...config, _nodeLabel: nodeLabel });
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'trigger': return renderTriggerConfig();
      case 'condition': return renderConditionConfig();
      case 'action': return renderActionConfig();
      case 'delay': return renderDelayConfig();
      default: return null;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRIGGER CONFIG
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderTriggerConfig = () => {
    const triggerType = ((config.triggerType as string) || '').toLowerCase();

    // ── Lead Status Changed ──
    if (triggerType.includes('status')) {
      return (
        <>
          <SectionHeader
            icon={Zap}
            title="When a lead's status changes"
            description="Fires whenever a lead moves from one pipeline stage to another."
          />
          <FieldGroup label="From Status" htmlFor="from-status" hint="Leave on 'Any' to match all starting statuses">
            <StyledSelect id="from-status" value={config.fromStatus as string || ''} onChange={(e) => updateConfig('fromStatus', e.target.value)}>
              <option value="">Any status</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="NEGOTIATING">Negotiating</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </StyledSelect>
          </FieldGroup>
          <FieldGroup label="To Status" htmlFor="to-status" hint="The status the lead is moving to">
            <StyledSelect id="to-status" value={config.toStatus as string || ''} onChange={(e) => updateConfig('toStatus', e.target.value)}>
              <option value="">Any status</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="NEGOTIATING">Negotiating</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </StyledSelect>
          </FieldGroup>
          <HelpTip>Example: Trigger when a lead goes from &quot;New&quot; to &quot;Qualified&quot; to auto-assign them.</HelpTip>
        </>
      );
    }

    // ── Score Threshold ──
    if (triggerType.includes('score')) {
      return (
        <>
          <SectionHeader
            icon={TrendingUp}
            title="When lead score hits a threshold"
            description="Fires when a lead's engagement score crosses your chosen value."
          />
          <FieldGroup label="Trigger when score is..." htmlFor="threshold-type">
            <StyledSelect id="threshold-type" value={config.thresholdType as string || 'above'} onChange={(e) => updateConfig('thresholdType', e.target.value)}>
              <option value="above">Above the threshold</option>
              <option value="below">Below the threshold</option>
              <option value="equals">Exactly equal to</option>
            </StyledSelect>
          </FieldGroup>
          <FieldGroup label="Score Value (0–100)" htmlFor="score-threshold">
            <Input
              id="score-threshold"
              type="number"
              min={0}
              max={100}
              value={config.scoreThreshold as number ?? 50}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                updateConfig('scoreThreshold', isNaN(val) ? '' : Math.min(100, Math.max(0, val)));
              }}
            />
          </FieldGroup>
          <HelpTip>A score of 80+ usually means a &quot;hot&quot; lead ready for outreach.</HelpTip>
        </>
      );
    }

    // ── Time-Based / Cron ──
    if (triggerType.includes('time')) {
      const schedVal = config.schedule as string || '';
      const cronOk = schedVal ? isValidCron(schedVal) : true;
      const cronDesc = schedVal && cronOk ? describeCron(schedVal) : '';
      const scheduleMode = (config._scheduleMode as string) || (schedVal ? 'advanced' : 'simple');

      return (
        <>
          <SectionHeader
            icon={Clock}
            title="Run on a schedule"
            description="This workflow fires automatically at the times you choose."
          />

          <FieldGroup label="Schedule Mode" htmlFor="schedule-mode">
            <StyledSelect id="schedule-mode" value={scheduleMode} onChange={(e) => {
              const mode = e.target.value;
              updateConfig('_scheduleMode', mode);
              if (mode === 'simple') {
                updateConfig('_simpleFreq', config._simpleFreq || 'daily');
                updateConfig('_simpleTime', config._simpleTime || '09:00');
                updateConfig('_simpleDay', config._simpleDay || '1');
              }
            }}>
              <option value="simple">Simple (pick frequency &amp; time)</option>
              <option value="advanced">Advanced (cron expression)</option>
            </StyledSelect>
          </FieldGroup>

          {scheduleMode === 'simple' ? (
            <>
              <FieldGroup label="How often?" htmlFor="simple-freq">
                <StyledSelect id="simple-freq" value={config._simpleFreq as string || 'daily'} onChange={(e) => {
                  const freq = e.target.value;
                  updateConfig('_simpleFreq', freq);
                  const time = (config._simpleTime as string) || '09:00';
                  const [h, m] = time.split(':');
                  const day = (config._simpleDay as string) || '1';
                  let cron = '';
                  if (freq === 'hourly') cron = '0 * * * *';
                  else if (freq === 'daily') cron = `${m} ${h} * * *`;
                  else if (freq === 'weekly') cron = `${m} ${h} * * ${day}`;
                  else if (freq === 'every_15_min') cron = '*/15 * * * *';
                  updateConfig('schedule', cron);
                }}>
                  <option value="every_15_min">Every 15 minutes</option>
                  <option value="hourly">Every hour</option>
                  <option value="daily">Every day</option>
                  <option value="weekly">Every week</option>
                </StyledSelect>
              </FieldGroup>
              {(config._simpleFreq === 'daily' || config._simpleFreq === 'weekly') && (
                <FieldGroup label="At what time?" htmlFor="simple-time">
                  <Input
                    id="simple-time"
                    type="time"
                    value={config._simpleTime as string || '09:00'}
                    onChange={(e) => {
                      const time = e.target.value;
                      updateConfig('_simpleTime', time);
                      const [h, m] = time.split(':');
                      const day = (config._simpleDay as string) || '1';
                      const freq = config._simpleFreq as string;
                      const cron = freq === 'weekly' ? `${m} ${h} * * ${day}` : `${m} ${h} * * *`;
                      updateConfig('schedule', cron);
                    }}
                  />
                </FieldGroup>
              )}
              {config._simpleFreq === 'weekly' && (
                <FieldGroup label="On which day?" htmlFor="simple-day">
                  <StyledSelect id="simple-day" value={config._simpleDay as string || '1'} onChange={(e) => {
                    const day = e.target.value;
                    updateConfig('_simpleDay', day);
                    const time = (config._simpleTime as string) || '09:00';
                    const [h, m] = time.split(':');
                    updateConfig('schedule', `${m} ${h} * * ${day}`);
                  }}>
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </StyledSelect>
                </FieldGroup>
              )}
              {schedVal && cronOk && (
                <div className="flex items-center gap-1.5 text-xs text-success font-medium bg-success/10 p-2 rounded-md">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Runs: {cronDesc || schedVal}
                </div>
              )}
            </>
          ) : (
            <>
              <FieldGroup label="Cron Expression" htmlFor="schedule" hint="5 fields: minute hour day-of-month month day-of-week">
                <Input
                  id="schedule"
                  placeholder="0 9 * * *"
                  value={schedVal}
                  onChange={(e) => updateConfig('schedule', e.target.value)}
                  className={schedVal && !cronOk ? 'border-destructive focus:ring-destructive' : ''}
                />
                {schedVal && !cronOk && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Invalid cron — use 5 fields: minute hour day month weekday
                  </p>
                )}
                {cronDesc && (
                  <div className="flex items-center gap-1.5 text-xs text-success font-medium bg-success/10 p-2 rounded-md">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Runs: {cronDesc}
                  </div>
                )}
              </FieldGroup>
              <HelpTip>
                Common patterns: &quot;0 9 * * *&quot; = daily 9 AM, &quot;0 9 * * 1&quot; = Mondays 9 AM, &quot;*/15 * * * *&quot; = every 15 min
              </HelpTip>
            </>
          )}

          <FieldGroup label="Timezone" htmlFor="timezone">
            <StyledSelect id="timezone" value={config.timezone as string || 'UTC'} onChange={(e) => updateConfig('timezone', e.target.value)}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </StyledSelect>
          </FieldGroup>
        </>
      );
    }

    // ── Webhook ──
    if (triggerType.includes('webhook')) {
      return (
        <>
          <SectionHeader
            icon={Globe}
            title="Triggered by an external system"
            description="An outside app (Zapier, website form, etc.) sends data to a unique URL."
          />
          <div className="p-3 bg-primary/10 rounded-lg text-sm space-y-1">
            <p className="font-medium">Your webhook URL will appear after saving.</p>
            <p className="text-xs text-muted-foreground">
              The external system sends a POST request with JSON containing{' '}
              <code className="px-1 py-0.5 bg-primary/15 rounded text-xs">leadId</code> and any extra{' '}
              <code className="px-1 py-0.5 bg-primary/15 rounded text-xs">data</code>.
            </p>
          </div>
        </>
      );
    }

    // ── Tag Added ──
    if (triggerType.includes('tag')) {
      return (
        <>
          <SectionHeader icon={Tag} title="When a tag is added to a lead" description="Fires every time a specific (or any) tag is applied." />
          <FieldGroup label="Tag Name" htmlFor="tag-name-trigger" hint="Leave blank to trigger on any tag being added">
            <Input id="tag-name-trigger" placeholder="e.g., Hot Lead, VIP, Buyer" value={config.tagName as string || ''} onChange={(e) => updateConfig('tagName', e.target.value)} />
          </FieldGroup>
        </>
      );
    }

    // ── Campaign Completed ──
    if (triggerType.includes('campaign')) {
      return (
        <>
          <SectionHeader icon={Send} title="When a campaign finishes" description="Runs after a marketing campaign completes execution." />
          <FieldGroup label="Campaign ID" htmlFor="campaign-id-trigger" hint="Leave blank to trigger on any campaign completing">
            <Input id="campaign-id-trigger" placeholder="e.g., cm3abc123..." value={config.campaignId as string || ''} onChange={(e) => updateConfig('campaignId', e.target.value)} />
          </FieldGroup>
        </>
      );
    }

    // ── Lead Assigned ──
    if (triggerType.includes('assigned')) {
      return (
        <>
          <SectionHeader icon={UserPlus} title="When a lead is assigned" description="Fires when a lead is assigned (or reassigned) to a team member." />
          <FieldGroup label="Assigned To (optional)" htmlFor="assigned-to" hint="Leave blank to trigger on any assignment">
            <Input id="assigned-to" placeholder="User ID or email" value={config.assignedTo as string || ''} onChange={(e) => updateConfig('assignedTo', e.target.value)} />
          </FieldGroup>
        </>
      );
    }

    // ── Simple info triggers ──
    if (triggerType.includes('created')) {
      return <SectionHeader icon={UserPlus} title="When a new lead is created" description="Fires automatically every time a lead is added. No setup needed — just save and activate." />;
    }
    if (triggerType.includes('manual')) {
      return <SectionHeader icon={Play} title="Manual trigger" description="This workflow only runs when you click &quot;Run&quot; manually. Great for one-off tasks." />;
    }
    if (triggerType.includes('email') || triggerType.includes('opened')) {
      return <SectionHeader icon={Mail} title="When a lead opens an email" description="Fires when any lead opens an email sent through this system. Perfect for follow-ups." />;
    }

    return <SectionHeader icon={Zap} title="Trigger" description="This event starts the workflow. No additional configuration needed." />;
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONDITION CONFIG
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderConditionConfig = () => {
    const condType = (config.conditionType as string) || 'lead_field';

    const conditionDescriptions: Record<string, string> = {
      lead_field: 'Check a specific property of the lead (score, status, location, etc.)',
      email_opened: 'Did the lead open any email within a time window?',
      link_clicked: 'Did the lead click a link in an email?',
      time_elapsed: 'Has enough time passed since an event?',
    };

    return (
      <>
        <SectionHeader
          icon={GitBranch}
          title="Check a condition before continuing"
          description="The workflow will only proceed if this check passes."
        />

        <FieldGroup label="What do you want to check?" htmlFor="conditionType">
          <StyledSelect id="conditionType" value={condType} onChange={(e) => updateConfig('conditionType', e.target.value)}>
            <option value="lead_field">Lead Field Value</option>
            <option value="email_opened">Email Was Opened</option>
            <option value="link_clicked">Link Was Clicked</option>
            <option value="time_elapsed">Time Has Elapsed</option>
          </StyledSelect>
          <p className="text-xs text-muted-foreground mt-1">{conditionDescriptions[condType]}</p>
        </FieldGroup>

        {/* ── Lead Field ── */}
        {condType === 'lead_field' && (
          <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Condition Rule</p>
            <FieldGroup label="Field" htmlFor="field">
              <StyledSelect id="field" value={config.field as string || ''} onChange={(e) => updateConfig('field', e.target.value)}>
                <option value="">-- Pick a field --</option>
                <optgroup label="Key Fields">
                  <option value="score">Lead Score</option>
                  <option value="status">Lead Status</option>
                  <option value="source">Lead Source</option>
                </optgroup>
                <optgroup label="Contact Info">
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="firstName">First Name</option>
                  <option value="lastName">Last Name</option>
                </optgroup>
                <optgroup label="Location">
                  <option value="city">City</option>
                  <option value="state">State</option>
                </optgroup>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup label="Operator" htmlFor="operator">
              <StyledSelect id="operator" value={config.operator as string || 'equals'} onChange={(e) => updateConfig('operator', e.target.value)}>
                <option value="equals">is equal to</option>
                <option value="notEquals">is not equal to</option>
                <option value="greaterThan">is greater than</option>
                <option value="lessThan">is less than</option>
                <option value="greaterThanOrEqual">is at least</option>
                <option value="lessThanOrEqual">is at most</option>
                <option value="contains">contains</option>
                <option value="notContains">does not contain</option>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup label="Value" htmlFor="value">
              {config.field === 'score' ? (
                <Input id="value" type="number" min={0} max={100} placeholder="e.g. 80" value={config.value as string || ''} onChange={(e) => updateConfig('value', e.target.value ? Number(e.target.value) : '')} />
              ) : config.field === 'status' ? (
                <StyledSelect id="value" value={config.value as string || ''} onChange={(e) => updateConfig('value', e.target.value)}>
                  <option value="">-- Pick a status --</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="NEGOTIATING">Negotiating</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </StyledSelect>
              ) : (
                <Input id="value" placeholder="Enter value to compare" value={config.value as string || ''} onChange={(e) => updateConfig('value', e.target.value)} />
              )}
            </FieldGroup>
            {/* Natural-language summary */}
            {!!(config.field && config.operator && config.value) && (
              <div className="text-xs p-2 rounded bg-primary/5 border border-primary/10 text-primary">
                <strong>Rule:</strong> If lead&apos;s <em>{String(config.field)}</em>{' '}
                {(String(config.operator) || '').replace(/([A-Z])/g, ' $1').toLowerCase()}{' '}
                <em>&quot;{String(config.value)}&quot;</em> → continue
              </div>
            )}
          </div>
        )}

        {/* ── Email Opened ── */}
        {condType === 'email_opened' && (
          <FieldGroup label="Opened within the last..." htmlFor="withinHours" hint="Leave blank to check all time">
            <div className="flex items-center gap-2">
              <Input id="withinHours" type="number" min={0} className="w-24" placeholder="∞" value={config.withinHours as string || ''} onChange={(e) => updateConfig('withinHours', e.target.value ? parseInt(e.target.value) : '')} />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
          </FieldGroup>
        )}

        {/* ── Link Clicked ── */}
        {condType === 'link_clicked' && (
          <FieldGroup label="Clicked within the last..." htmlFor="withinHoursLink" hint="Leave blank to check all time">
            <div className="flex items-center gap-2">
              <Input id="withinHoursLink" type="number" min={0} className="w-24" placeholder="∞" value={config.withinHours as string || ''} onChange={(e) => updateConfig('withinHours', e.target.value ? parseInt(e.target.value) : '')} />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
          </FieldGroup>
        )}

        {/* ── Time Elapsed ── */}
        {condType === 'time_elapsed' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">At least</span>
              <Input id="elapsedAmount" type="number" min={1} className="w-20" value={config.elapsedAmount as number || 1} onChange={(e) => updateConfig('elapsedAmount', parseInt(e.target.value) || 1)} />
              <StyledSelect id="elapsedUnit" value={config.elapsedUnit as string || 'hours'} onChange={(e) => updateConfig('elapsedUnit', e.target.value)}>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </StyledSelect>
            </div>
            <FieldGroup label="Since when?" htmlFor="sinceEvent">
              <StyledSelect id="sinceEvent" value={config.sinceEvent as string || 'workflow_start'} onChange={(e) => updateConfig('sinceEvent', e.target.value)}>
                <option value="workflow_start">Since workflow started</option>
                <option value="lead_created">Since lead was created</option>
                <option value="last_activity">Since last activity</option>
              </StyledSelect>
            </FieldGroup>
          </div>
        )}

        {/* ── Match Logic ── */}
        <FieldGroup label="When multiple conditions exist" htmlFor="matchType" hint="Controls how this condition combines with others">
          <StyledSelect id="matchType" value={config.matchType as string || 'ALL'} onChange={(e) => updateConfig('matchType', e.target.value)}>
            <option value="ALL">ALL must pass (AND)</option>
            <option value="ANY">ANY can pass (OR)</option>
          </StyledSelect>
        </FieldGroup>

        {/* ── Branching ── */}
        <div className="border-t pt-3 mt-1 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What happens next?</p>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="If PASSES" htmlFor="trueBranch">
              <StyledSelect id="trueBranch" value={config.trueBranch as string || 'continue'} onChange={(e) => updateConfig('trueBranch', e.target.value)}>
                <option value="continue">Continue ▶</option>
                <option value="skip_one">Skip next step</option>
                <option value="stop">Stop workflow</option>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup label="If FAILS" htmlFor="falseBranch">
              <StyledSelect id="falseBranch" value={config.falseBranch as string || 'stop'} onChange={(e) => updateConfig('falseBranch', e.target.value)}>
                <option value="stop">Stop workflow ■</option>
                <option value="continue">Continue anyway</option>
                <option value="skip_one">Skip next step</option>
              </StyledSelect>
            </FieldGroup>
          </div>
        </div>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACTION CONFIG
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderActionConfig = () => {
    const actionType = ((config.actionType as string) || '').toLowerCase();

    // ── Send Email ──
    if (actionType.includes('email')) {
      return (
        <>
          <SectionHeader icon={Mail} title="Send an email to the lead" description="Compose a personalized email. Use [FirstName] and [LastName] as placeholders." />
          <FieldGroup label="Subject Line" htmlFor="subject" hint="Tip: Personalized subjects get 26% higher open rates">
            <Input
              id="subject"
              placeholder="e.g., Hi [FirstName], check this out!"
              value={String(config.subject || '')
                .replace(/\{\{lead\.firstName\}\}/gi, '[FirstName]')
                .replace(/\{\{lead\.lastName\}\}/gi, '[LastName]')}
              onChange={(e) => {
                const v = e.target.value
                  .replace(/\[FirstName\]/gi, '{{lead.firstName}}')
                  .replace(/\[LastName\]/gi, '{{lead.lastName}}');
                updateConfig('subject', v);
              }}
            />
          </FieldGroup>
          <FieldGroup label="Email Body" htmlFor="body" hint="Write your message. HTML is supported.">
            <textarea
              id="body"
              className="w-full p-3 border rounded-md min-h-[140px] bg-background text-foreground dark:border-border text-sm leading-relaxed"
              placeholder={"Hi [FirstName],\n\nThanks for your interest! I'd love to help you find the perfect property.\n\nBest regards,\nYour Agent"}
              value={config.body as string || ''}
              onChange={(e) => updateConfig('body', e.target.value)}
            />
          </FieldGroup>
          {config.body && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Preview</p>
              <div className="w-full p-3 border rounded-md bg-card dark:bg-background min-h-[80px] text-sm">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(
                  String(config.body)
                    .replace(/\{\{lead\.firstName\}\}/gi, '<strong>[FirstName]</strong>')
                    .replace(/\{\{lead\.lastName\}\}/gi, '<strong>[LastName]</strong>')
                )}} />
              </div>
            </div>
          )}
        </>
      );
    }

    // ── Send SMS ──
    if (actionType.includes('sms')) {
      const msg = config.message as string || '';
      const hasVars = /\{\{lead\.\w+\}\}|\[FirstName\]|\[LastName\]/i.test(msg);
      const charPercent = Math.round((msg.length / 160) * 100);
      return (
        <>
          <SectionHeader icon={MessageSquare} title="Send an SMS to the lead" description="Keep it under 160 characters to avoid multi-segment charges." />
          <FieldGroup label="Message" htmlFor="message">
            <textarea
              id="message"
              className="w-full p-3 border rounded-md bg-background text-foreground dark:border-border text-sm"
              placeholder="Hi {{lead.firstName}}! We have new listings in your area. Reply YES to learn more."
              maxLength={160}
              rows={3}
              value={msg
                .replace(/\{\{lead\.firstName\}\}/gi, '[FirstName]')
                .replace(/\{\{lead\.lastName\}\}/gi, '[LastName]')}
              onChange={(e) => {
                const v = e.target.value
                  .replace(/\[FirstName\]/gi, '{{lead.firstName}}')
                  .replace(/\[LastName\]/gi, '{{lead.lastName}}');
                updateConfig('message', v);
              }}
            />
          </FieldGroup>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{msg.length}/160 characters</span>
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${charPercent > 90 ? 'bg-destructive' : charPercent > 75 ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${Math.min(100, charPercent)}%` }}
              />
            </div>
          </div>
          {hasVars && msg.length > 120 && (
            <div className="flex items-start gap-1.5 text-xs text-warning p-2 bg-warning/10 rounded-md">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>Variables like [FirstName] expand at send time and may push the message over 160 chars.</span>
            </div>
          )}
        </>
      );
    }

    // ── Add / Remove Tag ──
    if (actionType.includes('tag')) {
      const isRemove = actionType.includes('remove');
      return (
        <>
          <SectionHeader icon={Tag} title={isRemove ? 'Remove a tag from the lead' : 'Add a tag to the lead'} description={isRemove ? 'Remove a specific label from the lead.' : 'Label the lead for easy filtering and segmentation.'} />
          <FieldGroup label="Tag Name" htmlFor="tag-name" hint={isRemove ? 'The exact tag name to remove' : 'e.g. "Hot Lead", "Buyer", "VIP"'}>
            <Input id="tag-name" placeholder="e.g., Hot Lead" value={config.tagName as string || ''} onChange={(e) => updateConfig('tagName', e.target.value)} />
          </FieldGroup>
          {!isRemove && (
            <FieldGroup label="Tag Color" htmlFor="tag-color">
              <div className="flex items-center gap-3">
                <Input id="tag-color" type="color" className="w-12 h-9 p-1 cursor-pointer" value={config.tagColor as string || '#3B82F6'} onChange={(e) => updateConfig('tagColor', e.target.value)} />
                <Badge style={{ backgroundColor: config.tagColor as string || '#3B82F6', color: 'white' }} className="text-xs">
                  {config.tagName as string || 'Preview'}
                </Badge>
              </div>
            </FieldGroup>
          )}
        </>
      );
    }

    // ── Update Lead ──
    if (actionType.includes('update') && !actionType.includes('score')) {
      const field = config.updateField as string || '';
      return (
        <>
          <SectionHeader icon={UserCircle} title="Update a lead field" description="Change a property on the lead record." />
          <FieldGroup label="Which field?" htmlFor="update-field">
            <StyledSelect id="update-field" value={field} onChange={(e) => {
              const f = e.target.value;
              updateConfig('updateField', f);
              updateConfig('updateValue', '');
              if (f) updateConfig('updates', { [f]: '' });
            }}>
              <option value="">-- Choose a field --</option>
              <optgroup label="Pipeline">
                <option value="status">Status</option>
                <option value="score">Score</option>
                <option value="priority">Priority</option>
                <option value="source">Source</option>
              </optgroup>
              <optgroup label="Contact Info">
                <option value="firstName">First Name</option>
                <option value="lastName">Last Name</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </optgroup>
              <optgroup label="Location">
                <option value="city">City</option>
                <option value="state">State</option>
              </optgroup>
              <optgroup label="Other">
                <option value="notes">Notes</option>
              </optgroup>
            </StyledSelect>
          </FieldGroup>
          {field && (
            <FieldGroup label="New Value" htmlFor="update-value">
              {field === 'status' ? (
                <StyledSelect id="update-value" value={config.updateValue as string || ''} onChange={(e) => { updateConfig('updateValue', e.target.value); updateConfig('updates', { [field]: e.target.value }); }}>
                  <option value="">-- Pick status --</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="NEGOTIATING">Negotiating</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </StyledSelect>
              ) : field === 'priority' ? (
                <StyledSelect id="update-value" value={config.updateValue as string || ''} onChange={(e) => { updateConfig('updateValue', e.target.value); updateConfig('updates', { [field]: e.target.value }); }}>
                  <option value="">-- Pick priority --</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </StyledSelect>
              ) : field === 'score' ? (
                <Input id="update-value" type="number" min={0} max={100} placeholder="0 – 100" value={config.updateValue as string || ''} onChange={(e) => { updateConfig('updateValue', e.target.value); updateConfig('updates', { [field]: e.target.value }); }} />
              ) : (
                <Input id="update-value" placeholder={`Enter new ${field}`} value={config.updateValue as string || ''} onChange={(e) => { updateConfig('updateValue', e.target.value); updateConfig('updates', { [field]: e.target.value }); }} />
              )}
            </FieldGroup>
          )}
        </>
      );
    }

    // ── Create Task ──
    if (actionType.includes('task')) {
      const dueDateMode = (config.dueDateMode as string) || 'relative';
      return (
        <>
          <SectionHeader icon={FileText} title="Create a follow-up task" description="Automatically create a to-do item for your team." />
          <FieldGroup label="Task Title" htmlFor="task-title" hint="What needs to be done?">
            <Input id="task-title" placeholder="e.g., Call lead back" value={config.title as string || config.taskTitle as string || ''} onChange={(e) => updateConfig('title', e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Description (optional)" htmlFor="task-description">
            <textarea id="task-description" className="w-full p-2 border rounded-md bg-background text-foreground dark:border-border text-sm" placeholder="Add context or instructions..." rows={2} value={config.description as string || config.taskDescription as string || ''} onChange={(e) => updateConfig('description', e.target.value)} />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Priority" htmlFor="task-priority">
              <StyledSelect id="task-priority" value={config.priority as string || 'medium'} onChange={(e) => updateConfig('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </StyledSelect>
            </FieldGroup>
            <FieldGroup label="Due Date" htmlFor="due-date-mode">
              <StyledSelect id="due-date-mode" value={dueDateMode} onChange={(e) => updateConfig('dueDateMode', e.target.value)}>
                <option value="relative">Relative</option>
                <option value="absolute">Specific date</option>
              </StyledSelect>
            </FieldGroup>
          </div>
          {dueDateMode === 'relative' ? (
            <FieldGroup label="Due in how many days?" htmlFor="due-date-offset" hint="Days after the workflow triggers">
              <div className="flex items-center gap-2">
                <Input id="due-date-offset" type="number" min={1} max={365} className="w-24" placeholder="3" value={config.dueDateOffset as number || ''} onChange={(e) => updateConfig('dueDateOffset', e.target.value ? parseInt(e.target.value) : '')} />
                <span className="text-sm text-muted-foreground">days from trigger</span>
              </div>
            </FieldGroup>
          ) : (
            <FieldGroup label="Specific Due Date" htmlFor="task-due-date">
              <Input id="task-due-date" type="date" value={config.dueDate as string || config.taskDueDate as string || ''} onChange={(e) => updateConfig('dueDate', e.target.value)} />
            </FieldGroup>
          )}
        </>
      );
    }

    // ── Assign Lead ──
    if (actionType.includes('assign')) {
      const strategy = config.strategy as string || 'specific';
      return (
        <>
          <SectionHeader icon={UserPlus} title="Assign this lead to a team member" description="Route the lead to the right person automatically." />
          <FieldGroup label="Assignment Method" htmlFor="assign-strategy">
            <StyledSelect id="assign-strategy" value={strategy} onChange={(e) => updateConfig('strategy', e.target.value)}>
              <option value="specific">Assign to a specific person</option>
              <option value="round_robin">Round Robin (rotate evenly)</option>
              <option value="least_busy">Least Busy (fewest active leads)</option>
            </StyledSelect>
          </FieldGroup>
          {strategy === 'specific' && (
            <FieldGroup label="Team Member" htmlFor="assign-user" hint="Enter the email or user ID">
              <Input id="assign-user" placeholder="e.g., jane@company.com" value={config.userId as string || ''} onChange={(e) => updateConfig('userId', e.target.value)} />
            </FieldGroup>
          )}
          {strategy !== 'specific' && (
            <HelpTip>
              {strategy === 'round_robin'
                ? 'Leads will be distributed evenly across all active team members.'
                : 'Each new lead goes to the team member with the fewest assigned leads.'}
            </HelpTip>
          )}
        </>
      );
    }

    // ── Send Notification ──
    if (actionType.includes('notification') || actionType.includes('notify')) {
      return (
        <>
          <SectionHeader icon={Bell} title="Send a notification to your team" description="Alert team members via in-app, email, or both." />
          <FieldGroup label="Title" htmlFor="notification-title" hint="Short, attention-grabbing headline">
            <Input id="notification-title" placeholder="e.g., Hot Lead Alert!" value={config.title as string || ''} onChange={(e) => updateConfig('title', e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Message" htmlFor="notification-message">
            <textarea id="notification-message" className="w-full p-2 border rounded-md min-h-[60px] bg-background text-foreground dark:border-border text-sm" placeholder="e.g., A lead just scored above 80 — reach out ASAP!" value={config.message as string || ''} onChange={(e) => updateConfig('message', e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Delivery Channel" htmlFor="notification-channel">
            <StyledSelect id="notification-channel" value={config.channel as string || 'in_app'} onChange={(e) => updateConfig('channel', e.target.value)}>
              <option value="in_app">In-App only</option>
              <option value="email">Email only</option>
              <option value="both">Both In-App + Email</option>
            </StyledSelect>
          </FieldGroup>
        </>
      );
    }

    // ── Add to Campaign ──
    if (actionType.includes('campaign')) {
      return (
        <>
          <SectionHeader icon={Send} title="Add lead to a campaign" description="Automatically enroll this lead in a marketing campaign." />
          <FieldGroup label="Campaign ID" htmlFor="campaign-id" hint="Paste the ID of the campaign">
            <Input id="campaign-id" placeholder="e.g., cm3abc123..." value={config.campaignId as string || ''} onChange={(e) => updateConfig('campaignId', e.target.value)} />
          </FieldGroup>
        </>
      );
    }

    // ── Update Score ──
    if (actionType.includes('score')) {
      const scoreVal = config.scoreChange as number;
      return (
        <>
          <SectionHeader icon={TrendingUp} title="Adjust the lead's score" description="Increase or decrease the engagement score." />
          <FieldGroup label="Score Change" htmlFor="score-change" hint="Positive to increase, negative to decrease">
            <div className="flex items-center gap-2">
              <Input id="score-change" type="number" className="w-28" placeholder="e.g., +10" value={scoreVal ?? ''} onChange={(e) => updateConfig('scoreChange', parseInt(e.target.value) || 0)} />
              <span className="text-sm text-muted-foreground">points</span>
              {scoreVal != null && scoreVal !== 0 && (
                <Badge variant="outline" className={scoreVal > 0 ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}>
                  {scoreVal > 0 ? `+${scoreVal}` : scoreVal}
                </Badge>
              )}
            </div>
          </FieldGroup>
          <FieldGroup label="Reason (optional)" htmlFor="score-reason" hint="Helps your team understand why the score changed">
            <Input id="score-reason" placeholder="e.g., Opened email, Attended showing" value={config.reason as string || ''} onChange={(e) => updateConfig('reason', e.target.value)} />
          </FieldGroup>
        </>
      );
    }

    // ── Webhook Action ──
    if (actionType.includes('webhook')) {
      const hdrs = config.headers as string || '';
      let hdrsOk = true;
      if (hdrs.trim()) {
        try { const p = JSON.parse(hdrs); hdrsOk = typeof p === 'object' && !Array.isArray(p); } catch { hdrsOk = false; }
      }
      return (
        <>
          <SectionHeader icon={Globe} title="Call an external webhook" description="Send data to an external URL when this step runs." />
          <FieldGroup label="URL" htmlFor="webhook-url" hint="Must start with https://">
            <Input id="webhook-url" placeholder="https://example.com/webhook" value={config.url as string || ''} onChange={(e) => updateConfig('url', e.target.value)} />
          </FieldGroup>
          <FieldGroup label="HTTP Method" htmlFor="webhook-method">
            <StyledSelect id="webhook-method" value={config.method as string || 'POST'} onChange={(e) => updateConfig('method', e.target.value)}>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </StyledSelect>
          </FieldGroup>
          <FieldGroup label="Headers (optional)" htmlFor="webhook-headers" hint='JSON object, e.g. {"Authorization": "Bearer xxx"}'>
            <textarea
              id="webhook-headers"
              className={`w-full p-2 border rounded-md font-mono text-xs min-h-[50px] bg-background dark:border-border ${!hdrsOk ? 'border-destructive' : ''}`}
              placeholder={'{\n  "Authorization": "Bearer xxx"\n}'}
              value={hdrs}
              onChange={(e) => updateConfig('headers', e.target.value)}
            />
            {!hdrsOk && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Invalid JSON — must be a JSON object
              </p>
            )}
          </FieldGroup>
        </>
      );
    }

    // ── Fallback ──
    return <SectionHeader icon={Play} title="Action step" description="This action will execute when the workflow reaches this point." />;
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // DELAY CONFIG
  // ═══════════════════════════════════════════════════════════════════════════════

  const legacyConvertedRef = useRef<string | null>(null);

  // Legacy duration conversion (seconds → human units) — must be at component level for hooks rules
  useEffect(() => {
    const dm = (config.delayMode as string) || (node.label.toLowerCase().includes('schedule') ? 'schedule' : 'relative');
    const dur = config.duration as number || 1;
    const unit = config.unit as string;
    if (dm === 'relative' && !unit && dur > 60 && legacyConvertedRef.current !== node.id) {
      legacyConvertedRef.current = node.id;
      if (dur % 86400 === 0) setConfig(prev => ({ ...prev, duration: dur / 86400, unit: 'days' }));
      else if (dur % 3600 === 0) setConfig(prev => ({ ...prev, duration: dur / 3600, unit: 'hours' }));
      else if (dur % 60 === 0) setConfig(prev => ({ ...prev, duration: dur / 60, unit: 'minutes' }));
    }
  }, [node.id, node.label, config.delayMode, config.unit, config.duration]);

  const renderDelayConfig = () => {
    const isScheduleMode = node.label.toLowerCase().includes('schedule') || config.delayMode === 'schedule';
    const delayMode = (config.delayMode as string) || (isScheduleMode ? 'schedule' : 'relative');

    const dur = config.duration as number || 1;
    const unit = config.unit as string || 'minutes';

    return (
      <>
        <SectionHeader icon={Clock} title="Pause the workflow" description="Wait for a duration or until a specific date before continuing." />

        <FieldGroup label="Wait type" htmlFor="delayMode">
          <StyledSelect id="delayMode" value={delayMode} onChange={(e) => updateConfig('delayMode', e.target.value)}>
            <option value="relative">Wait for a set amount of time</option>
            <option value="schedule">Wait until a specific date &amp; time</option>
          </StyledSelect>
        </FieldGroup>

        {delayMode === 'relative' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Wait</span>
              <Input id="duration" type="number" min={1} className="w-20" value={dur} onChange={(e) => updateConfig('duration', parseInt(e.target.value) || 1)} />
              <StyledSelect id="unit" value={unit} onChange={(e) => updateConfig('unit', e.target.value)}>
                <option value="minutes">{dur === 1 ? 'minute' : 'minutes'}</option>
                <option value="hours">{dur === 1 ? 'hour' : 'hours'}</option>
                <option value="days">{dur === 1 ? 'day' : 'days'}</option>
                <option value="weeks">{dur === 1 ? 'week' : 'weeks'}</option>
              </StyledSelect>
              <span className="text-sm text-muted-foreground">then continue</span>
            </div>
            <HelpTip>The workflow will pause here for {dur} {unit}, then automatically move to the next step.</HelpTip>
          </>
        ) : (
          <>
            <FieldGroup label="Resume at" htmlFor="scheduledFor">
              <Input id="scheduledFor" type="datetime-local" value={config.scheduledFor as string || ''} onChange={(e) => updateConfig('scheduledFor', e.target.value)} />
            </FieldGroup>
            <HelpTip>The workflow will pause until this exact date and time, then continue.</HelpTip>
          </>
        )}
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  const typeInfo = nodeTypeConfig[node.type] || nodeTypeConfig.action;
  const TypeIcon = typeInfo.icon;

  return (
    <Card className="shadow-lg border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
              <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0 ${typeInfo.color}`}>
                  {typeInfo.label}
                </Badge>
              </div>
              <p className="text-base font-semibold leading-tight truncate">{nodeLabel || 'Untitled Step'}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0 -mt-1">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Rename */}
        <details className="group">
          <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span> Rename this step
          </summary>
          <div className="mt-2">
            <Input id="node-label" value={nodeLabel} onChange={(e) => setNodeLabel(e.target.value)} placeholder="Step name" />
          </div>
        </details>

        {/* Node-specific fields */}
        {renderConfigFields()}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-xs font-medium text-destructive mb-1">Please fix the following:</p>
            <ul className="text-xs text-destructive/80 space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i} className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Save / Cancel */}
        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NodeConfigPanel;
