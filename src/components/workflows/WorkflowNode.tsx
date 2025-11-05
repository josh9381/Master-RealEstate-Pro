import { Mail, MessageSquare, UserPlus, Tag, Clock, Zap, Filter, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export type NodeType = 'trigger' | 'condition' | 'action' | 'delay';

export interface WorkflowNodeData {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  icon?: string;
  config?: Record<string, unknown>;
}

interface WorkflowNodeProps {
  node: WorkflowNodeData;
  isSelected?: boolean;
  onSelect?: (node: WorkflowNodeData) => void;
  onDelete?: (nodeId: string) => void;
  onEdit?: (node: WorkflowNodeData) => void;
  isDraggable?: boolean;
}

const getNodeIcon = (type: NodeType, iconName?: string) => {
  if (iconName === 'mail') return Mail;
  if (iconName === 'sms') return MessageSquare;
  if (iconName === 'user') return UserPlus;
  if (iconName === 'tag') return Tag;
  
  switch (type) {
    case 'trigger':
      return Zap;
    case 'condition':
      return Filter;
    case 'action':
      return Mail;
    case 'delay':
      return Clock;
    default:
      return AlertCircle;
  }
};

const getNodeColor = (type: NodeType) => {
  switch (type) {
    case 'trigger':
      return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
    case 'condition':
      return 'border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
    case 'action':
      return 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20';
    case 'delay':
      return 'border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/20';
    default:
      return 'border-l-4 border-l-gray-500';
  }
};

const getNodeBadgeColor = (type: NodeType) => {
  switch (type) {
    case 'trigger':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'condition':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'action':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'delay':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return '';
  }
};

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  node,
  isSelected = false,
  onSelect,
  onDelete,
  onEdit,
  isDraggable = false,
}) => {
  const Icon = getNodeIcon(node.type, node.icon);
  const nodeColor = getNodeColor(node.type);
  const badgeColor = getNodeBadgeColor(node.type);

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
          {/* Icon */}
          <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{node.label}</h4>
              <Badge className={`text-xs ${badgeColor}`}>
                {node.type}
              </Badge>
            </div>
            {node.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {node.description}
              </p>
            )}
            {node.config && Object.keys(node.config).length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {Object.entries(node.config).slice(0, 3).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleEdit}
              >
                <span className="sr-only">Edit</span>
                ✏️
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleDelete}
              >
                <span className="sr-only">Delete</span>
                🗑️
              </Button>
            )}
          </div>
        </div>

        {/* Connection points */}
        {(node.type !== 'trigger') && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600" />
        )}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600" />
      </CardContent>
    </Card>
  );
};

export default WorkflowNode;
