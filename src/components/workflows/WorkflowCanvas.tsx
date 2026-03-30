import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, ZoomIn, ZoomOut, Maximize2, Workflow, Mail, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import { WorkflowNode, WorkflowNodeData } from './WorkflowNode';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface WorkflowCanvasProps {
  nodes: WorkflowNodeData[];
  selectedNodeId?: string;
  onNodeSelect?: (node: WorkflowNodeData) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeEdit?: (node: WorkflowNodeData) => void;
  onNodeMove?: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeDuplicate?: (nodeId: string) => void;
  onNodeMoveUp?: (nodeId: string) => void;
  onNodeMoveDown?: (nodeId: string) => void;
  isDraggingOver?: boolean;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  mode?: 'click' | 'drag';
  onTemplateSelect?: (templateName: string) => void;
  deleteConfirmNodeId?: string | null;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  selectedNodeId,
  onNodeSelect,
  onNodeDelete,
  onNodeEdit,
  onNodeMove,
  onNodeDuplicate,
  onNodeMoveUp,
  onNodeMoveDown,
  isDraggingOver = false,
  onDrop,
  onDragOver,
  onDragLeave,
  mode = 'drag',
  onTemplateSelect,
  deleteConfirmNodeId,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Distinguish click from drag: track mouse-down position and movement
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const didDragNode = useRef(false);
  const DRAG_THRESHOLD = 5; // pixels before a click becomes a drag

  // Track whether auto-positioning has already run for the current set of nodes
  const autoPositionedCount = useRef(0);

  // Handle space bar for panning (only when not typing in an input/textarea)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept space when user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    // If window loses focus while space is pressed, reset the state
    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsPanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isSpacePressed]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOver) {
      onDragOver(e);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragLeave) {
      onDragLeave();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If we're dropping a component from the library
    if (onDrop && e.dataTransfer.types.includes('application/json')) {
      onDrop(e);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0 || isSpacePressed) return; // Only left click and not in pan mode
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    e.stopPropagation();
    // Don't start dragging immediately — wait until the mouse moves beyond threshold
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    didDragNode.current = false;
    setDraggedNodeId(nodeId);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const nodeX = node.position?.x || 0;
      const nodeY = node.position?.y || 0;
      // Account for canvas pan offset so the node doesn't jump
      setDragOffset({
        x: (e.clientX - rect.left - canvasOffset.x) / zoom - nodeX,
        y: (e.clientY - rect.top - canvasOffset.y) / zoom - nodeY,
      });
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Allow panning when space is pressed OR when clicking on the canvas background
    // Check if the click target is the canvas itself or the inner transform wrapper (not a node)
    const target = e.target as HTMLElement;
    const isCanvasBackground = target === canvasRef.current || target.closest('[data-canvas-inner]') === target;
    if (e.button === 0 && (isSpacePressed || isCanvasBackground)) {
      setIsPanning(true);
      setPanStart({ 
        x: e.clientX - canvasOffset.x, 
        y: e.clientY - canvasOffset.y 
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggedNodeId && onNodeMove) {
      // Check drag threshold before actually moving the node
      if (mouseDownPos.current) {
        const dx = Math.abs(e.clientX - mouseDownPos.current.x);
        const dy = Math.abs(e.clientY - mouseDownPos.current.y);
        if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
        didDragNode.current = true;
      }
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        // Include canvasOffset so nodes track correctly after panning
        const x = (e.clientX - rect.left - canvasOffset.x) / zoom - dragOffset.x;
        const y = (e.clientY - rect.top - canvasOffset.y) / zoom - dragOffset.y;
        onNodeMove(draggedNodeId, { x: Math.round(x), y: Math.round(y) });
      }
    } else if (isPanning) {
      setCanvasOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    // If user clicked a node without actually dragging, treat it as a select
    if (draggedNodeId && !didDragNode.current && onNodeSelect) {
      const node = nodes.find(n => n.id === draggedNodeId);
      if (node) {
        onNodeSelect(node);
      }
    }
    setDraggedNodeId(null);
    mouseDownPos.current = null;
    didDragNode.current = false;
    if (!isSpacePressed) {
      setIsPanning(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    if (mode !== 'drag') return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 2));
      return;
    }
    // Zoom toward cursor position
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setZoom(prev => {
      const newZoom = Math.min(Math.max(prev + delta, 0.5), 2);
      const scale = newZoom / prev;
      setCanvasOffset(offset => ({
        x: mouseX - scale * (mouseX - offset.x),
        y: mouseY - scale * (mouseY - offset.y),
      }));
      return newZoom;
    });
  }, [mode]);

  // Attach wheel handler via ref to use { passive: false } (React onWheel is passive)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || mode !== 'drag') return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, mode]);

  const handleResetView = () => {
    setCanvasOffset({ x: 0, y: 0 });
    setZoom(1);
  };

  useEffect(() => {
    if (draggedNodeId || isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedNodeId, isPanning, dragOffset, panStart, zoom]);

  // Auto-position nodes that don't have positions — only run when new nodes are added
  useEffect(() => {
    if (nodes.length <= autoPositionedCount.current) {
      autoPositionedCount.current = nodes.length;
      return;
    }
    nodes.forEach((node, index) => {
      if (!node.position && onNodeMove) {
        const x = 400;
        const y = 100 + (index * 180);
        onNodeMove(node.id, { x, y });
      }
    });
    autoPositionedCount.current = nodes.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  const getCursor = () => {
    if (draggedNodeId) return 'grabbing';
    if (isPanning) return 'grabbing';
    if (isSpacePressed) return 'grab';
    return 'default';
  };

  return (
    <div
      ref={canvasRef}
      className={`
        relative h-full rounded-lg border-2 overflow-hidden
        ${isDraggingOver ? 'border-primary bg-primary/5' : mode === 'drag' ? 'border-blue-300 dark:border-blue-700' : 'border-green-300 dark:border-green-700'}
        transition-colors duration-200
        ${mode === 'click' ? 'overflow-y-auto' : ''}
      `}
      role="application"
      aria-label={`Workflow canvas with ${nodes.length} node${nodes.length !== 1 ? 's' : ''}. ${mode === 'drag' ? 'Drag mode active.' : 'Click mode active.'}`}
      tabIndex={0}
      style={{
        cursor: mode === 'click' ? 'default' : getCursor(),
        background: mode === 'click' 
          ? 'var(--background, white)'
          : `
            linear-gradient(90deg, var(--grid-color, rgba(200, 200, 200, 0.1)) 1px, transparent 1px),
            linear-gradient(var(--grid-color, rgba(200, 200, 200, 0.1)) 1px, transparent 1px),
            var(--background, rgba(240, 248, 255, 1))
          `,
        backgroundSize: mode === 'click' ? 'auto' : `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: mode === 'click' ? 'auto' : `${canvasOffset.x}px ${canvasOffset.y}px`,
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onMouseDown={mode === 'drag' ? handleCanvasMouseDown : undefined}
    >
      {nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-12 px-6">
          <div className="max-w-3xl w-full">
            {isDraggingOver ? (
              <div className="text-center">
                <Plus className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
                <h3 className="text-lg font-semibold mb-2">Drop here to add component</h3>
                <p className="text-muted-foreground">Release to add this component to your workflow</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                    <Workflow className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Start Building Your Workflow</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {mode === 'drag' 
                      ? 'Drag components from the sidebar or choose a template to get started'
                      : 'Click components in the sidebar or choose a template below'}
                  </p>
                </div>

                {/* Quick Start Templates */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-3 text-center">⚡ Quick Start Templates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => onTemplateSelect?.('New Lead Welcome Series')}
                      className="p-4 text-left border-2 border-dashed border-border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <Mail className="h-6 w-6 text-blue-600 mb-2" />
                      <h5 className="font-semibold text-sm mb-1">Lead Welcome</h5>
                      <p className="text-xs text-muted-foreground">3 nodes • Email sequence</p>
                      <div className="mt-2 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">Click to start →</div>
                    </button>
                    
                    <button
                      onClick={() => onTemplateSelect?.('Lead Score & Notify')}
                      className="p-4 text-left border-2 border-dashed border-border rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                    >
                      <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
                      <h5 className="font-semibold text-sm mb-1">Lead Scoring</h5>
                      <p className="text-xs text-muted-foreground">4 nodes • Auto-qualify</p>
                      <div className="mt-2 text-xs text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">Click to start →</div>
                    </button>
                    
                    <button
                      onClick={() => onTemplateSelect?.('Follow-up Automation')}
                      className="p-4 text-left border-2 border-dashed border-border rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                    >
                      <Calendar className="h-6 w-6 text-purple-600 mb-2" />
                      <h5 className="font-semibold text-sm mb-1">Auto Follow-up</h5>
                      <p className="text-xs text-muted-foreground">5 nodes • Time-based</p>
                      <div className="mt-2 text-xs text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">Click to start →</div>
                    </button>
                  </div>
                </div>

                {/* Tips */}
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  {mode === 'drag' ? (
                    <span>Drag components from the sidebar onto the canvas</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Click components to build step-by-step</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : mode === 'click' ? (
        /* Click Mode: Simple Vertical List Layout */
        <div className="p-8 max-w-2xl mx-auto">
          {nodes.map((node, index) => (
            <div key={node.id}>
              <div className="pointer-events-auto">
                <WorkflowNode
                  node={node}
                  isSelected={node.id === selectedNodeId}
                  onSelect={onNodeSelect}
                  onDelete={onNodeDelete}
                  onEdit={onNodeEdit}
                  onDuplicate={onNodeDuplicate}
                  onMoveUp={onNodeMoveUp}
                  onMoveDown={onNodeMoveDown}
                  isDraggable={false}
                  showDeleteConfirm={deleteConfirmNodeId === node.id}
                  isFirst={index === 0}
                  isLast={index === nodes.length - 1}
                />
              </div>
              {index < nodes.length - 1 && (
                <div className="flex justify-center my-4">
                  <div className="flex flex-col items-center">
                    <div className="w-px h-8 bg-gray-300"></div>
                    <div className="bg-muted border border-border rounded-full px-3 py-1 text-xs text-muted-foreground font-medium">
                      Then
                    </div>
                    <div className="w-px h-8 bg-gray-300"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Drag Mode: n8n-style 2D Canvas */
        <div
          data-canvas-inner
          className="absolute inset-0"
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning || draggedNodeId ? 'none' : 'transform 0.1s',
            pointerEvents: 'none',
          }}
        >
          {/* Connection Lines */}
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 1, overflow: 'visible' }}
          >
            {nodes.map((node, index) => {
              if (index >= nodes.length - 1) return null;
              const nextNode = nodes[index + 1];
              const nodeWidth = 300;
              const nodeHeight = 80;
              const x1 = (node.position?.x || 0) + nodeWidth / 2; // Center of node
              const y1 = (node.position?.y || 0) + nodeHeight; // Bottom of node
              const x2 = (nextNode.position?.x || 0) + nodeWidth / 2;
              const y2 = nextNode.position?.y || 0; // Top of next node

              // Create curved connection with adaptive control points
              const dy = Math.abs(y2 - y1);
              const curvature = Math.min(dy * 0.5, 80);
              const cpY1 = y1 + curvature;
              const cpY2 = y2 - curvature;
              const path = `M ${x1} ${y1} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${y2}`;

              const isConditionEdge = node.type === 'condition';
              const lineColor = isConditionEdge ? 'rgb(234, 179, 8)' : 'rgb(99, 102, 241)';
              const glowColor = isConditionEdge ? 'rgba(234, 179, 8, 0.2)' : 'rgba(99, 102, 241, 0.2)';

              return (
                <g key={`${node.id}-${nextNode.id}`}>
                  {/* Glow effect */}
                  <path
                    d={path}
                    stroke={glowColor}
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Main line */}
                  <path
                    d={path}
                    stroke={lineColor}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={isConditionEdge ? '6 3' : 'none'}
                    markerEnd={isConditionEdge ? 'url(#arrowhead-condition)' : 'url(#arrowhead)'}
                  />
                  {/* Connection dot at start */}
                  <circle
                    cx={x1}
                    cy={y1}
                    r="4"
                    fill={lineColor}
                    stroke="white"
                    strokeWidth="2"
                  />
                  {/* Condition label */}
                  {isConditionEdge && (
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fill={lineColor}
                      fontWeight="600"
                    >
                      {node.config?.operator === 'equals' ? '= match' : 'if true'}
                    </text>
                  )}
                </g>
              );
            })}
            {/* Arrow marker definitions */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="rgb(99, 102, 241)"
                />
              </marker>
              <marker
                id="arrowhead-condition"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="rgb(234, 179, 8)"
                />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute pointer-events-auto"
              style={{
                left: node.position?.x || 0,
                top: node.position?.y || 0,
                width: '300px',
                zIndex: draggedNodeId === node.id ? 1000 : selectedNodeId === node.id ? 100 : 10,
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              <div className={`transition-all duration-200 ${draggedNodeId === node.id ? 'scale-105 shadow-2xl' : ''}`}>
                <WorkflowNode
                  node={node}
                  isSelected={node.id === selectedNodeId}
                  onSelect={mode === 'drag' ? onNodeSelect : undefined}
                  onDelete={onNodeDelete}
                  onEdit={mode === 'drag' ? onNodeEdit : undefined}
                  onDuplicate={onNodeDuplicate}
                  isDraggable
                  showDeleteConfirm={deleteConfirmNodeId === node.id}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone Indicator */}
      {isDraggingOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 bg-primary/5">
          <Card className="bg-primary/10 border-primary border-2">
            <CardContent className="p-6">
              <p className="text-lg font-semibold text-primary">Drop here to add to workflow</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mode Indicator Badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
          mode === 'drag' 
            ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
            : 'bg-green-100 text-green-700 border-2 border-green-300'
        }`}>
          {mode === 'drag' ? '🎯 Drag Mode' : '✨ Click Mode'}
        </div>
      </div>

      {/* Controls - Only show in Drag Mode */}
      {mode === 'drag' && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            className="bg-white dark:bg-gray-800"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            className="bg-white dark:bg-gray-800"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            className="bg-white dark:bg-gray-800"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="text-xs text-center bg-white dark:bg-gray-800 rounded-md px-2 py-1 border">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      )}

      {/* Mini-Map - Only show in Drag Mode with nodes */}
      {mode === 'drag' && nodes.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-lg">
            <CardContent className="p-2">
              <div className="text-xs font-semibold mb-2 text-muted-foreground">Mini-Map</div>
              <div 
                className="relative w-48 h-32 bg-muted/50 dark:bg-gray-900 rounded border border-border overflow-hidden"
                style={{ cursor: 'pointer' }}
              >
                {/* Mini-map nodes */}
                {nodes.map((node) => {
                  // Calculate mini-map position (scale down by 10x)
                  const miniX = ((node.position?.x || 0) / 10) + 24;
                  const miniY = ((node.position?.y || 0) / 10) + 16;
                  
                  return (
                    <div
                      key={node.id}
                      className={`absolute w-2 h-2 rounded-full ${
                        node.type === 'trigger' ? 'bg-blue-500' :
                        node.type === 'condition' ? 'bg-yellow-500' :
                        node.type === 'action' ? 'bg-green-500' :
                        'bg-purple-500'
                      } ${node.id === selectedNodeId ? 'ring-2 ring-offset-1 ring-primary' : ''}`}
                      style={{
                        left: `${miniX}px`,
                        top: `${miniY}px`,
                      }}
                      title={node.label}
                    />
                  );
                })}
                
                {/* Viewport indicator */}
                <div
                  className="absolute border-2 border-primary/50 bg-primary/10 pointer-events-none"
                  style={{
                    left: `${-canvasOffset.x / 10 + 24}px`,
                    top: `${-canvasOffset.y / 10 + 16}px`,
                    width: '40px',
                    height: '25px',
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WorkflowCanvas;
