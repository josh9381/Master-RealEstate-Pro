import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Settings2,
  Plus,
  Trash2,
  GripVertical,
  Check,
  X,
  Copy,
  Pencil,
  Star,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { pipelinesApi, type PipelineData } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

const PIPELINE_TYPE_OPTIONS = [
  { value: 'DEFAULT', label: 'General' },
  { value: 'BUYER', label: 'Buyer' },
  { value: 'SELLER', label: 'Seller' },
  { value: 'RENTAL', label: 'Rental' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'CUSTOM', label: 'Custom' },
] as const

import { PIPELINE_STAGE_COLORS as STAGE_COLORS } from '@/lib/chartColors'

interface PipelineManagerProps {
  pipelines: PipelineData[]
  onClose: () => void
}

function PipelineManager({ pipelines, onClose }: PipelineManagerProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [expandedPipelineId, setExpandedPipelineId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPipelineName, setNewPipelineName] = useState('')
  const [newPipelineType, setNewPipelineType] = useState('CUSTOM')
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null)
  const [editPipelineName, setEditPipelineName] = useState('')
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editStageName, setEditStageName] = useState('')
  const [editStageColor, setEditStageColor] = useState('#6B7280')
  const [addingStageForPipeline, setAddingStageForPipeline] = useState<string | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6B7280')
  const [confirmDeletePipeline, setConfirmDeletePipeline] = useState<string | null>(null)
  const [confirmDeleteStage, setConfirmDeleteStage] = useState<string | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] })
  }

  // Pipeline mutations
  const createPipelineMutation = useMutation({
    mutationFn: (data: Parameters<typeof pipelinesApi.createPipeline>[0]) =>
      pipelinesApi.createPipeline(data),
    onSuccess: () => {
      invalidate()
      toast.success('Pipeline created')
      setShowCreateForm(false)
      setNewPipelineName('')
      setNewPipelineType('CUSTOM')
    },
    onError: () => toast.error('Failed to create pipeline'),
  })

  const updatePipelineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof pipelinesApi.updatePipeline>[1] }) =>
      pipelinesApi.updatePipeline(id, data),
    onSuccess: () => {
      invalidate()
      toast.success('Pipeline updated')
      setEditingPipelineId(null)
    },
    onError: () => toast.error('Failed to update pipeline'),
  })

  const deletePipelineMutation = useMutation({
    mutationFn: (id: string) => pipelinesApi.deletePipeline(id),
    onSuccess: (result) => {
      invalidate()
      toast.success(result.message || 'Pipeline deleted')
      setConfirmDeletePipeline(null)
    },
    onError: () => toast.error('Failed to delete pipeline'),
  })

  const duplicatePipelineMutation = useMutation({
    mutationFn: (id: string) => pipelinesApi.duplicatePipeline(id),
    onSuccess: () => {
      invalidate()
      toast.success('Pipeline duplicated')
    },
    onError: () => toast.error('Failed to duplicate pipeline'),
  })

  // Stage mutations
  const createStageMutation = useMutation({
    mutationFn: ({ pipelineId, data }: { pipelineId: string; data: Parameters<typeof pipelinesApi.createStage>[1] }) =>
      pipelinesApi.createStage(pipelineId, data),
    onSuccess: () => {
      invalidate()
      toast.success('Stage added')
      setAddingStageForPipeline(null)
      setNewStageName('')
      setNewStageColor('#6B7280')
    },
    onError: () => toast.error('Failed to add stage'),
  })

  const updateStageMutation = useMutation({
    mutationFn: ({ pipelineId, stageId, data }: {
      pipelineId: string
      stageId: string
      data: Parameters<typeof pipelinesApi.updateStage>[2]
    }) => pipelinesApi.updateStage(pipelineId, stageId, data),
    onSuccess: () => {
      invalidate()
      toast.success('Stage updated')
      setEditingStageId(null)
    },
    onError: () => toast.error('Failed to update stage'),
  })

  const deleteStageMutation = useMutation({
    mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
      pipelinesApi.deleteStage(pipelineId, stageId),
    onSuccess: () => {
      invalidate()
      toast.success('Stage removed')
      setConfirmDeleteStage(null)
    },
    onError: () => toast.error('Failed to remove stage'),
  })

  const reorderStagesMutation = useMutation({
    mutationFn: ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) =>
      pipelinesApi.reorderStages(pipelineId, stageIds),
    onSuccess: () => {
      invalidate()
    },
    onError: () => toast.error('Failed to reorder stages'),
  })

  const moveStage = (pipeline: PipelineData, stageId: string, direction: 'up' | 'down') => {
    const stages = [...pipeline.stages].sort((a, b) => a.order - b.order)
    const idx = stages.findIndex(s => s.id === stageId)
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === stages.length - 1)) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const temp = stages[idx]
    stages[idx] = stages[swapIdx]
    stages[swapIdx] = temp

    reorderStagesMutation.mutate({
      pipelineId: pipeline.id,
      stageIds: stages.map(s => s.id),
    })
  }

  const handleCreatePipeline = () => {
    if (!newPipelineName.trim()) return
    createPipelineMutation.mutate({
      name: newPipelineName.trim(),
      type: newPipelineType,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-card z-10 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Pipeline Management
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {/* Pipeline List */}
          {pipelines.map((pipeline) => {
            const isExpanded = expandedPipelineId === pipeline.id
            const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order)

            return (
              <Card key={pipeline.id} className="border">
                {/* Pipeline Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {editingPipelineId === pipeline.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editPipelineName}
                          onChange={(e) => setEditPipelineName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updatePipelineMutation.mutate({
                                id: pipeline.id,
                                data: { name: editPipelineName.trim() },
                              })
                            }
                            if (e.key === 'Escape') setEditingPipelineId(null)
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            updatePipelineMutation.mutate({
                              id: pipeline.id,
                              data: { name: editPipelineName.trim() },
                            })
                          }
                          disabled={updatePipelineMutation.isPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditingPipelineId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          onClick={() => setExpandedPipelineId(isExpanded ? null : pipeline.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="font-medium truncate">{pipeline.name}</span>
                          {pipeline.isDefault && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                          <Badge variant="outline" className="text-xs shrink-0">
                            {pipeline.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {sortedStages.length} stages
                          </span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          {!pipeline.isDefault && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title="Set as default"
                              onClick={() =>
                                updatePipelineMutation.mutate({
                                  id: pipeline.id,
                                  data: { isDefault: true },
                                })
                              }
                            >
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Rename"
                            onClick={() => {
                              setEditingPipelineId(pipeline.id)
                              setEditPipelineName(pipeline.name)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Duplicate"
                            onClick={() => duplicatePipelineMutation.mutate(pipeline.id)}
                            disabled={duplicatePipelineMutation.isPending}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          {confirmDeletePipeline === pipeline.id ? (
                            <div className="flex items-center gap-1 ml-1">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs px-2"
                                onClick={() => deletePipelineMutation.mutate(pipeline.id)}
                                disabled={deletePipelineMutation.isPending}
                              >
                                {deletePipelineMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Delete'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2"
                                onClick={() => setConfirmDeletePipeline(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="Delete pipeline"
                              onClick={() => setConfirmDeletePipeline(pipeline.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded: Stage List */}
                {isExpanded && (
                  <div className="border-t px-3 py-3 space-y-1.5 bg-muted/20">
                    {confirmDeletePipeline === pipeline.id && (
                      <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs mb-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>
                          This will unassign {pipeline._count?.leads || 0} leads. Are you sure?
                        </span>
                      </div>
                    )}

                    {sortedStages.map((stage, idx) => (
                      <div
                        key={stage.id}
                        className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5"
                      >
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div
                          className="h-3.5 w-3.5 rounded-full shrink-0 border"
                          style={{ backgroundColor: stage.color || '#6B7280' }}
                        />

                        {editingStageId === stage.id ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <Input
                              value={editStageName}
                              onChange={(e) => setEditStageName(e.target.value)}
                              className="h-7 text-xs flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateStageMutation.mutate({
                                    pipelineId: pipeline.id,
                                    stageId: stage.id,
                                    data: { name: editStageName.trim(), color: editStageColor },
                                  })
                                }
                                if (e.key === 'Escape') setEditingStageId(null)
                              }}
                            />
                            <div className="flex gap-0.5">
                              {STAGE_COLORS.map((c) => (
                                <button
                                  key={c}
                                  className={`h-5 w-5 rounded-full border-2 transition-colors ${
                                    editStageColor === c ? 'border-primary' : 'border-transparent'
                                  }`}
                                  style={{ backgroundColor: c }}
                                  onClick={() => setEditStageColor(c)}
                                />
                              ))}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                updateStageMutation.mutate({
                                  pipelineId: pipeline.id,
                                  stageId: stage.id,
                                  data: { name: editStageName.trim(), color: editStageColor },
                                })
                              }
                              disabled={updateStageMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditingStageId(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm flex-1">{stage.name}</span>
                            {stage.isWinStage && (
                              <Badge variant="default" className="text-[10px] h-5 bg-green-600">Win</Badge>
                            )}
                            {stage.isLostStage && (
                              <Badge variant="secondary" className="text-[10px] h-5">Lost</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">#{stage.order}</span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                disabled={idx === 0 || reorderStagesMutation.isPending}
                                onClick={() => moveStage(pipeline, stage.id, 'up')}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                disabled={idx === sortedStages.length - 1 || reorderStagesMutation.isPending}
                                onClick={() => moveStage(pipeline, stage.id, 'down')}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setEditingStageId(stage.id)
                                  setEditStageName(stage.name)
                                  setEditStageColor(stage.color || '#6B7280')
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              {confirmDeleteStage === stage.id ? (
                                <div className="flex items-center gap-0.5 ml-1">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-6 text-[10px] px-1.5"
                                    onClick={() =>
                                      deleteStageMutation.mutate({
                                        pipelineId: pipeline.id,
                                        stageId: stage.id,
                                      })
                                    }
                                    disabled={deleteStageMutation.isPending || sortedStages.length <= 1}
                                  >
                                    {deleteStageMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      'Yes'
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] px-1.5"
                                    onClick={() => setConfirmDeleteStage(null)}
                                  >
                                    No
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  disabled={sortedStages.length <= 1}
                                  title={sortedStages.length <= 1 ? 'Cannot delete last stage' : 'Delete stage'}
                                  onClick={() => setConfirmDeleteStage(stage.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Add Stage Form */}
                    {addingStageForPipeline === pipeline.id ? (
                      <div className="flex items-center gap-2 p-2 rounded-md border border-dashed">
                        <Input
                          placeholder="Stage name..."
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                          className="h-7 text-xs flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newStageName.trim()) {
                              createStageMutation.mutate({
                                pipelineId: pipeline.id,
                                data: { name: newStageName.trim(), color: newStageColor },
                              })
                            }
                            if (e.key === 'Escape') {
                              setAddingStageForPipeline(null)
                              setNewStageName('')
                            }
                          }}
                        />
                        <div className="flex gap-0.5">
                          {STAGE_COLORS.slice(0, 6).map((c) => (
                            <button
                              key={c}
                              className={`h-4 w-4 rounded-full border-2 transition-colors ${
                                newStageColor === c ? 'border-primary' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: c }}
                              onClick={() => setNewStageColor(c)}
                            />
                          ))}
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs"
                          onClick={() => {
                            if (newStageName.trim()) {
                              createStageMutation.mutate({
                                pipelineId: pipeline.id,
                                data: { name: newStageName.trim(), color: newStageColor },
                              })
                            }
                          }}
                          disabled={!newStageName.trim() || createStageMutation.isPending}
                        >
                          {createStageMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setAddingStageForPipeline(null)
                            setNewStageName('')
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full h-8 text-xs text-muted-foreground border border-dashed"
                        onClick={() => setAddingStageForPipeline(pipeline.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Stage
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}

          {/* Create Pipeline Form */}
          {showCreateForm ? (
            <Card className="border-2 border-dashed border-primary/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Pipeline name..."
                    value={newPipelineName}
                    onChange={(e) => setNewPipelineName(e.target.value)}
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreatePipeline()
                      if (e.key === 'Escape') {
                        setShowCreateForm(false)
                        setNewPipelineName('')
                      }
                    }}
                  />
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={newPipelineType}
                    onChange={(e) => setNewPipelineType(e.target.value)}
                  >
                    {PIPELINE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default stages will be created based on the pipeline type. You can customize them after creation.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewPipelineName('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreatePipeline}
                    disabled={!newPipelineName.trim() || createPipelineMutation.isPending}
                  >
                    {createPipelineMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1.5" />
                    )}
                    Create Pipeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Pipeline
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export { PipelineManager }
