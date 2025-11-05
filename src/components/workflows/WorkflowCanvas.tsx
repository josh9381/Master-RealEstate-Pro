import { useState } from 'react';
import { ArrowDown, Plus } from 'lucide-react';
import { WorkflowNode, WorkflowNodeData } from './WorkflowNode';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface WorkflowCanvasProps {
  nodes: WorkflowNodeData[];
  selectedNodeId?: string;
  onNodeSelect?: (node: WorkflowNodeData) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeEdit?: (node: WorkflowNodeData) => void;
  onAddNode?: () => void;
  isDraggingOver?: boolean;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  selectedNodeId,
  onNodeSelect,
  onNodeDelete,
  onNodeEdit,
  onAddNode,
  isDraggingOver = false,
  onDrop,
  onDragOver,
  onDragLeave,
}) => {
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);

  return (
    <div
      className={`
        relative min-h-[600px] p-8 rounded-lg border-2 border-dashed
        ${isDraggingOver ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-700'}
        transition-colors duration-200
      `}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-24 text-center">
          <div className="max-w-md">
            <Plus className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No workflow nodes yet</h3>
            <p className="text-muted-foreground mb-6">
              {isDraggingOver
                ? 'Drop the component here to add it to your workflow'
                : 'Drag components from the sidebar or click the button below to start building your workflow'}
            </p>
            {!isDraggingOver && onAddNode && (
              <Button onClick={onAddNode}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Node
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
          {nodes.map((node, index) => (
            <div key={node.id} className="w-full">
              {/* Node */}
              <div className="relative w-full">
                <WorkflowNode
                  node={node}
                  isSelected={node.id === selectedNodeId}
                  onSelect={onNodeSelect}
                  onDelete={onNodeDelete}
                  onEdit={onNodeEdit}
                />
              </div>

              {/* Connection Arrow */}
              {index < nodes.length - 1 && (
                <div
                  className={`
                    flex justify-center py-4 transition-all duration-200
                    ${hoveredConnectionId === `${node.id}-${nodes[index + 1].id}` ? 'scale-110' : ''}
                  `}
                  onMouseEnter={() => setHoveredConnectionId(`${node.id}-${nodes[index + 1].id}`)}
                  onMouseLeave={() => setHoveredConnectionId(null)}
                >
                  <div className="relative">
                    <ArrowDown className="h-6 w-6 text-muted-foreground" />
                    <div className="absolute -top-1 -right-8">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                        onClick={() => onAddNode?.()}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Node Button at the end */}
          {nodes.length > 0 && onAddNode && (
            <Button
              variant="outline"
              className="w-full py-8 border-2 border-dashed hover:border-primary hover:bg-primary/5"
              onClick={onAddNode}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Next Step
            </Button>
          )}
        </div>
      )}

      {/* Drop Zone Indicator */}
      {isDraggingOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Card className="bg-primary/10 border-primary">
            <CardContent className="p-6">
              <p className="text-lg font-semibold">Drop here to add to workflow</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WorkflowCanvas;
