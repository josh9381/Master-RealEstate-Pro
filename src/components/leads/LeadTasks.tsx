import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  User,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { tasksApi, type CreateTaskData } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface Task {
  id: string
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  completedAt?: string
  assignedTo?: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
}

interface LeadTasksProps {
  leadId: string
  leadName: string
}

function LeadTasks({ leadId, leadName }: LeadTasksProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState<{ title: string; description: string; priority: 'low' | 'medium' | 'high'; dueDate: string }>({ title: '', description: '', priority: 'medium', dueDate: '' })
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  // Fetch tasks for this lead
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['lead-tasks', leadId],
    queryFn: async () => {
      const response = await tasksApi.getLeadTasks(leadId)
      return response
    },
    enabled: !!leadId,
  })

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => tasksApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', leadId] })
      toast.success('Task created')
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' })
      setShowAddTask(false)
    },
    onError: () => {
      toast.error('Failed to create task')
    },
  })

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.completeTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', leadId] })
      toast.success('Task completed')
    },
    onError: () => {
      toast.error('Failed to complete task')
    },
  })

  const rawTasks: Task[] = tasksData?.data?.tasks || tasksData?.tasks || tasksData?.data || []
  const tasks = Array.isArray(rawTasks) ? rawTasks : []

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
    if (filter === 'completed') return task.status === 'COMPLETED'
    return true
  })

  const activeTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED')
  const overdueTasks = activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date())

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive'
      case 'HIGH':
        return 'warning'
      case 'MEDIUM':
        return 'default'
      case 'LOW':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const isOverdue = (dateStr?: string) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  const handleCreateTask = () => {
    if (!newTask.title.trim()) return
    createTaskMutation.mutate({
      title: newTask.title.trim(),
      description: newTask.description.trim() || undefined,
      priority: newTask.priority,
      dueDate: newTask.dueDate || undefined,
      leadId,
    })
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{activeTasks.length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-success">{completedTasks.length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-destructive' : ''}`}>
            {overdueTasks.length}
          </p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border p-1">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'ghost'}
              onClick={() => setFilter(f)}
              className="h-8 text-xs capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowAddTask(!showAddTask)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Add Task Form */}
      {showAddTask && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Task title..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              autoFocus
            />
            <textarea
              className="w-full p-2 border rounded-md text-sm resize-none min-h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
              placeholder="Description (optional)..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <select
                  className="w-full mt-1 p-2 border rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                <Input
                  type="date"
                  className="mt-1"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddTask(false)
                  setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' })
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateTask}
                disabled={!newTask.title.trim() || createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1" />
                )}
                Create Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="text-sm font-medium mb-1">
            {tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {tasks.length === 0
              ? `Create a task for ${leadName}`
              : 'Try a different filter'}
          </p>
          {tasks.length === 0 && (
            <Button size="sm" onClick={() => setShowAddTask(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create First Task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    className="mt-0.5 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                    onClick={() => {
                      if (task.status !== 'COMPLETED') {
                        completeTaskMutation.mutate(task.id)
                      }
                    }}
                    disabled={task.status === 'COMPLETED'}
                  >
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant={getPriorityColor(task.priority) as 'default' | 'secondary' | 'destructive' | 'warning'} className="text-xs">
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <span
                          className={`text-xs flex items-center gap-1 ${
                            isOverdue(task.dueDate) && task.status !== 'COMPLETED'
                              ? 'text-red-600 font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {isOverdue(task.dueDate) && task.status !== 'COMPLETED' ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <Calendar className="h-3 w-3" />
                          )}
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignedTo.firstName} {task.assignedTo.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export { LeadTasks }
