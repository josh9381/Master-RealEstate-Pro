import {
  Filter, Mail, MessageSquare, UserPlus, Tag, Clock, Bell,
  UserCircle, BarChart, Calendar, FileText, Send, Shield, Star
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

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
  },
  {
    id: 'lead-status-changed',
    type: 'trigger',
    category: 'triggers',
    label: 'Lead Status Changed',
    description: 'Triggers when lead status changes (e.g., New → Qualified)',
    icon: BarChart,
  },
  {
    id: 'email-opened',
    type: 'trigger',
    category: 'triggers',
    label: 'Email Opened',
    description: 'Triggers when a lead opens an email',
    icon: Mail,
  },
  {
    id: 'score-threshold',
    type: 'trigger',
    category: 'triggers',
    label: 'Score Threshold',
    description: 'Triggers when lead score crosses a threshold',
    icon: Star,
  },
  {
    id: 'time-based',
    type: 'trigger',
    category: 'triggers',
    label: 'Time-Based',
    description: 'Triggers at scheduled times (daily, weekly, etc.)',
    icon: Clock,
  },
];

const conditions: WorkflowComponent[] = [
  {
    id: 'check-lead-score',
    type: 'condition',
    category: 'conditions',
    label: 'Check Lead Score',
    description: 'Evaluate if lead score meets criteria',
    icon: Filter,
  },
  {
    id: 'check-lead-status',
    type: 'condition',
    category: 'conditions',
    label: 'Check Lead Status',
    description: 'Check current lead status',
    icon: Shield,
  },
  {
    id: 'has-tag',
    type: 'condition',
    category: 'conditions',
    label: 'Has Tag',
    description: 'Check if lead has specific tag',
    icon: Tag,
  },
  {
    id: 'email-engagement',
    type: 'condition',
    category: 'conditions',
    label: 'Email Engagement',
    description: 'Check email open/click history',
    icon: Mail,
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
  },
  {
    id: 'send-sms',
    type: 'action',
    category: 'actions',
    label: 'Send SMS',
    description: 'Send an SMS message to the lead',
    icon: MessageSquare,
  },
  {
    id: 'update-lead',
    type: 'action',
    category: 'actions',
    label: 'Update Lead',
    description: 'Update lead fields (status, score, etc.)',
    icon: UserCircle,
  },
  {
    id: 'add-tag',
    type: 'action',
    category: 'actions',
    label: 'Add Tag',
    description: 'Add a tag to the lead',
    icon: Tag,
  },
  {
    id: 'create-task',
    type: 'action',
    category: 'actions',
    label: 'Create Task',
    description: 'Create a follow-up task',
    icon: FileText,
  },
  {
    id: 'assign-lead',
    type: 'action',
    category: 'actions',
    label: 'Assign Lead',
    description: 'Assign lead to a team member',
    icon: UserPlus,
  },
  {
    id: 'send-notification',
    type: 'action',
    category: 'actions',
    label: 'Send Notification',
    description: 'Send notification to team members',
    icon: Bell,
  },
  {
    id: 'add-to-campaign',
    type: 'action',
    category: 'actions',
    label: 'Add to Campaign',
    description: 'Add lead to a marketing campaign',
    icon: Send,
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
  },
  {
    id: 'schedule',
    type: 'delay',
    category: 'utilities',
    label: 'Schedule',
    description: 'Schedule next action for specific date/time',
    icon: Calendar,
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
  const handleClick = (component: WorkflowComponent) => {
    if (mode === 'click' && onComponentSelect) {
      onComponentSelect(component);
    }
  };

  const handleDragStart = (e: React.DragEvent, component: WorkflowComponent) => {
    if (mode === 'drag' && onComponentDragStart) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/json', JSON.stringify(component));
      onComponentDragStart(component);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] overflow-y-auto">
      <div className="space-y-6 pr-4">
        {(Object.keys(allComponents) as ComponentCategory[]).map((category) => (
          <div key={category}>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">{categoryLabels[category]}</h3>
                <Badge className={`text-xs ${categoryColors[category]}`}>
                  {allComponents[category].length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {categoryDescriptions[category]}
              </p>
            </div>

            <div className="space-y-2">
              {allComponents[category].map((component) => {
                const Icon = component.icon;
                return (
                  <Card
                    key={component.id}
                    className={`
                      hover:shadow-md transition-all duration-200
                      ${mode === 'drag' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:bg-accent'}
                    `}
                    draggable={mode === 'drag'}
                    onClick={() => handleClick(component)}
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
        ))}
      </div>
    </div>
  );
};

export default WorkflowComponentLibrary;
