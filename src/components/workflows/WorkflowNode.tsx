import { Mail, MessageSquare, UserPlus, Tag, Clock, Zap, Filter, AlertCircle, Pencil, Trash2, Bell, Globe, TrendingUp, CheckSquare, GripVertical, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export type NodeType = 'trigger' | 'condition' | 'action' | 'delay';

export interface WorkflowNodeData {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  icon?: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
}

interface WorkflowNodeProps {
  node: WorkflowNodeData;
  isSelected?: boolean;
  onSelect?: (node: WorkflowNodeData) => void;
  onDelete?: (nodeId: string) => void;
  onEdit?: (node: WorkflowNodeData) => void;
  onDuplicate?: (nodeId: string) => void;
  onMoveUp?: (nodeId: string) => void;
  onMoveDown?: (nodeId: string) => void;
  isDraggable?: boolean;
  showDeleteConfirm?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

const getNodeIcon = (type: NodeType, iconName?: string, config?: Record<string, unknown>) => {
  if (iconName === 'mail') return Mail;
  if (iconName === 'sms') return MessageSquare;
  if (iconName === 'user') return UserPlus;
  if (iconName === 'tag') return Tag;

  // Determine icon from actionType or triggerType config
  const actionType = ((config?.actionType as string) || (config?.triggerType as string) || '').toLowerCase();
  if (actionType.includes('email')) return Mail;
  if (actionType.includes('sms') || actionType.includes('message')) return MessageSquare;
  if (actionType.includes('assign') || actionType.includes('user')) return UserPlus;
  if (actionType.includes('tag')) return Tag;
  if (actionType.includes('task')) return CheckSquare;
  if (actionType.includes('notification') || actionType.includes('notify') || actionType.includes('alert')) return Bell;
  if (actionType.includes('webhook') || actionType.includes('http')) return Globe;
  if (actionType.includes('score') || actionType.includes('trending')) return TrendingUp;
  if (actionType.includes('campaign')) return Mail;
  if (actionType.includes('lead_created') || actionType.includes('lead_assigned')) return UserPlus;
  if (actionType.includes('lead_status')) return TrendingUp;
  if (actionType.includes('email_opened')) return Mail;
  if (actionType.includes('score_threshold')) return TrendingUp;
  if (actionType.includes('time_based')) return Clock;
  if (actionType.includes('manual')) return Zap;
  
  switch (type) {
    case 'trigger':
      return Zap;
    case 'condition':
      return Filter;
    case 'action':
      return Zap;
    case 'delay':
      return Clock;
    default:
      return AlertCircle;
  }
};

const getNodeColor = (type: NodeType) => {
  switch (type) {
    case 'trigger':
      return 'border-l-4 border-l-primary bg-primary/5';
    case 'condition':
      return 'border-l-4 border-l-warning bg-warning/5';
    case 'action':
      return 'border-l-4 border-l-success bg-success/5';
    case 'delay':
      return 'border-l-4 border-l-primary bg-primary/5 dark:bg-primary/5';
    default:
      return 'border-l-4 border-l-muted-foreground';
  }
};

const getTypeBadgeColor = (type: NodeType) => {
  switch (type) {
    case 'trigger':
      return 'bg-primary/10 text-primary';
    case 'condition':
      return 'bg-warning/10 text-warning';
    case 'action':
      return 'bg-success/10 text-success';
    case 'delay':
      return 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  isSelected = false,
  onSelect,
  onDelete,
  onEdit,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isDraggable = false,
  showDeleteConfirm = false,
  isFirst = false,
  isLast = false,
}) => {
  const Icon = getNodeIcon(node.type, node.icon, node.config);
  const nodeColor = getNodeColor(node.type);

  const handleClick = () => {
    if (onSelect) {
      onSelect(node);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(node.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(node);
    }
  };

  return (
    <Card
      className={`
        relative
        ${nodeColor}
        ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}
        ${isDraggable ? 'cursor-move' : 'cursor-pointer'}
        transition-all duration-200
      `}
      onClick={handleClick}
      draggable={isDraggable}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle indicator for draggable nodes */}
          {isDraggable && (
            <div className="flex items-center self-stretch -ml-2 mr-0 opacity-40 hover:opacity-70 transition-opacity">
              <GripVertical className="h-4 w-4" />
            </div>
          )}

          {/* Icon */}
          <div className="p-2 rounded-lg bg-card shadow-sm">
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{node.label}</h4>
              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${getTypeBadgeColor(node.type)}`}>
                {node.type}
              </span>
            </div>
            {node.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {node.description}
              </p>
            )}
            {node.config && (() => {
              // Check if there are meaningful config values beyond just type identifiers
              const meaningfulKeys = Object.entries(node.config).filter(([key, val]) => {
                if (key === 'triggerType' || key === 'actionType' || key === 'conditionType' || key === 'delayMode' || key === 'label' || key === '_nodeLabel') return false;
                if (val === '' || val === null || val === undefined) return false;
                return true;
              });
              return meaningfulKeys.length > 0 ? (
                <div className="mt-2">
                  <p className="text-xs text-success">
                    ✓ Configured
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-xs text-warning">
                    ⚠ Needs configuration
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleEdit}
                title="Configure node"
              >
                <span className="sr-only">Edit</span>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onDuplicate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary"
                onClick={(e) => { e.stopPropagation(); onDuplicate(node.id); }}
                title="Duplicate node"
              >
                <span className="sr-only">Duplicate</span>
                <Copy className="h-3 w-3" />
              </Button>
            )}
            {/* Reorder buttons (click mode only) */}
            {onMoveUp && !isFirst && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15 dark:hover:text-primary"
                onClick={(e) => { e.stopPropagation(); onMoveUp(node.id); }}
                title="Move up"
              >
                <span className="sr-only">Move up</span>
                <ChevronUp className="h-3 w-3" />
              </Button>
            )}
            {onMoveDown && !isLast && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15 dark:hover:text-primary"
                onClick={(e) => { e.stopPropagation(); onMoveDown(node.id); }}
                title="Move down"
              >
                <span className="sr-only">Move down</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 ${showDeleteConfirm ? 'bg-destructive text-destructive-foreground animate-pulse' : 'hover:bg-destructive hover:text-destructive-foreground'}`}
                onClick={handleDelete}
                title={showDeleteConfirm ? 'Click again to confirm delete' : 'Delete node'}
              >
                <span className="sr-only">Delete</span>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Delete confirmation badge */}
        {showDeleteConfirm && (
          <div className="mt-2 px-2 py-1 bg-destructive/10 border border-destructive/30 rounded text-xs text-destructive font-medium text-center animate-in fade-in">
            Click delete again to confirm removal
          </div>
        )}

        {/* Connection points */}
        {(node.type !== 'trigger') && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-card border-2 border-border z-10" />
        )}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-card border-2 border-border z-10" />
      </CardContent>
    </Card>
  );
};

export default WorkflowNode;
