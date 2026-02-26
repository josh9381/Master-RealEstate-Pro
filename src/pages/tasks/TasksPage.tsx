import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Filter, CheckCircle2, Circle, Clock, Flag, Calendar, Pencil, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { ErrorBanner } from '@/components/ui/ErrorBanner'
import { tasksApi, usersApi, CreateTaskData } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface Task {
  id: number | string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate: string
  assignee: string
  assignedToId?: string
  completed: boolean
  category: string
  status: 'pending' | 'completed' | 'cancelled'
  leadId?: string
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
}

// Empty fallback - no hardcoded tasks
const fallbackTasks: Task[] = []

export default function TasksPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')

  // Pagination state (#111)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Modal state
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    assignedToId: '',
    leadId: '',
  })

  // Fetch team members for assignee dropdown
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ['team-members'],
    queryFn: () => usersApi.getTeamMembers(),
    staleTime: 120_000,
  })

  // Fetch tasks from API with server-side pagination (#111)
  const { data: tasksResponse, isError, error, refetch } = useQuery({
    queryKey: ['tasks', filter, currentPage, pageSize],
    queryFn: async () => {
      const params: {
        status?: 'pending' | 'completed' | 'cancelled';
        priority?: 'low' | 'medium' | 'high';
        page?: number;
        limit?: number;
      } = { page: currentPage, limit: pageSize }
      
      if (filter === 'completed') params.status = 'completed'
      if (filter === 'active') params.status = 'pending'
      if (filter === 'high') params.priority = 'high'
      
      const response = await tasksApi.getTasks(params)
      return response.data
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  // Smart data source - use API data or fallback
  const tasks: Task[] = useMemo(() => {
    if (tasksResponse?.tasks && tasksResponse.tasks.length > 0) {
      return tasksResponse.tasks.map((task: { id: string; title: string; description?: string; priority?: string; dueDate?: string; assignedTo?: { firstName: string; lastName: string }; assignedToId?: string; status?: string; category?: string; leadId?: string }) => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        priority: task.priority?.toLowerCase() || 'medium',
        dueDate: task.dueDate || '',
        assignee: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Unassigned',
        assignedToId: task.assignedToId || '',
        completed: task.status === 'completed' || task.status === 'COMPLETED',
        category: task.category || 'general',
        status: task.status?.toLowerCase() || 'pending',
        leadId: task.leadId || '',
      }))
    }
    return fallbackTasks
  }, [tasksResponse])

  // Pagination derived values (#111)
  const totalPages = tasksResponse?.pagination?.totalPages || 1
  const totalTasks = tasksResponse?.pagination?.total || tasks.length
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalTasks)

  // Reset page when filter changes
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => tasksApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created successfully')
      closeModal()
    },
    onError: () => {
      toast.error('Failed to create task')
    },
  })

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaskData> }) => tasksApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task updated successfully')
      closeModal()
    },
    onError: () => {
      toast.error('Failed to update task')
    },
  })

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete task')
    },
  })

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: (id: string) => tasksApi.completeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task completed')
    },
    onError: () => {
      toast.error('Failed to complete task')
    },
  })

  const openCreateModal = () => {
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      assignedToId: '',
      leadId: '',
    })
    setShowTaskModal(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedToId: task.assignedToId || '',
      leadId: task.leadId || '',
    })
    setShowTaskModal(true)
  }

  const closeModal = () => {
    setShowTaskModal(false)
    setEditingTask(null)
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      assignedToId: '',
      leadId: '',
    })
  }

  const handleSubmitTask = () => {
    if (!taskForm.title.trim()) {
      toast.error('Task title is required')
      return
    }

    const payload: CreateTaskData = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || undefined,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate || undefined,
      assignedToId: taskForm.assignedToId || undefined,
    }

    if (editingTask) {
      updateTaskMutation.mutate({ id: String(editingTask.id), data: payload })
    } else {
      createTaskMutation.mutate(payload)
    }
  }

  const handleToggleComplete = (taskId: number | string) => {
    completeTaskMutation.mutate(String(taskId))
  }

  const handleDeleteTask = (taskId: number | string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(String(taskId))
    }
  }

  // Due Today comparison using proper date logic
  const isDueToday = (dateStr: string): boolean => {
    if (!dateStr) return false
    try {
      return new Date(dateStr).toDateString() === new Date().toDateString()
    } catch {
      return false
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed' && !task.completed) return false
    if (filter === 'active' && task.completed) return false
    if (filter === 'high' && task.priority !== 'high') return false
    if (searchTerm && !(task.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) &&
        !(task.description?.toLowerCase() || '').includes(searchTerm.toLowerCase())) return false
    // More filters
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
    if (assigneeFilter !== 'all' && task.assignedToId !== assigneeFilter) return false
    return true
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const formatDueDate = (dateStr: string): string => {
    if (!dateStr) return 'No date'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      if (isDueToday(dateStr)) return 'Today'
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const isMutating = createTaskMutation.isPending || updateTaskMutation.isPending

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage your to-do list and assignments</p>
        </div>
        <ErrorBanner message={`Failed to load tasks: ${error instanceof Error ? error.message : 'Unknown error'}`} retry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage your to-do list and assignments</p>
        </div>
        <Button onClick={openCreateModal} disabled={isMutating}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{tasks.filter(t => !t.completed).length}</div>
          <div className="text-sm text-muted-foreground">Active Tasks</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{tasks.filter(t => isDueToday(t.dueDate)).length}</div>
          <div className="text-sm text-muted-foreground">Due Today</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{tasks.filter(t => t.priority === 'high').length}</div>
          <div className="text-sm text-muted-foreground">High Priority</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{tasks.filter(t => t.completed).length}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('active')}
            >
              Active
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('completed')}
            >
              Completed
            </Button>
            <Button
              variant={filter === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('high')}
            >
              <Flag className="h-4 w-4 mr-2" />
              High Priority
            </Button>
            <Button
              variant={showMoreFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              More
            </Button>
          </div>
        </div>

        {/* More Filters Dropdown */}
        {showMoreFilters && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Priority:</Label>
              <select
                className="text-sm border rounded-md px-2 py-1.5 bg-background"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Assignee:</Label>
              <select
                className="text-sm border rounded-md px-2 py-1.5 bg-background"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="all">All</option>
                {teamMembers.map((member: TeamMember) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPriorityFilter('all')
                setAssigneeFilter('all')
                setShowMoreFilters(false)
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card key={task.id} className={`p-4 ${task.completed ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-4">
              <button className="mt-1" onClick={() => handleToggleComplete(task.id)}>
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className={`font-semibold ${task.completed ? 'line-through' : ''}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                  </div>
                  <Badge variant={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDueDate(task.dueDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{task.assignee}</span>
                  </div>
                  <Badge variant="outline">{task.category}</Badge>
                  <button
                    className="ml-auto text-xs text-primary hover:underline"
                    onClick={() => openEditModal(task)}
                  >
                    <Pencil className="h-3 w-3 inline mr-1" />
                    Edit
                  </button>
                  <button
                    className="text-xs text-destructive hover:underline"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">{tasks.length === 0 ? 'No tasks yet' : 'No tasks found matching your filters'}</p>
              {tasks.length === 0 && (
                <p className="text-sm">Create your first task to get started!</p>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Pagination (#111) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {startItem} to {endItem} of {totalTasks} tasks</span>
            <select
              className="border rounded-md px-2 py-1 text-sm bg-background"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-9"
                >
                  {page}
                </Button>
              )
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-1 text-muted-foreground">…</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} className="w-9">
                  {totalPages}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                placeholder="Enter task title..."
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <textarea
                id="task-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe the task..."
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={taskForm.priority}
                onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="task-dueDate">Due Date</Label>
              <Input
                id="task-dueDate"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assign To</Label>
              <select
                id="task-assignee"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={taskForm.assignedToId}
                onChange={(e) => setTaskForm(prev => ({ ...prev, assignedToId: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((member: TeamMember) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={isMutating}>
              Cancel
            </Button>
            <Button onClick={handleSubmitTask} disabled={isMutating}>
              {isMutating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
