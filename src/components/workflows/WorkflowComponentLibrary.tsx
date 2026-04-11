import {
  Filter, Mail, MessageSquare, UserPlus, Tag, Clock, Bell,
  UserCircle, BarChart, Calendar, FileText, Send, Shield, Star, Globe,
  Users, Zap, Hash, TrendingUp, MousePointer, Search, GripVertical, Check
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useState, useRef } from 'react';

export type ComponentCategory = 'all' | 'triggers' | 'conditions' | 'actions' | 'utilities';

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

const allComponentsList: WorkflowComponent[] = [
  ...triggers,
  ...conditions,
  ...actions,
  ...utilities,
];

const categoryFilters: { key: ComponentCategory; label: string; color: string; activeColor: string; count: number }[] = [
  { key: 'all', label: 'All', color: 'bg-muted text-foreground dark:bg-card dark:text-muted-foreground', activeColor: 'bg-foreground text-background', count: allComponentsList.length },
  { key: 'triggers', label: 'Triggers', color: 'bg-primary/10 text-primary', activeColor: 'bg-primary text-white', count: triggers.length },
  { key: 'conditions', label: 'Conditions', color: 'bg-warning/10 text-warning', activeColor: 'bg-warning text-white', count: conditions.length },
  { key: 'actions', label: 'Actions', color: 'bg-success/10 text-success', activeColor: 'bg-success text-white', count: actions.length },
  { key: 'utilities', label: 'Utilities', color: 'bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary', activeColor: 'bg-primary text-primary-foreground', count: utilities.length },
];

const categoryBorderColor: Record<string, string> = {
  triggers: 'border-l-info',
  conditions: 'border-l-warning',
  actions: 'border-l-success',
  utilities: 'border-l-primary',
};

const categoryIconBg: Record<string, string> = {
  triggers: 'bg-primary/10 text-primary',
  conditions: 'bg-warning/10 text-warning',
  actions: 'bg-success/10 text-success',
  utilities: 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary',
};

export const WorkflowComponentLibrary: React.FC<WorkflowComponentLibraryProps> = ({
  onComponentSelect,
  onComponentDragStart,
  mode = 'click',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ComponentCategory>('all');
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleClick = (component: WorkflowComponent) => {
    if (onComponentSelect) {
      onComponentSelect(component);
      // Flash "added" feedback
      setJustAdded(component.id);
      clearTimeout(addedTimer.current);
      addedTimer.current = setTimeout(() => setJustAdded(null), 1200);
    }
  };

  const handleDragStart = (e: React.DragEvent, component: WorkflowComponent) => {
    if (mode !== 'drag') {
      e.preventDefault();
      return;
    }
    
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(component));
    
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.left = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    requestAnimationFrame(() => {
      if (dragImage.parentNode) {
        dragImage.parentNode.removeChild(dragImage);
      }
    });
    
    if (onComponentDragStart) {
      onComponentDragStart(component);
    }
  };

  // Filter + search
  const filteredComponents = allComponentsList.filter(c => {
    const matchesFilter = activeFilter === 'all' || c.category === activeFilter;
    if (!matchesFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });

  return (
    <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
      {/* Search */}
      <div className="relative mb-3">
        <Input
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 text-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {categoryFilters.map(f => {
          const isActive = activeFilter === f.key;
          const matchCount = f.key === 'all'
            ? allComponentsList.filter(c => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
              }).length
            : allComponentsList.filter(c => {
                if (c.category !== f.key) return false;
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
              }).length;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`
                inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                transition-all duration-150 border
                ${isActive
                  ? `${f.activeColor} border-transparent shadow-sm`
                  : `${f.color} border-transparent hover:border-border`
                }
              `}
            >
              {f.label}
              <span className={`text-[10px] ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                {matchCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Component List */}
      <div className="space-y-1">
        {filteredComponents.map((component) => {
          const Icon = component.icon;
          const isAdded = justAdded === component.id;
          const borderColor = categoryBorderColor[component.category] || 'border-l-muted-foreground';
          const iconBg = categoryIconBg[component.category] || 'bg-muted text-muted-foreground';

          return (
            <div
              key={component.id}
              className={`
                flex items-center gap-2 px-2 py-2 rounded-md border-l-[3px]
                transition-all duration-200 group
                ${borderColor}
                ${isAdded
                  ? 'bg-success/10 border border-l-[3px] border-success/30'
                  : 'bg-background hover:bg-accent/50 border border-l-[3px] border-transparent hover:border-border'
                }
                ${mode === 'drag' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
              `}
              draggable={mode === 'drag'}
              onClick={(e) => {
                e.stopPropagation();
                handleClick(component);
              }}
              onDragStart={(e) => handleDragStart(e, component)}
              title={component.description}
            >
              {/* Drag grip (drag mode only) */}
              {mode === 'drag' && (
                <GripVertical className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground/70 flex-shrink-0" />
              )}

              {/* Icon */}
              <div className={`p-1.5 rounded ${iconBg} flex-shrink-0`}>
                <Icon className="h-3.5 w-3.5" />
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium leading-tight truncate">
                  {component.label}
                </h4>
                <p className="text-[10px] text-muted-foreground leading-tight truncate">
                  {component.description}
                </p>
              </div>

              {/* Added feedback */}
              {isAdded && (
                <div className="flex-shrink-0">
                  <Check className="h-3.5 w-3.5 text-success" />
                </div>
              )}
            </div>
          );
        })}

        {filteredComponents.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No components match &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowComponentLibrary;
