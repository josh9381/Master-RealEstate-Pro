import {
  Filter, Mail, MessageSquare, UserPlus, Tag, Clock, Bell,
  UserCircle, BarChart, Calendar, FileText, Send, Shield, Star, Globe,
  Users, Zap, Hash, TrendingUp, MousePointer, Search
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useState } from 'react';

export type ComponentCategory = 'triggers' | 'conditions' | 'actions' | 'utilities';

export interface WorkflowComponent {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  category: ComponentCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  config?: Record<string, unknown>;
}

interface WorkflowComponentLibraryProps {
  onComponentSelect?: (component: WorkflowComponent) => void;
  onComponentDragStart?: (component: WorkflowComponent) => void;
  mode?: 'click' | 'drag';
}

const triggers: WorkflowComponent[] = [
  {
    id: 'lead-created',
    type: 'trigger',
    category: 'triggers',
    label: 'Lead Created',
    description: 'Triggers when a new lead is added to the system',
    icon: UserPlus,
    config: { triggerType: 'LEAD_CREATED' },
  },
  {
    id: 'lead-status-changed',
    type: 'trigger',
    category: 'triggers',
    label: 'Lead Status Changed',
    description: 'Triggers when lead status changes (e.g., New → Qualified)',
    icon: BarChart,
    config: { triggerType: 'LEAD_STATUS_CHANGED' },
  },
  {
    id: 'email-opened',
    type: 'trigger',
    category: 'triggers',
    label: 'Email Opened',
    description: 'Triggers when a lead opens an email',
    icon: Mail,
    config: { triggerType: 'EMAIL_OPENED' },
  },
  {
    id: 'score-threshold',
    type: 'trigger',
    category: 'triggers',
    label: 'Score Threshold',
    description: 'Triggers when lead score crosses a threshold',
    icon: Star,
    config: { triggerType: 'SCORE_THRESHOLD' },
  },
  {
    id: 'time-based',
    type: 'trigger',
    category: 'triggers',
    label: 'Time-Based',
    description: 'Triggers at scheduled times (daily, weekly, etc.)',
    icon: Clock,
    config: { triggerType: 'TIME_BASED' },
  },
  {
    id: 'webhook',
    type: 'trigger',
    category: 'triggers',
    label: 'Webhook',
    description: 'Triggered by an external HTTP request',
    icon: Globe,
    config: { triggerType: 'WEBHOOK' },
  },
  {
    id: 'lead-assigned',
    type: 'trigger',
    category: 'triggers',
    label: 'Lead Assigned',
    description: 'Triggers when a lead is assigned to a team member',
    icon: Users,
    config: { triggerType: 'LEAD_ASSIGNED' },
  },
  {
    id: 'campaign-completed',
    type: 'trigger',
    category: 'triggers',
    label: 'Campaign Completed',
    description: 'Triggers when a campaign finishes execution',
    icon: Zap,
    config: { triggerType: 'CAMPAIGN_COMPLETED' },
  },
  {
    id: 'tag-added',
    type: 'trigger',
    category: 'triggers',
    label: 'Tag Added',
    description: 'Triggers when a tag is added to a lead',
    icon: Hash,
    config: { triggerType: 'TAG_ADDED' },
  },
  {
    id: 'manual',
    type: 'trigger',
    category: 'triggers',
    label: 'Manual Trigger',
    description: 'Manually triggered by a user',
    icon: MousePointer,
    config: { triggerType: 'MANUAL' },
  },
];

const conditions: WorkflowComponent[] = [
  {
    id: 'check-lead-field',
    type: 'condition',
    category: 'conditions',
    label: 'Check Lead Field',
    description: 'Evaluate lead score, status, source, or any field',
    icon: Filter,
    config: { conditionType: 'lead_field' },
  },
  {
    id: 'condition-email-opened',
    type: 'condition',
    category: 'conditions',
    label: 'Email Opened',
    description: 'Check if lead opened an email',
    icon: Mail,
    config: { conditionType: 'email_opened' },
  },
  {
    id: 'link-clicked',
    type: 'condition',
    category: 'conditions',
    label: 'Link Clicked',
    description: 'Check if lead clicked a link in an email',
    icon: Shield,
    config: { conditionType: 'link_clicked' },
  },
  {
    id: 'time-elapsed',
    type: 'condition',
    category: 'conditions',
    label: 'Time Elapsed',
    description: 'Check if enough time has passed since an event',
    icon: Tag,
    config: { conditionType: 'time_elapsed', elapsedAmount: 1, elapsedUnit: 'hours', sinceEvent: 'workflow_start' },
  },
];

const actions: WorkflowComponent[] = [
  {
    id: 'send-email',
    type: 'action',
    category: 'actions',
    label: 'Send Email',
    description: 'Send an email to the lead',
    icon: Mail,
    config: { actionType: 'SEND_EMAIL' },
  },
  {
    id: 'send-sms',
    type: 'action',
    category: 'actions',
    label: 'Send SMS',
    description: 'Send an SMS message to the lead',
    icon: MessageSquare,
    config: { actionType: 'SEND_SMS' },
  },
  {
    id: 'update-lead',
    type: 'action',
    category: 'actions',
    label: 'Update Lead',
    description: 'Update lead fields (status, score, etc.)',
    icon: UserCircle,
    config: { actionType: 'UPDATE_LEAD' },
  },
  {
    id: 'add-tag',
    type: 'action',
    category: 'actions',
    label: 'Add Tag',
    description: 'Add a tag to the lead',
    icon: Tag,
    config: { actionType: 'ADD_TAG' },
  },
  {
    id: 'create-task',
    type: 'action',
    category: 'actions',
    label: 'Create Task',
    description: 'Create a follow-up task',
    icon: FileText,
    config: { actionType: 'CREATE_TASK' },
  },
  {
    id: 'assign-lead',
    type: 'action',
    category: 'actions',
    label: 'Assign Lead',
    description: 'Assign lead to a team member',
    icon: UserPlus,
    config: { actionType: 'ASSIGN_LEAD' },
  },
  {
    id: 'send-notification',
    type: 'action',
    category: 'actions',
    label: 'Send Notification',
    description: 'Send notification to team members',
    icon: Bell,
    config: { actionType: 'SEND_NOTIFICATION' },
  },
  {
    id: 'add-to-campaign',
    type: 'action',
    category: 'actions',
    label: 'Add to Campaign',
    description: 'Add lead to a marketing campaign',
    icon: Send,
    config: { actionType: 'ADD_TO_CAMPAIGN' },
  },
  {
    id: 'remove-tag',
    type: 'action',
    category: 'actions',
    label: 'Remove Tag',
    description: 'Remove a tag from the lead',
    icon: Tag,
    config: { actionType: 'REMOVE_TAG' },
  },
  {
    id: 'update-score',
    type: 'action',
    category: 'actions',
    label: 'Update Score',
    description: 'Update the lead score by a set amount',
    icon: TrendingUp,
    config: { actionType: 'UPDATE_SCORE' },
  },
  {
    id: 'webhook-action',
    type: 'action',
    category: 'actions',
    label: 'Webhook',
    description: 'Send data to an external webhook URL',
    icon: Globe,
    config: { actionType: 'WEBHOOK' },
  },
];

const utilities: WorkflowComponent[] = [
  {
    id: 'delay',
    type: 'delay',
    category: 'utilities',
    label: 'Delay',
    description: 'Wait for a specified duration before continuing',
    icon: Clock,
    config: { delayMode: 'relative', duration: 1, unit: 'hours' },
  },
  {
    id: 'schedule',
    type: 'delay',
    category: 'utilities',
    label: 'Schedule',
    description: 'Wait until a specific date/time before continuing',
    icon: Calendar,
    config: { delayMode: 'schedule' },
  },
];

const allComponents: Record<ComponentCategory, WorkflowComponent[]> = {
  triggers,
  conditions,
  actions,
  utilities,
};

const categoryLabels: Record<ComponentCategory, string> = {
  triggers: 'Triggers',
  conditions: 'Conditions',
  actions: 'Actions',
  utilities: 'Utilities',
};

const categoryDescriptions: Record<ComponentCategory, string> = {
  triggers: 'Start your workflow based on specific events',
  conditions: 'Control flow with conditional logic',
  actions: 'Perform actions on leads and data',
  utilities: 'Time delays and scheduling',
};

const categoryColors: Record<ComponentCategory, string> = {
  triggers: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  conditions: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  actions: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  utilities: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export const WorkflowComponentLibrary: React.FC<WorkflowComponentLibraryProps> = ({
  onComponentSelect,
  onComponentDragStart,
  mode = 'click',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleClick = (component: WorkflowComponent) => {
    // Only trigger select in click mode, not in drag mode
    if (mode === 'click' && onComponentSelect) {
      onComponentSelect(component);
    } else if (mode === 'drag') {
      // In drag mode - use drag & drop instead of clicking
    } else {
      // onComponentSelect is not defined
    }
  };

  const handleDragStart = (e: React.DragEvent, component: WorkflowComponent) => {
    if (mode !== 'drag') {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(component));
    
    // Create a custom drag image and clean it up after drag ends
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    const cleanup = () => {
      if (dragImage.parentNode) {
        dragImage.parentNode.removeChild(dragImage);
      }
      e.currentTarget?.removeEventListener('dragend', cleanup);
    };
    e.currentTarget.addEventListener('dragend', cleanup);
    
    if (onComponentDragStart) {
      onComponentDragStart(component);
    }
  };

  return (
    <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
      {/* Search */}
      <div className="relative mb-4 pr-4">
        <Input
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-6 pr-4">
        {(Object.keys(allComponents) as ComponentCategory[]).map((category) => {
          const filteredComponents = allComponents[category].filter(c => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
          });
          if (filteredComponents.length === 0) return null;
          return (
          <div key={category}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">{categoryLabels[category]}</h3>
                <Badge className={`text-xs ${categoryColors[category]}`}>
                  {filteredComponents.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {categoryDescriptions[category]}
              </p>
            </div>

            <div className="space-y-2">
              {filteredComponents.map((component) => {
                const Icon = component.icon;
                return (
                  <Card
                    key={component.id}
                    className={`
                      hover:shadow-md transition-all duration-200
                      ${mode === 'drag' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:bg-accent'}
                    `}
                    draggable={mode === 'drag'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick(component);
                    }}
                    onDragStart={(e) => handleDragStart(e, component)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-background">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium leading-none mb-1">
                            {component.label}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {component.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          );
        })}
        {searchQuery && (Object.keys(allComponents) as ComponentCategory[]).every(cat => 
          allComponents[cat].filter(c => {
            const q = searchQuery.toLowerCase();
            return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
          }).length === 0
        ) && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No components match &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowComponentLibrary;
