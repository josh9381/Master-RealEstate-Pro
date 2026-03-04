import { Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useState } from 'react';
import DOMPurify from 'dompurify';
import { WorkflowNodeData } from './WorkflowNode';

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

  const updateConfig = (key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(node.id, config);
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'trigger':
        return renderTriggerConfig();
      case 'condition':
        return renderConditionConfig();
      case 'action':
        return renderActionConfig();
      case 'delay':
        return renderDelayConfig();
      default:
        return null;
    }
  };

  const renderTriggerConfig = () => {
    const triggerType = node.label.toLowerCase();

    if (triggerType.includes('status')) {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="from-status">From Status (Optional)</Label>
            <select
              id="from-status"
              className="w-full p-2 border rounded-md"
              value={config.fromStatus as string || ''}
              onChange={(e) => updateConfig('fromStatus', e.target.value)}
            >
              <option value="">Any</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="NEGOTIATING">Negotiating</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-status">To Status</Label>
            <select
              id="to-status"
              className="w-full p-2 border rounded-md"
              value={config.toStatus as string || ''}
              onChange={(e) => updateConfig('toStatus', e.target.value)}
            >
              <option value="">Select status</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="NEGOTIATING">Negotiating</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
        </>
      );
    }

    if (triggerType.includes('score')) {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="threshold-type">Threshold Type</Label>
            <select
              id="threshold-type"
              className="w-full p-2 border rounded-md"
              value={config.thresholdType as string || 'above'}
              onChange={(e) => updateConfig('thresholdType', e.target.value)}
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
              <option value="equals">Equals</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="score-threshold">Score Threshold</Label>
            <Input
              id="score-threshold"
              type="number"
              min="0"
              max="100"
              value={config.scoreThreshold as number || 50}
              onChange={(e) => updateConfig('scoreThreshold', parseInt(e.target.value))}
            />
          </div>
        </>
      );
    }

    if (triggerType.includes('time')) {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule (Cron Expression)</Label>
            <Input
              id="schedule"
              placeholder="0 9 * * *"
              value={config.schedule as string || ''}
              onChange={(e) => updateConfig('schedule', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: "0 9 * * *" = Every day at 9 AM
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              className="w-full p-2 border rounded-md"
              value={config.timezone as string || 'UTC'}
              onChange={(e) => updateConfig('timezone', e.target.value)}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </>
      );
    }

    if (triggerType.includes('webhook')) {
      return (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
            <strong>Webhook Trigger</strong> — This workflow will be triggered by an external HTTP POST request.
            The webhook URL will be available after saving the workflow.
          </div>
          <p className="text-xs text-muted-foreground">
            Send a POST request with an optional <code>leadId</code> and <code>data</code> in the JSON body.
          </p>
        </div>
      );
    }

    return null;
  };

  const renderConditionConfig = () => {
    const conditionType = (config.conditionType as string) || 'lead_field';

    return (
      <>
        {/* Condition Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="conditionType">Condition Type</Label>
          <select
            id="conditionType"
            className="w-full p-2 border rounded-md"
            value={conditionType}
            onChange={(e) => updateConfig('conditionType', e.target.value)}
          >
            <option value="lead_field">Lead Field</option>
            <option value="email_opened">Email Opened</option>
            <option value="link_clicked">Link Clicked</option>
            <option value="time_elapsed">Time Elapsed</option>
          </select>
        </div>

        {/* Lead Field Condition */}
        {conditionType === 'lead_field' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="field">Field to Check</Label>
              <select
                id="field"
                className="w-full p-2 border rounded-md"
                value={config.field as string || ''}
                onChange={(e) => updateConfig('field', e.target.value)}
              >
                <option value="">Select field</option>
                <option value="score">Lead Score</option>
                <option value="status">Lead Status</option>
                <option value="source">Lead Source</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="firstName">First Name</option>
                <option value="lastName">Last Name</option>
                <option value="city">City</option>
                <option value="state">State</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator">Operator</Label>
              <select
                id="operator"
                className="w-full p-2 border rounded-md"
                value={config.operator as string || 'equals'}
                onChange={(e) => updateConfig('operator', e.target.value)}
              >
                <option value="equals">Equals</option>
                <option value="notEquals">Not Equals</option>
                <option value="greaterThan">Greater Than</option>
                <option value="lessThan">Less Than</option>
                <option value="greaterThanOrEqual">Greater Than or Equal</option>
                <option value="lessThanOrEqual">Less Than or Equal</option>
                <option value="contains">Contains</option>
                <option value="notContains">Does Not Contain</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                placeholder="Enter value"
                value={config.value as string || ''}
                onChange={(e) => updateConfig('value', e.target.value)}
              />
            </div>
          </>
        )}

        {/* Email Opened Condition */}
        {conditionType === 'email_opened' && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
              Checks if the lead has opened any email.
            </div>
            <div className="space-y-2">
              <Label htmlFor="withinHours">Within (hours, optional)</Label>
              <Input
                id="withinHours"
                type="number"
                min="0"
                placeholder="Leave empty for all time"
                value={config.withinHours as string || ''}
                onChange={(e) => updateConfig('withinHours', e.target.value ? parseInt(e.target.value) : '')}
              />
              <p className="text-xs text-muted-foreground">
                Only count opens within this many hours. Leave blank to check all time.
              </p>
            </div>
          </div>
        )}

        {/* Link Clicked Condition */}
        {conditionType === 'link_clicked' && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
              Checks if the lead has clicked any link in an email.
            </div>
            <div className="space-y-2">
              <Label htmlFor="withinHours">Within (hours, optional)</Label>
              <Input
                id="withinHours"
                type="number"
                min="0"
                placeholder="Leave empty for all time"
                value={config.withinHours as string || ''}
                onChange={(e) => updateConfig('withinHours', e.target.value ? parseInt(e.target.value) : '')}
              />
              <p className="text-xs text-muted-foreground">
                Only count clicks within this many hours. Leave blank to check all time.
              </p>
            </div>
          </div>
        )}

        {/* Time Elapsed Condition */}
        {conditionType === 'time_elapsed' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
              Checks if enough time has passed since a reference event.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="elapsedAmount">Duration</Label>
                <Input
                  id="elapsedAmount"
                  type="number"
                  min="1"
                  value={config.elapsedAmount as number || 1}
                  onChange={(e) => updateConfig('elapsedAmount', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="elapsedUnit">Unit</Label>
                <select
                  id="elapsedUnit"
                  className="w-full p-2 border rounded-md"
                  value={config.elapsedUnit as string || 'hours'}
                  onChange={(e) => updateConfig('elapsedUnit', e.target.value)}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sinceEvent">Since Event</Label>
              <select
                id="sinceEvent"
                className="w-full p-2 border rounded-md"
                value={config.sinceEvent as string || 'workflow_start'}
                onChange={(e) => updateConfig('sinceEvent', e.target.value)}
              >
                <option value="workflow_start">Workflow Started</option>
                <option value="lead_created">Lead Created</option>
                <option value="last_activity">Last Activity</option>
              </select>
            </div>
          </div>
        )}

        {/* Match type for multiple conditions */}
        <div className="space-y-2">
          <Label htmlFor="matchType">Logic (for multiple conditions)</Label>
          <select
            id="matchType"
            className="w-full p-2 border rounded-md"
            value={config.matchType as string || 'ALL'}
            onChange={(e) => updateConfig('matchType', e.target.value)}
          >
            <option value="ALL">All conditions must match (AND)</option>
            <option value="ANY">Any condition can match (OR)</option>
          </select>
        </div>
      </>
    );
  };

  const renderActionConfig = () => {
    const actionType = node.label.toLowerCase();

    if (actionType.includes('email')) {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Welcome [FirstName]!"
              value={String(config.subject || '')
                .replace(/\{\{lead\.firstName\}\}/gi, '[FirstName]')
                .replace(/\{\{lead\.lastName\}\}/gi, '[LastName]')
                .replace(/\{\{lead\.FirstName\}\}/gi, '[FirstName]')
                .replace(/\{\{lead\.LastName\}\}/gi, '[LastName]')}
              onChange={(e) => {
                // Convert back to template syntax for storage
                const value = e.target.value
                  .replace(/\[FirstName\]/gi, '{{lead.firstName}}')
                  .replace(/\[LastName\]/gi, '{{lead.lastName}}');
                updateConfig('subject', value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              💡 Type [FirstName] or [LastName] to personalize the subject
            </p>
          </div>
          <div className="space-y-2">
            <Label>Email Preview</Label>
            <div className="w-full p-4 border rounded-md bg-white dark:bg-gray-900 min-h-[120px] text-sm">
              {config.body ? (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(
                      String(config.body)
                        .replace(/\{\{lead\.firstName\}\}/gi, '[FirstName]')
                        .replace(/\{\{lead\.lastName\}\}/gi, '[LastName]')
                        .replace(/\{\{lead\.FirstName\}\}/gi, '[FirstName]')
                        .replace(/\{\{lead\.LastName\}\}/gi, '[LastName]')
                    )
                  }}
                />
              ) : (
                <p className="text-muted-foreground italic">Your email message will appear here...</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This is how your email will look to leads
            </p>
          </div>
          <details className="space-y-2">
            <summary className="text-sm font-medium cursor-pointer hover:text-primary">
              ✏️ Advanced: Edit HTML Source
            </summary>
            <textarea
              id="body"
              className="w-full p-2 border rounded-md min-h-[100px] font-mono text-xs bg-gray-50 dark:bg-gray-900"
              placeholder="Enter email HTML content..."
              value={config.body as string || ''}
              onChange={(e) => updateConfig('body', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use HTML tags and [FirstName], [LastName] for personalization
            </p>
          </details>
        </>
      );
    }

    if (actionType.includes('sms')) {
      return (
        <div className="space-y-2">
          <Label htmlFor="message">SMS Message</Label>
          <textarea
            id="message"
            className="w-full p-2 border rounded-md"
            placeholder="Enter SMS message (max 160 characters)"
            maxLength={160}
            value={config.message as string || ''}
            onChange={(e) => updateConfig('message', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {(config.message as string || '').length}/160 characters
          </p>
        </div>
      );
    }

    if (actionType.includes('tag')) {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="tag-name">Tag Name</Label>
            <Input
              id="tag-name"
              placeholder="Enter tag name"
              value={config.tagName as string || ''}
              onChange={(e) => updateConfig('tagName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag-color">Tag Color</Label>
            <Input
              id="tag-color"
              type="color"
              value={config.tagColor as string || '#3B82F6'}
              onChange={(e) => updateConfig('tagColor', e.target.value)}
            />
          </div>
        </>
      );
    }

    if (actionType.includes('update')) {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="update-field">Field to Update</Label>
            <select
              id="update-field"
              className="w-full p-2 border rounded-md"
              value={config.updateField as string || ''}
              onChange={(e) => updateConfig('updateField', e.target.value)}
            >
              <option value="">Select field</option>
              <option value="status">Status</option>
              <option value="score">Score</option>
              <option value="priority">Priority</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="update-value">New Value</Label>
            <Input
              id="update-value"
              placeholder="Enter new value"
              value={config.updateValue as string || ''}
              onChange={(e) => updateConfig('updateValue', e.target.value)}
            />
          </div>
        </>
      );
    }

    if (actionType.includes('task')) {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              id="task-title"
              placeholder="Enter task title"
              value={config.taskTitle as string || ''}
              onChange={(e) => updateConfig('taskTitle', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <textarea
              id="task-description"
              className="w-full p-2 border rounded-md"
              placeholder="Enter task description"
              value={config.taskDescription as string || ''}
              onChange={(e) => updateConfig('taskDescription', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due Date</Label>
            <Input
              id="task-due-date"
              type="date"
              value={config.taskDueDate as string || ''}
              onChange={(e) => updateConfig('taskDueDate', e.target.value)}
            />
          </div>
        </>
      );
    }

    return null;
  };

  const renderDelayConfig = () => {
    const isScheduleMode = node.label.toLowerCase().includes('schedule') || config.delayMode === 'schedule';
    const delayMode = (config.delayMode as string) || (isScheduleMode ? 'schedule' : 'relative');

    return (
      <>
        {/* Mode selector */}
        <div className="space-y-2">
          <Label htmlFor="delayMode">Delay Type</Label>
          <select
            id="delayMode"
            className="w-full p-2 border rounded-md"
            value={delayMode}
            onChange={(e) => updateConfig('delayMode', e.target.value)}
          >
            <option value="relative">Wait for (relative duration)</option>
            <option value="schedule">Wait until (specific date/time)</option>
          </select>
        </div>

        {delayMode === 'relative' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={config.duration as number || 1}
                onChange={(e) => updateConfig('duration', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <select
                id="unit"
                className="w-full p-2 border rounded-md"
                value={config.unit as string || 'minutes'}
                onChange={(e) => updateConfig('unit', e.target.value)}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="scheduledFor">Wait Until</Label>
            <Input
              id="scheduledFor"
              type="datetime-local"
              value={config.scheduledFor as string || ''}
              onChange={(e) => updateConfig('scheduledFor', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The workflow will pause until this exact date and time, then continue.
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Configure {node.label}</CardTitle>
            <CardDescription>
              Set up the details for this step
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="node-label">Node Label</Label>
          <Input
            id="node-label"
            value={node.label}
            disabled
            className="bg-muted"
          />
        </div>

        {renderConfigFields()}

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
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
